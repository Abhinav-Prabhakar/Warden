import { createAdminClient } from '@/lib/supabase/admin';
import { BottleneckItem, SelfInvalidationCheck, ShiftHandoffData } from '@/types/warden';

export class IntelligenceService {
  private static adminClient = createAdminClient();

  /**
   * Self-Invalidating Response Evaluator
   * Rule 1: The current ward state beats the state from five seconds ago.
   * Rule 2: Never confidently answer using information you know may be stale.
   */
  static async evaluateSelfInvalidation(params: {
    queryStartTime: string;
    entityChecks: Array<{
      entityType: 'staff' | 'bed' | 'patient' | 'printer' | 'task';
      entityId: string;
      expectedState: Record<string, unknown>;
    }>;
  }): Promise<SelfInvalidationCheck> {
    const currentState: Record<string, unknown> = {};
    const stateAtQuery: Record<string, unknown> = {};

    for (const check of params.entityChecks) {
      if (check.entityType === 'staff') {
        const { data: staff } = await this.adminClient
          .from('staff')
          .select('id, display_name, status, is_on_duty')
          .eq('id', check.entityId)
          .single();

        if (staff) {
          currentState[`staff_${check.entityId}`] = staff;
          stateAtQuery[`staff_${check.entityId}`] = check.expectedState;

          // Check if status mutated
          if (check.expectedState.status && check.expectedState.status !== staff.status) {
            return {
              is_stale: true,
              reason: `${staff.display_name}'s status changed from ${check.expectedState.status} to ${staff.status}.`,
              state_at_query: stateAtQuery,
              state_current: currentState,
              correction: `Hold on—${staff.display_name} is no longer ${check.expectedState.status}; their status is now ${staff.status}.`,
            };
          }
        }
      } else if (check.entityType === 'bed') {
        const { data: bed } = await this.adminClient
          .from('beds')
          .select('id, bed_number, status')
          .eq('id', check.entityId)
          .single();

        if (bed) {
          currentState[`bed_${check.entityId}`] = bed;
          stateAtQuery[`bed_${check.entityId}`] = check.expectedState;

          if (check.expectedState.status && check.expectedState.status !== bed.status) {
            return {
              is_stale: true,
              reason: `${bed.bed_number} changed status from ${check.expectedState.status} to ${bed.status}.`,
              state_at_query: stateAtQuery,
              state_current: currentState,
              correction: `Notice: ${bed.bed_number} is no longer ${check.expectedState.status}; it is now ${bed.status}.`,
            };
          }
        }
      } else if (check.entityType === 'patient') {
        const { data: patient } = await this.adminClient
          .from('patients')
          .select('id, acuity, status')
          .eq('id', check.entityId)
          .single();

        if (patient) {
          currentState[`patient_${check.entityId}`] = patient;
          stateAtQuery[`patient_${check.entityId}`] = check.expectedState;

          if (check.expectedState.acuity && check.expectedState.acuity !== patient.acuity) {
            return {
              is_stale: true,
              reason: `Patient acuity changed from ${check.expectedState.acuity} to ${patient.acuity}.`,
              state_at_query: stateAtQuery,
              state_current: currentState,
              correction: `Update: Patient condition has changed to ${patient.acuity}.`,
            };
          }
        }
      }
    }

    return {
      is_stale: false,
      state_at_query: stateAtQuery,
      state_current: currentState,
    };
  }

