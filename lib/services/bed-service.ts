import { createAdminClient } from '@/lib/supabase/admin';
import { BedStatus } from '@/types/database';
import { BedBlockerTrace, BlockerChainItem } from '@/types/warden';
import { EventService } from './event-service';

export class BedService {
  private static adminClient = createAdminClient();

  /**
   * Update Bed Operational Status
   */
  static async updateBedStatus(bedId: string, status: BedStatus, reason?: string) {
    const { data: bed, error: getErr } = await this.adminClient
      .from('beds')
      .select('*, room:rooms(ward_id)')
      .eq('id', bedId)
      .single();

    if (getErr || !bed) {
      throw new Error(`Bed not found: ${bedId}`);
    }

    const { data: updatedBed, error: updateErr } = await this.adminClient
      .from('beds')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bedId)
      .select()
      .single();

    if (updateErr || !updatedBed) {
      throw new Error(`Failed to update bed status: ${updateErr?.message}`);
    }

    // Log event
    await EventService.logSystemEvent({
      eventType: 'bed_status_changed',
      entityType: 'bed',
      entityId: bedId,
      metadata: {
        old_status: bed.status,
        new_status: status,
        bed_number: bed.bed_number,
        reason: reason || null,
      },
    });

    return updatedBed;
  }

  /**
   * Assign Patient to Bed
   */
  static async assignPatientToBed(params: {
    bedId: string;
    patientId: string;
    assignedBy?: string | null;
    reason?: string;
  }) {
    // 1. Verify bed is available or reserved
    const { data: bed, error: bedErr } = await this.adminClient
      .from('beds')
      .select('id, bed_number, status')
      .eq('id', params.bedId)
      .single();

    if (bedErr || !bed) {
      throw new Error(`Bed not found: ${params.bedId}`);
    }

    if (bed.status !== 'available' && bed.status !== 'reserved') {
      throw new Error(`Bed ${bed.bed_number} is not available (current status: ${bed.status}).`);
    }

    // 2. Insert into bed_assignments (triggers auto-update of beds.status = 'occupied')
    const { data: assignment, error: assignErr } = await this.adminClient
      .from('bed_assignments')
      .insert({
        bed_id: params.bedId,
        patient_id: params.patientId,
        assigned_by: params.assignedBy || null,
        reason: params.reason || 'Patient assigned to bed',
      })
      .select()
      .single();

    if (assignErr) {
      throw new Error(`Failed to assign bed: ${assignErr.message}`);
    }

    await EventService.logPatientEvent({
      patientId: params.patientId,
      eventType: 'bed_assigned',
      actorId: params.assignedBy || null,
      metadata: { bed_id: bed.id, bed_number: bed.bed_number },
    });

    return assignment;
  }

  /**
   * Release Bed (triggers cleaning job and sets status to 'cleaning')
   */
  static async releaseBed(params: {
    bedId: string;
    releasedBy?: string | null;
    reason?: string;
  }) {
    const { data: activeAssignment, error: findErr } = await this.adminClient
      .from('bed_assignments')
      .select('id, patient_id')
      .eq('bed_id', params.bedId)
      .is('released_at', null)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (findErr || !activeAssignment) {
      throw new Error(`No active assignment found for bed ${params.bedId}`);
    }

    // Update released_at (the Postgres trigger will set beds.status = 'cleaning' and auto-create cleaning_jobs)
    const { data: updatedAssignment, error: updateErr } = await this.adminClient
      .from('bed_assignments')
      .update({ released_at: new Date().toISOString() })
      .eq('id', activeAssignment.id)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Failed to release bed: ${updateErr.message}`);
    }

    await EventService.logPatientEvent({
      patientId: activeAssignment.patient_id,
      eventType: 'bed_released',
      actorId: params.releasedBy || null,
      metadata: { bed_id: params.bedId, reason: params.reason || null },
    });

    return updatedAssignment;
  }

  /**
   * Explain WHY a bed is blocked and trace the full operational dependency chain
   */
  static async traceBedBlockers(bedId: string): Promise<BedBlockerTrace> {
    const { data: bed, error } = await this.adminClient
      .from('beds')
      .select(`
        id,
        bed_number,
        status,
        current_patient_id,
        patient:patients!beds_current_patient_id_fkey (
          id,
          first_name,
          last_name,
          status,
          acuity
        )
      `)
      .eq('id', bedId)
      .single();

    if (error || !bed) {
      throw new Error(`Bed not found: ${bedId}`);
    }

    const chain: BlockerChainItem[] = [];
    const resolutionSteps: string[] = [];
    let primaryReason = '';

    // Check if bed is currently occupied
    if (bed.status === 'occupied' || bed.status === 'blocked') {
      if (bed.current_patient_id) {
        const patientName = `${(bed.patient as any)?.first_name} ${(bed.patient as any)?.last_name}`;

        // 1. Check discharge plan
        const { data: dischargePlan } = await this.adminClient
          .from('discharge_plans')
          .select('*')
          .eq('patient_id', bed.current_patient_id)
          .order('planned_discharge_at', { ascending: false })
          .limit(1)
          .single();

        if (dischargePlan) {
          if (!dischargePlan.medically_cleared_at) {
            chain.push({
              type: 'doctor_signoff',
              id: dischargePlan.id,
              title: `Physician discharge signoff for ${patientName}`,
              status: 'pending',
              waiting_on: 'Attending physician review & signature',
              downstream_impact: 'Prevents discharge packet generation and pharmacy dispense',
            });
            resolutionSteps.push(`Have attending physician sign off discharge for ${patientName}`);
          }

          if (!dischargePlan.medications_ready) {
            chain.push({
              type: 'paperwork',
              id: dischargePlan.id,
              title: 'Take-home medications from Pharmacy',
              status: 'pending',
              waiting_on: 'Central Pharmacy dispensing',
              downstream_impact: 'Patient cannot be discharged without medications',
            });
            resolutionSteps.push('Expedite take-home medication order at Pharmacy');
          }

          if (!dischargePlan.paperwork_complete) {
            // Check print jobs
            const { data: printJobs } = await this.adminClient
              .from('print_jobs')
              .select('id, document_title, status, printer:printers(name)')
              .eq('patient_id', bed.current_patient_id)
              .in('status', ['queued', 'processing', 'printing', 'failed']);

            if (printJobs && printJobs.length > 0) {
              printJobs.forEach((pj: any) => {
                chain.push({
                  type: 'paperwork',
                  id: pj.id,
                  title: pj.document_title,
                  status: pj.status,
                  waiting_on: `Cloud Printer: ${pj.printer?.name || 'Central Printer'}`,
                  downstream_impact: 'Discharge instructions and prescription not yet printed',
                });
              });
              resolutionSteps.push('Ensure print job completes at central ward printer');
            } else {
              chain.push({
                type: 'paperwork',
                id: dischargePlan.id,
                title: 'Discharge paperwork generation',
                status: 'pending',
                waiting_on: 'Paperwork preparation',
              });
              resolutionSteps.push('Generate and print discharge paperwork');
            }
          }

          if (!dischargePlan.transport_arranged) {
            chain.push({
              type: 'transport',
              id: dischargePlan.id,
              title: 'Discharge escort / transport to entrance',
              status: 'pending',
              waiting_on: 'Porter availability or family arrival',
            });
            resolutionSteps.push('Assign porter for patient escort');
          }
        } else {
          chain.push({
            type: 'task',
            id: bed.current_patient_id,
            title: `Patient ${patientName} currently admitted`,
            status: (bed.patient as any)?.status || 'admitted',
            waiting_on: 'Discharge order or transfer order',
          });
          resolutionSteps.push(`Evaluate patient ${patientName} for potential discharge or transfer`);
        }
      }
    }

    // Check cleaning job
    const { data: cleaningJob } = await this.adminClient
      .from('cleaning_jobs')
      .select('id, status, assigned_to, staff:staff!cleaning_jobs_assigned_to_fkey(display_name)')
      .eq('bed_id', bedId)
      .in('status', ['requested', 'assigned', 'in_progress'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    if (cleaningJob) {
      chain.push({
        type: 'cleaning',
        id: cleaningJob.id,
        title: `Terminal sanitation for ${bed.bed_number}`,
        status: cleaningJob.status || "requested",
        assigned_to: (cleaningJob.staff as any)?.display_name || 'Unassigned',
        waiting_on: 'Housekeeping crew completion',
        downstream_impact: 'Bed cannot be marked ready for new admission until sanitized',
      });
      resolutionSteps.push(`Complete terminal cleaning for ${bed.bed_number}`);
    }

    if (chain.length > 0) {
      primaryReason = chain[0].title + ' is unresolved';
    } else if (bed.status === 'blocked') {
      primaryReason = 'Bed marked as blocked by ward coordinator';
      resolutionSteps.push(`Inspect physical bed ${bed.bed_number} and mark available`);
    } else if (bed.status === 'cleaning') {
      primaryReason = 'Terminal cleaning is currently required';
      resolutionSteps.push(`Complete housekeeping sanitation for ${bed.bed_number}`);
    }

    return {
      bed_id: bed.id,
      bed_number: bed.bed_number,
      is_blocked: bed.status === 'blocked' || chain.length > 0,
      primary_blocker_reason: primaryReason || 'No blockers identified',
      chain,
      resolution_steps: resolutionSteps,
    };
  }
}
