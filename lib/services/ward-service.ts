import { createAdminClient } from '@/lib/supabase/admin';
import { WardLiveState, WardBedDetail, TemporalChangeSummary } from '@/types/warden';

export class WardService {
  private static adminClient = createAdminClient();

  /**
   * Central Ward Operational Model
   * Single authoritative source of truth for current ward state
   */
  static async getWardLiveState(wardId?: string): Promise<WardLiveState> {
    // 1. Fetch Hospital & Ward details
    const { data: ward, error: wardErr } = await this.adminClient
      .from('wards')
      .select('*, hospital:hospitals(*)')
      .limit(1)
      .single();

    if (wardErr || !ward) {
      throw new Error(`Ward not found: ${wardErr?.message}`);
    }

    const hospital = ward.hospital as any;

    // 2. Fetch Beds with Rooms, Current Patients, Vitals, Conditions, Allergies
    const { data: rawBeds, error: bedErr } = await this.adminClient
      .from('beds')
      .select(`
        id,
        bed_number,
        bed_type,
        status,
        isolation_capable,
        oxygen_available,
        monitor_available,
        room:rooms!beds_room_id_fkey (
          id,
          room_number,
          floor_number,
          ward_id
        ),
        patient:patients!beds_current_patient_id_fkey (
          id,
          medical_record_number,
          first_name,
          last_name,
          acuity,
          status,
          admission_at,
          discharge_at,
          patient_conditions (code, name, severity),
          patient_allergies (allergen, reaction, severity)
        )
      `)
      .eq('room.ward_id', ward.id)
      .order('bed_number', { ascending: true });

    if (bedErr) throw bedErr;

    // 3. Fetch Active Tasks for Ward
    const { data: activeTasks } = await this.adminClient
      .from('tasks')
      .select(`
        id,
        patient_id,
        task_type,
        title,
        priority,
        urgency,
        status,
        due_at,
        task_assignments (
          staff:staff (display_name),
          completed_at
        )
      `)
      .eq('hospital_id', hospital.id)
      .in('status', ['pending', 'assigned', 'acknowledged', 'in_progress', 'blocked', 'overdue']);

    // 4. Fetch Active Cleaning Jobs
    const { data: cleaningJobs } = await this.adminClient
      .from('cleaning_jobs')
      .select('id, bed_id, status, started_at')
      .in('status', ['requested', 'assigned', 'in_progress']);

    // 5. Fetch Latest Vitals for each patient
    const patientIds = (rawBeds || [])
      .map((b: any) => b.patient?.id)
      .filter(Boolean) as string[];

    let vitalsMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const { data: vitals } = await this.adminClient
        .from('vitals')
        .select('*')
        .in('patient_id', patientIds)
        .order('recorded_at', { ascending: false });

      (vitals || []).forEach((v: any) => {
        if (!vitalsMap[v.patient_id]) {
          vitalsMap[v.patient_id] = v;
        }
      });
    }

    // 6. Fetch Discharge Plans for Patients
    let dischargeMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const { data: discharges } = await this.adminClient
        .from('discharge_plans')
        .select('patient_id, status')
        .in('patient_id', patientIds);