  /**
   * Predictive Bottleneck Detection
   */
  static async detectBottlenecks(hospitalId?: string): Promise<BottleneckItem[]> {
    const bottlenecks: BottleneckItem[] = [];

    // 1. Printer Queue Bottleneck
    const { data: queuedPrints } = await this.adminClient
      .from('print_jobs')
      .select('id, printer:printers(id, name, status), document_title')
      .in('status', ['queued', 'processing', 'printing']);

    if (queuedPrints && queuedPrints.length >= 2) {
      bottlenecks.push({
        area: 'printer',
        severity: queuedPrints.length >= 4 ? 'high' : 'medium',
        title: 'Cloud Printer Queue Backlog',
        cause: `${queuedPrints.length} document print jobs are waiting in the queue.`,
        affected_entities: queuedPrints.map((p: any) => p.document_title),
        recommended_action: 'Check ward printer paper tray or redirect print jobs to alternate departmental printer.',
      });
    }

    // 2. Bed Capacity Bottleneck
    const { data: beds } = await this.adminClient
      .from('beds')
      .select('id, bed_number, status');

    const availableBeds = (beds || []).filter((b) => b.status === 'available');
    const blockedBeds = (beds || []).filter((b) => b.status === 'blocked');

    if (availableBeds.length <= 2 && blockedBeds.length > 0) {
      bottlenecks.push({
        area: 'beds',
        severity: availableBeds.length === 0 ? 'critical' : 'high',
        title: 'Critical Bed Capacity Shortage',
        cause: `Only ${availableBeds.length} bed(s) available while ${blockedBeds.length} bed(s) are blocked by pending dependencies.`,
        affected_entities: blockedBeds.map((b) => b.bed_number),
        recommended_action: 'Resolve discharge blockers and expedited terminal cleaning for blocked beds.',
      });
    }

    // 3. Inventory Consumables Bottleneck
    const { data: lowInventory } = await this.adminClient
      .from('inventory_items')
      .select('id, name, quantity_on_hand, reorder_threshold');

    const criticalItems = (lowInventory || []).filter(
      (item) => Number(item.quantity_on_hand) <= Number(item.reorder_threshold)
    );

    if (criticalItems.length > 0) {
      bottlenecks.push({
        area: 'inventory',
        severity: 'medium',
        title: 'Low Clinical Consumables',
        cause: `${criticalItems.map((i) => i.name).join(', ')} is below minimum reorder threshold.`,
        affected_entities: criticalItems.map((i) => i.name),
        recommended_action: 'Initiate automated replenishment request from central stores.',
      });
    }

    return bottlenecks;
  }

  /**
   * Contradiction Detection Engine
   */
  static async detectContradictions() {
    const contradictions: Array<{ type: string; description: string; entities: string[] }> = [];

    // 1. Bed marked available but has current_patient_id
    const { data: conflictedBeds } = await this.adminClient
      .from('beds')
      .select('id, bed_number, status, current_patient_id')
      .eq('status', 'available')
      .not('current_patient_id', 'is', null);

    (conflictedBeds || []).forEach((b) => {
      contradictions.push({
        type: 'bed_state_conflict',
        description: `${b.bed_number} is marked as "available" but still assigned patient ID ${b.current_patient_id}.`,
        entities: [b.bed_number],
      });
    });

    // 2. Discharged patient still assigned to an occupied bed
    const { data: dischargedInBed } = await this.adminClient
      .from('beds')
      .select(`
        bed_number,
        patient:patients!beds_current_patient_id_fkey(first_name, last_name, status)
      `)
      .eq('status', 'occupied')
      .eq('patient.status', 'discharged');

    (dischargedInBed || []).forEach((b: any) => {
      contradictions.push({
        type: 'patient_status_conflict',
        description: `Patient ${b.patient?.first_name} ${b.patient?.last_name} is marked "discharged" but still occupying ${b.bed_number}.`,
        entities: [b.bed_number],
      });
    });

    return contradictions;
  }

