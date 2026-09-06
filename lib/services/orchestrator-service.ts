import { createAdminClient } from '@/lib/supabase/admin';
import { BedService } from './bed-service';
import { TaskService } from './task-service';
import { PrintService } from './print-service';
import { EventService } from './event-service';

export class OrchestratorService {
  private static adminClient = createAdminClient();

  /**
   * Multi-Step Orchestration: "Prepare Bed X for incoming patient"
   */
  static async orchestratePrepareBed(params: {
    bedId: string;
    coordinatorStaffId?: string;
  }) {
    const { data: bed, error } = await this.adminClient
      .from('beds')
      .select('*, room:rooms(*)')
      .eq('id', params.bedId)
      .single();

    if (error || !bed) {
      throw new Error(`Bed not found: ${params.bedId}`);
    }

    const stepsTaken: string[] = [];

    // Step 1: Check occupant
    if (bed.current_patient_id) {
      // Trace blockers
      const blockerTrace = await BedService.traceBedBlockers(bed.id);
      return {
        success: false,
        status: 'blocked',
        bed_number: bed.bed_number,
        message: `Cannot prepare ${bed.bed_number} because it is currently occupied. Primary blocker: ${blockerTrace.primary_blocker_reason}`,
        blockers: blockerTrace.chain,
        resolution_steps: blockerTrace.resolution_steps,
      };
    }

    // Step 2: Check cleaning state
    if (bed.status === 'cleaning') {
      const { data: activeClean } = await this.adminClient
        .from('cleaning_jobs')
        .select('*')
        .eq('bed_id', bed.id)
        .eq('status', 'in_progress')
        .single();

      if (activeClean) {
        stepsTaken.push('Terminal cleaning currently in progress.');
      } else {
        // Expedite cleaning
        await this.adminClient
          .from('cleaning_jobs')
          .update({ priority: 1, status: 'in_progress' })
          .eq('bed_id', bed.id);
        stepsTaken.push('Expedited cleaning priority to STAT.');
      }

      return {
        success: true,
        status: 'cleaning_expedited',
        bed_number: bed.bed_number,
        message: `Cleaning job expedited for ${bed.bed_number}. Will become available once sanitation is completed.`,
        steps: stepsTaken,
      };
    }

    // Step 3: Bed is ready or can be reserved
    if (bed.status === 'available') {
      await this.adminClient
        .from('beds')
        .update({ status: 'reserved' })
        .eq('id', bed.id);

      stepsTaken.push(`Marked ${bed.bed_number} as reserved for incoming admission.`);

      await EventService.logSystemEvent({
        eventType: 'bed_reserved_for_admission',
        entityType: 'bed',
        entityId: bed.id,
        metadata: { bed_number: bed.bed_number },
      });

      return {
        success: true,
        status: 'ready_and_reserved',
        bed_number: bed.bed_number,
        message: `${bed.bed_number} is verified, sanitized, and reserved for incoming admission.`,
        steps: stepsTaken,
      };
    }

    return {
      success: true,
      status: bed.status,
      bed_number: bed.bed_number,
      message: `${bed.bed_number} current status: ${bed.status}`,
      steps: stepsTaken,
    };
  }

  /**
   * Multi-Step Orchestration: "Get patient ready for discharge"
   */
  static async orchestrateDischarge(params: {
    patientId: string;
    coordinatorStaffId: string;
  }) {
    const { data: patient, error } = await this.adminClient
      .from('patients')
      .select('*, beds(*), hospital_id')
      .eq('id', params.patientId)
      .single();

    if (error || !patient) {
      throw new Error(`Patient not found: ${params.patientId}`);
    }

    const patientName = `${patient.first_name} ${patient.last_name}`;
    const bed = patient.beds?.[0];
    const stepsTaken: string[] = [];

    // 1. Submit discharge paperwork to Cloud Printer
    const printResult = await PrintService.queuePrintJob({
      hospitalId: patient.hospital_id,
      requestedBy: params.coordinatorStaffId,
      patientId: patient.id,
      documentType: 'discharge_packet',
      documentTitle: `Discharge Packet & Rx - ${patientName}`,
      priority: 1,
    });
    stepsTaken.push(`Submitted discharge packet to Cloud Printer Queue (${printResult.job.status}).`);

    // 2. Update discharge plan
    await this.adminClient
      .from('discharge_plans')
      .update({
        paperwork_complete: true,
        status: 'ready',
      })
      .eq('patient_id', patient.id);
    stepsTaken.push('Updated discharge plan status to ready.');

    // 3. Create escort transport task
    const escortTask = await TaskService.createTask({
      hospitalId: patient.hospital_id,
      patientId: patient.id,
      createdBy: params.coordinatorStaffId,
      taskType: 'transport',
      title: `Escort ${patientName} (${bed?.bed_number || 'Ward'}) to Main Entrance for Discharge`,
      priority: 2,
      urgency: 'routine',
      dueAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
    stepsTaken.push(`Created porter escort task: "${escortTask.title}".`);

    return {
      success: true,
      patient_name: patientName,
      bed_number: bed?.bed_number,
      message: `Discharge workflow initiated for ${patientName}. Paperwork queued to printer and porter transport scheduled.`,
      steps: stepsTaken,
    };
  }
}