      (discharges || []).forEach((d: any) => {
        dischargeMap[d.patient_id] = d.status;
      });
    }

    // Transform Beds
    const beds: WardBedDetail[] = (rawBeds || []).map((b: any) => {
      const room = b.room;
      const pat = b.patient;
      const bedTasks = (activeTasks || []).filter((t: any) => t.patient_id === pat?.id);
      const cleaning = (cleaningJobs || []).find((c: any) => c.bed_id === b.id);

      return {
        id: b.id,
        bed_number: b.bed_number,
        bed_type: b.bed_type,
        status: b.status,
        room_id: room?.id,
        room_number: room?.room_number,
        floor_number: room?.floor_number,
        isolation_capable: b.isolation_capable,
        oxygen_available: b.oxygen_available,
        monitor_available: b.monitor_available,
        patient: pat
          ? {
              id: pat.id,
              mrn: pat.medical_record_number,
              first_name: pat.first_name,
              last_name: pat.last_name,
              acuity: pat.acuity,
              status: pat.status,
              admission_at: pat.admission_at,
              discharge_at: pat.discharge_at,
              latest_vitals: vitalsMap[pat.id]
                ? {
                    heart_rate: vitalsMap[pat.id].heart_rate,
                    respiratory_rate: vitalsMap[pat.id].respiratory_rate,
                    spo2: vitalsMap[pat.id].spo2,
                    temperature: vitalsMap[pat.id].temperature,
                    systolic_bp: vitalsMap[pat.id].systolic_bp,
                    diastolic_bp: vitalsMap[pat.id].diastolic_bp,
                    pain_score: vitalsMap[pat.id].pain_score,
                    recorded_at: vitalsMap[pat.id].recorded_at,
                  }
                : null,
              conditions: pat.patient_conditions || [],
              allergies: pat.patient_allergies || [],
              pending_tasks: bedTasks.filter((t: any) => t.status !== 'completed').length,
              overdue_tasks: bedTasks.filter(
                (t: any) =>
                  t.status === 'overdue' ||
                  (t.due_at && new Date(t.due_at) < new Date() && t.status !== 'completed')
              ).length,
              pending_medications: 0,
              discharge_status: dischargeMap[pat.id] || null,
            }
          : null,
        active_tasks: bedTasks.map((t: any) => {
          const activeAssignee = t.task_assignments?.find((a: any) => !a.completed_at);
          return {
            id: t.id,
            title: t.title,
            task_type: t.task_type,
            priority: t.priority,
            urgency: t.urgency,
            status: t.status,
            due_at: t.due_at,
            assigned_to: activeAssignee?.staff?.display_name || null,
          };
        }),
        cleaning_job: cleaning
          ? {
              id: cleaning.id,
              status: cleaning.status || "requested",
              started_at: cleaning.started_at,
            }
          : null,
      };
    });

    // 7. On-Duty Staff
    const { data: staffMembers } = await this.adminClient
      .from('staff')
      .select(`
        id,
        display_name,
        role,
        status,
        phone,
        staff_current_locations (
          navigation_nodes (name)
        )
      `)
      .eq('hospital_id', hospital.id)
      .eq('is_on_duty', true);

    const staffOnDuty = (staffMembers || []).map((s: any) => ({
      id: s.id,
      display_name: s.display_name,
      role: s.role,
      status: s.status,
      phone: s.phone,
      active_tasks_count: (activeTasks || []).filter((t: any) =>
        t.task_assignments?.some((a: any) => a.staff?.display_name === s.display_name && !a.completed_at)
      ).length,
      location_name: s.staff_current_locations?.[0]?.navigation_nodes?.name || null,
    }));

    // 8. Active Alerts
    const { data: alerts } = await this.adminClient
      .from('system_alerts')
      .select('*')
      .eq('hospital_id', hospital.id)
      .is('resolved_at', null)
      .order('triggered_at', { ascending: false });

    // 9. Active Print Jobs
    const { count: printCount } = await this.adminClient
      .from('print_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['queued', 'processing', 'printing']);

    // Aggregate metrics
    const metrics = {
      total_beds: beds.length,
      occupied_beds: beds.filter((b) => b.status === 'occupied').length,
      available_beds: beds.filter((b) => b.status === 'available').length,
      blocked_beds: beds.filter((b) => b.status === 'blocked').length,
      cleaning_beds: beds.filter((b) => b.status === 'cleaning').length,
      reserved_beds: beds.filter((b) => b.status === 'reserved').length,
      urgent_patients: beds.filter((b) => b.patient?.acuity === 'urgent').length,
      critical_patients: beds.filter((b) => b.patient?.acuity === 'critical').length,
      active_tasks: (activeTasks || []).length,
      overdue_tasks: (activeTasks || []).filter(
        (t: any) =>
          t.status === 'overdue' ||
          (t.due_at && new Date(t.due_at) < new Date() && t.status !== 'completed')
      ).length,
      on_duty_staff: staffOnDuty.length,
      active_alerts: (alerts || []).length,
      active_print_jobs: printCount || 0,
    };

    return {
      timestamp: new Date().toISOString(),
      hospital: {
        id: hospital.id,
        name: hospital.name,
        code: hospital.code,
        timezone: hospital.timezone,
      },
      ward: {
        id: ward.id,
        name: ward.name,
        code: ward.code,
        capacity: ward.capacity || 0,
      },
      metrics,
      beds,
      staff_on_duty: staffOnDuty,
      active_alerts: (alerts || []).map((a: any) => ({
        id: a.id,
        alert_type: a.alert_type,
        severity: a.severity,
        title: a.title,
        description: a.description,
        patient_id: a.patient_id,
        triggered_at: a.triggered_at,
      })),
    };
  }

  /**
   * "What Changed?" Temporal Query Engine
   * Evaluates operational events since a specific timestamp
   */
  static async getWhatChanged(sinceTimestamp: string): Promise<TemporalChangeSummary> {
    const sinceDate = new Date(sinceTimestamp).toISOString();

    // 1. Patient events (vitals, deteriorations, notifications)
    const { data: patientEvents } = await this.adminClient
      .from('patient_events')
      .select(`
        *,
        patient:patients (
          first_name,
          last_name,
          beds (bed_number)
        )
      `)
      .gte('timestamp', sinceDate)
      .order('timestamp', { ascending: false });

    // 2. System events (printer offline, bed cleaned, inventory low)
    const { data: systemEvents } = await this.adminClient
      .from('system_events')
      .select('*')
      .gte('timestamp', sinceDate)
      .order('timestamp', { ascending: false });

    // 3. Newly created or completed tasks
    const { data: taskEvents } = await this.adminClient
      .from('task_events')
      .select(`
        *,
        task:tasks (
          id,
          title,
          urgency,
          patient:patients (
            beds (bed_number)
          )
        ),
        staff:staff (display_name)
      `)
      .gte('created_at', sinceDate)
      .order('created_at', { ascending: false });

    // 4. System alerts
    const { data: alerts } = await this.adminClient
      .from('system_alerts')
      .select('*')
      .gte('triggered_at', sinceDate);

    // Structure categorised changes
    const deteriorations: Array<{ patient: string; bed: string; detail: string; timestamp: string }> = [];
    (patientEvents || []).forEach((pe: any) => {
      if (pe.severity === 'critical' || pe.event_type === 'vital_recorded') {
        const meta = pe.metadata || {};
        if (meta.hr && meta.hr > 110) {
          deteriorations.push({
            patient: `${pe.patient?.first_name} ${pe.patient?.last_name}`,
            bed: pe.patient?.beds?.[0]?.bed_number || 'Unknown',
            detail: `Vitals deteriorated: HR ${meta.hr} bpm, SpO2 ${meta.spo2}%`,
            timestamp: pe.timestamp,
          });
        }
      }
    });

    const newUrgentTasks = (taskEvents || [])
      .filter((te: any) => te.event_type === 'created' && (te.task?.urgency === 'stat' || te.task?.urgency === 'urgent'))
      .map((te: any) => ({
        id: te.task?.id,
        title: te.task?.title,
        bed: te.task?.patient?.beds?.[0]?.bed_number || 'Ward',
        urgency: te.task?.urgency,
      }));

    const taskCompletions = (taskEvents || [])
      .filter((te: any) => te.event_type === 'completed')
      .map((te: any) => ({
        id: te.task?.id,
        title: te.task?.title,
        completed_by: te.staff?.display_name || 'Staff member',
        timestamp: te.created_at,
      }));

    const bedTransitions = (systemEvents || [])
      .filter((se: any) => se.event_type === 'bed_status_changed' || se.event_type === 'bed_cleaned')
      .map((se: any) => ({
        bed: se.metadata?.bed_number || `Bed ${se.entity_id.slice(0, 4)}`,
        from: se.metadata?.old_status || 'previous',
        to: se.metadata?.new_status || 'available',
        reason: se.metadata?.reason,
      }));

    const hasCritical = deteriorations.length > 0 || (alerts || []).some((a: any) => a.severity === 'critical');

    // Build human-friendly concise spoken summary
    let summaryParts: string[] = [];
    if (deteriorations.length > 0) {
      summaryParts.push(
        `${deteriorations[0].patient} in ${deteriorations[0].bed} has deteriorated with ${deteriorations[0].detail}.`
      );
    }
    if (newUrgentTasks.length > 0) {
      summaryParts.push(`${newUrgentTasks.length} urgent task(s) added, including "${newUrgentTasks[0].title}".`);
    }
    if (bedTransitions.length > 0) {
      summaryParts.push(`${bedTransitions[0].bed} transitioned to ${bedTransitions[0].to}.`);
    }
    if (summaryParts.length === 0) {
      summaryParts.push('No critical operational changes recorded since your selected time.');
    }

    return {
      since: sinceDate,
      evaluated_at: new Date().toISOString(),
      has_critical_changes: hasCritical,
      summary_text: summaryParts.join(' '),
      changes: {
        deteriorations,
        new_urgent_tasks: newUrgentTasks,
        task_completions: taskCompletions,
        bed_transitions: bedTransitions,
        staff_status_changes: [],
        system_alerts: (alerts || []).map((a: any) => ({
          title: a.title,
          severity: a.severity,
          timestamp: a.triggered_at,
        })),
        printer_status_changes: [],
      },
    };
  }

  /**
   * Complete Bed-Level Drilldown
   */
  static async getBedDrilldown(bedId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bedId);
    let query = this.adminClient
      .from('beds')
      .select(`
        *,
        room:rooms (
          id,
          room_number,
          floor_number,
          ward:wards (id, name)
        ),
        patient:patients (
          id,
          medical_record_number,
          first_name,
          last_name,
          date_of_birth,
          sex,
          blood_type,
          admission_at,
          acuity,
          status,
          patient_conditions (*),
          patient_allergies (*),
          patient_preferences (*),
          patient_contacts (
            priority,
            relationship,
            contact:contacts (*)
          )
        )
      `);

    if (isUuid) {
      query = query.eq('id', bedId);
    } else {
      // Allow searching by "Bed 1", "bed-top-1", etc.
      const normalizedName = bedId.replace(/^bed-(?:top|b\d+(?:-[a-z]+)?)-?/i, '').replace(/^bed-/i, 'Bed ');
      const cleanNum = bedId.match(/\d+/)?.[0];
      const targetName = cleanNum ? `Bed ${cleanNum}` : bedId;
      query = query.or(`bed_number.eq.${bedId},bed_number.eq.${targetName}`);
    }

    const { data: bed, error } = await query.limit(1).maybeSingle();

    if (error || !bed) {
      throw new Error(`Bed not found: ${bedId}`);
    }

    // Get recent vitals
    let vitals: any[] = [];
    let activeTasks: any[] = [];
    let recentEvents: any[] = [];
    let dischargePlan: any = null;
    let medications: any[] = [];

    if (bed.current_patient_id) {
      const { data: vitalsData } = await this.adminClient
        .from('vitals')
        .select('*')
        .eq('patient_id', bed.current_patient_id)
        .order('recorded_at', { ascending: false })
        .limit(10);
      vitals = vitalsData || [];

      const { data: tasksData } = await this.adminClient
        .from('tasks')
        .select(`
          *,
          task_assignments (
            staff:staff (display_name, role)
          )
        `)
        .eq('patient_id', bed.current_patient_id)
        .order('created_at', { ascending: false });
      activeTasks = tasksData || [];

      const { data: eventsData } = await this.adminClient
        .from('patient_events')
        .select('*')
        .eq('patient_id', bed.current_patient_id)
        .order('timestamp', { ascending: false })
        .limit(15);
      recentEvents = eventsData || [];

      const { data: dp } = await this.adminClient
        .from('discharge_plans')
        .select('*')
        .eq('patient_id', bed.current_patient_id)
        .order('planned_discharge_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      dischargePlan = dp;

      const { data: medsData } = await this.adminClient
        .from('patient_medications')
        .select(`
          *,
          medication:medications (*),
          medication_administrations (*)
        `)
        .eq('patient_id', bed.current_patient_id);
      medications = medsData || [];
    }

    const { data: cleaningJob } = await this.adminClient
      .from('cleaning_jobs')
      .select('*')
      .eq('bed_id', bed.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      bed,
      vitals,
      tasks: activeTasks,
      timeline: recentEvents,
      discharge_plan: dischargePlan,
      medications,
      cleaning_job: cleaningJob,
    };
  }
}