  /**
   * "What Should I Do Next?" Prioritized Operational Guidance
   */
  static async getPrioritizedNextActions(staffId?: string) {
    const actions: Array<{
      priority: number;
      urgency: string;
      title: string;
      target: string;
      reason: string;
      recommended_action: string;
      task_id?: string;
    }> = [];

    // 1. STAT / Urgent Tasks
    const { data: urgentTasks } = await this.adminClient
      .from('tasks')
      .select(`
        id,
        title,
        priority,
        urgency,
        due_at,
        patient:patients (first_name, last_name, beds (bed_number))
      `)
      .in('urgency', ['stat', 'urgent'])
      .in('status', ['pending', 'assigned', 'acknowledged'])
      .order('priority', { ascending: true });

    (urgentTasks || []).forEach((t: any) => {
      const bedNum = t.patient?.beds?.[0]?.bed_number || 'Ward';
      actions.push({
        priority: t.urgency === 'stat' ? 1 : 2,
        urgency: t.urgency,
        title: t.title,
        target: bedNum,
        reason: `Urgent clinical requirement for ${t.patient?.first_name || 'patient'}.`,
        recommended_action: `Execute or coordinate "${t.title}".`,
        task_id: t.id,
      });
    });

    // 2. Overdue Tasks
    const { data: overdueTasks } = await this.adminClient
      .from('tasks')
      .select('id, title, due_at, patient:patients (beds (bed_number))')
      .lt('due_at', new Date().toISOString())
      .in('status', ['pending', 'assigned', 'acknowledged', 'in_progress'])
      .limit(3);

    (overdueTasks || []).forEach((t: any) => {
      actions.push({
        priority: 2,
        urgency: 'urgent',
        title: `Overdue: ${t.title}`,
        target: t.patient?.beds?.[0]?.bed_number || 'Ward',
        reason: 'Task missed scheduled due time.',
        recommended_action: 'Acknowledge and complete immediately or reassign.',
        task_id: t.id,
      });
    });

    // 3. Bed Blockers on High-Value Beds
    const { data: blockedBeds } = await this.adminClient
      .from('beds')
      .select('id, bed_number')
      .eq('status', 'blocked')
      .limit(2);

    (blockedBeds || []).forEach((b) => {
      actions.push({
        priority: 3,
        urgency: 'routine',
        title: `Resolve Blockers on ${b.bed_number}`,
        target: b.bed_number,
        reason: `${b.bed_number} is needed for incoming admissions.`,
        recommended_action: `Trace and resolve paperwork/cleaning dependency chain for ${b.bed_number}.`,
      });
    });

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Automated Shift Handoff Generator
   */
  static async generateShiftHandoff(): Promise<ShiftHandoffData> {
    // 1. Critical Watch List (deteriorating / high acuity patients)
    const { data: criticalPatients } = await this.adminClient
      .from('patients')
      .select(`
        id,
        first_name,
        last_name,
        acuity,
        beds (bed_number),
        patient_conditions (name),
        vitals (heart_rate, spo2, systolic_bp, diastolic_bp, pain_score, recorded_at)
      `)
      .in('acuity', ['urgent', 'critical', 'needs_attention'])
      .eq('status', 'admitted');

    const watchList = (criticalPatients || []).map((p: any) => {
      const latestVital = p.vitals?.[0];
      return {
        patient_name: `${p.first_name} ${p.last_name}`,
        bed: p.beds?.[0]?.bed_number || 'Unassigned',
        acuity: p.acuity,
        key_concerns: p.patient_conditions?.map((c: any) => c.name).join(', ') || 'Clinical monitoring',
        vitals_summary: latestVital
          ? `HR ${latestVital.heart_rate}, SpO2 ${latestVital.spo2}%, BP ${latestVital.systolic_bp}/${latestVital.diastolic_bp}`
          : 'Pending updated vitals',
      };
    });

    // 2. Outstanding & Overdue Tasks
    const { data: outstandingTasks } = await this.adminClient
      .from('tasks')
      .select(`
        id,
        title,
        due_at,
        patient:patients (beds (bed_number)),
        task_assignments (staff (display_name), completed_at)
      `)
      .in('status', ['pending', 'assigned', 'in_progress', 'overdue', 'blocked']);

    const taskList = (outstandingTasks || []).map((t: any) => {
      const activeAssignee = t.task_assignments?.find((a: any) => !a.completed_at);
      const isOverdue = t.due_at && new Date(t.due_at) < new Date();
      return {
        title: t.title,
        bed: t.patient?.beds?.[0]?.bed_number || 'Ward',
        assigned_to: activeAssignee?.staff?.display_name || 'Unassigned',
        due_at: t.due_at,
        is_overdue: Boolean(isOverdue),
      };
    });

    // 3. Pending Discharges
    const { data: discharges } = await this.adminClient
      .from('discharge_plans')
      .select(`
        status,
        notes,
        patient:patients (
          first_name,
          last_name,
          beds (bed_number)
        )
      `)
      .in('status', ['planning', 'ready', 'delayed']);

    const dischargeList = (discharges || []).map((d: any) => ({
      patient_name: `${d.patient?.first_name} ${d.patient?.last_name}`,
      bed: d.patient?.beds?.[0]?.bed_number || 'Ward',
      status: d.status,
      remaining_blockers: d.notes ? [d.notes] : ['Pending final paperwork / transport'],
    }));

    // 4. Blocked Beds
    const { data: blockedBeds } = await this.adminClient
      .from('beds')
      .select('bed_number, status')
      .in('status', ['blocked', 'cleaning']);

    const blockedList = (blockedBeds || []).map((b) => ({
      bed: b.bed_number,
      blocker_reason: b.status === 'cleaning' ? 'Terminal cleaning in progress' : 'Awaiting discharge chain completion',
    }));

    return {
      generated_at: new Date().toISOString(),
      shift_period: 'Night Shift (20:00 - 08:00)',
      coordinator: 'Sunita Rao (Night Coordinator)',
      ward: 'Ward 4B - Acute Adult Care',
      critical_watch_list: watchList,
      outstanding_tasks: taskList,
      pending_discharges: dischargeList,
      blocked_beds_and_reasons: blockedList,
      resource_and_equipment_issues: [
        'Ward 4B Medium Nitrile Gloves stock low (3 boxes remaining - restock requested)',
        'Portable Oxygen Cylinder O2-CYL-401 available at Station, O2-CYL-402 in use in Room 402',
      ],
      printer_and_facility_status: [
        'Central Ward Printer online with discharge summary queue active',
        'Service Elevator Bank 4 operational',
      ],
    };
  }
}
