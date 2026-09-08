import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const floorParam = searchParams.get('floor');
    const floorNumber = floorParam ? parseInt(floorParam, 10) : 7;

    const admin = createAdminClient();

    // 1. Query beds for the specified floor
    const { data: rawBeds, error: bedErr } = await admin
      .from('beds')
      .select(`
        id,
        bed_number,
        bed_type,
        status,
        isolation_capable,
        oxygen_available,
        monitor_available,
        room:rooms!beds_room_id_fkey!inner (
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
          date_of_birth,
          sex,
          blood_type,
          admission_at,
          patient_conditions (code, name, severity),
          patient_allergies (allergen, reaction, severity)
        )
      `)
      .eq('room.floor_number', floorNumber)
      .order('bed_number', { ascending: true });

    if (bedErr) {
      console.error('Beds query error:', bedErr);
      return NextResponse.json({ error: bedErr.message }, { status: 500 });
    }

    const patientIds = (rawBeds || [])
      .map((b: any) => b.patient?.id)
      .filter(Boolean) as string[];

    const bedIds = (rawBeds || []).map((b: any) => b.id);

    // 2. Fetch active tasks and their current owner. A bed is projected from
    // several independent processes instead of collapsing them into one status.
    const tasksMap: Record<string, any[]> = {};
    const taskOwnerMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const { data: tasks } = await admin
        .from('tasks')
        .select('*')
        .in('patient_id', patientIds)
        .in('status', ['pending', 'assigned', 'acknowledged', 'in_progress', 'blocked', 'overdue']);

      (tasks || []).forEach((t: any) => {
        if (!tasksMap[t.patient_id]) tasksMap[t.patient_id] = [];
        tasksMap[t.patient_id].push(t);
      });

      const taskIds = (tasks || []).map((task: any) => task.id);
      if (taskIds.length > 0) {
        const { data: assignments } = await admin
          .from('task_assignments')
          .select('task_id, assigned_at, accepted_at, started_at, staff:staff!task_assignments_staff_id_fkey(id, first_name, last_name, role)')
          .in('task_id', taskIds)
          .is('declined_at', null)
          .order('assigned_at', { ascending: false });

        (assignments || []).forEach((assignment: any) => {
          if (!taskOwnerMap[assignment.task_id]) taskOwnerMap[assignment.task_id] = assignment;
        });
      }
    }

    // 3. Fetch active cleaning jobs
    const cleaningMap: Record<string, any> = {};
    if (bedIds.length > 0) {
      const { data: cleanings } = await admin
        .from('cleaning_jobs')
        .select('*')
        .in('bed_id', bedIds)
        .in('status', ['requested', 'assigned', 'in_progress']);

      (cleanings || []).forEach((c: any) => {
        cleaningMap[c.bed_id] = c;
      });
    }

    // 4. Fetch independent patient processes. These remain separate dimensions
    // so, for example, an occupied bed can also be discharging and awaiting transport.
    const dischargeMap: Record<string, any> = {};
    const transportMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const [{ data: discharges }, { data: transports }] = await Promise.all([
        admin
          .from('discharge_plans')
          .select('*')
          .in('patient_id', patientIds)
          .in('status', ['planning', 'ready', 'delayed'])
          .order('planned_discharge_at', { ascending: true }),
        (admin as any)
          .from('transport_tasks')
          .select('*, assigned_staff:staff!transport_tasks_assigned_staff_id_fkey(id, first_name, last_name, role)')
          .in('patient_id', patientIds)
          .in('status', ['requested', 'dispatching', 'assigned', 'accepted', 'in_progress', 'cancellation_requested'])
          .order('created_at', { ascending: false }),
      ]);

      (discharges || []).forEach((plan: any) => {
        if (!dischargeMap[plan.patient_id]) dischargeMap[plan.patient_id] = plan;
      });
      (transports || []).forEach((transport: any) => {
        if (!transportMap[transport.patient_id]) transportMap[transport.patient_id] = transport;
      });
    }

    // 5. Fetch latest vitals for each patient
    const vitalsMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const { data: vitals } = await admin
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

    // Format beds response
    const beds = (rawBeds || []).map((b: any) => {
      const pat = b.patient;
      const bedTasks = pat ? tasksMap[pat.id] || [] : [];
      const cleaning = cleaningMap[b.id];
      const vitals = pat ? vitalsMap[pat.id] : null;
      const discharge = pat ? dischargeMap[pat.id] : null;
      const transport = pat ? transportMap[pat.id] : null;
      const ownedTask = bedTasks.find((task: any) => taskOwnerMap[task.id]);
      const taskOwner = ownedTask ? taskOwnerMap[ownedTask.id]?.staff : null;
      const transportOwner = transport?.assigned_staff;
      const owner = transportOwner || taskOwner;

      const isCritical =
        pat?.acuity === 'critical' ||
        (vitals?.heart_rate && vitals.heart_rate > 110) ||
        (vitals?.spo2 && vitals.spo2 < 92);

      const hasActiveTask =
        bedTasks.length > 0 ||
        b.status === 'blocked' ||
        b.status === 'cleaning' ||
        !!cleaning;

      let color: 'red' | 'orange' | 'green' = 'green';
      if (isCritical) {
        color = 'red';
      } else if (hasActiveTask) {
        color = 'orange';
      }

      const statusText = isCritical
        ? 'DANGER / STAT'
        : cleaning || b.status === 'cleaning'
        ? 'TASK PENDING'
        : hasActiveTask
        ? 'TASK PENDING'
        : b.status === 'available'
        ? 'BED READY'
        : 'DOING WELL';

      const waitingCandidates = [
        cleaning?.requested_at,
        transport?.created_at,
        discharge?.planned_discharge_at,
        ...bedTasks.map((task: any) => task.created_at),
      ].filter(Boolean).map((value) => new Date(value).getTime()).filter(Number.isFinite);
      const waitingSince = waitingCandidates.length > 0
        ? new Date(Math.min(...waitingCandidates)).toISOString()
        : null;

      const blockedReasons = [
        b.status === 'blocked' ? 'Bed blocked' : null,
        discharge?.status === 'delayed' ? discharge.notes || 'Discharge delayed' : null,
        ...bedTasks.filter((task: any) => task.status === 'blocked' || task.status === 'overdue').map((task: any) => task.title),
      ].filter(Boolean);

      return {
        id: b.id,
        bed_number: b.bed_number,
        bed_type: b.bed_type,
        status: b.status,
        color,
        statusText,
        isCleaningJob: b.status === 'cleaning' || !!cleaning,
        isolation_capable: b.isolation_capable,
        oxygen_available: b.oxygen_available,
        monitor_available: b.monitor_available,
        room: b.room,
        patient: pat,
        vitals,
        active_tasks: bedTasks,
        cleaning_job: cleaning || null,
        operational: {
          occupancy: pat ? 'occupied' : b.status === 'reserved' ? 'reserved' : 'vacant',
          bedStatus: b.status,
          processes: {
            cleaning: cleaning ? { id: cleaning.id, status: cleaning.status, requestedAt: cleaning.requested_at } : null,
            transport: transport ? { id: transport.id, status: transport.status, requestedAt: transport.created_at } : null,
            discharge: discharge ? { id: discharge.id, status: discharge.status, plannedAt: discharge.planned_discharge_at } : null,
            reservation: b.status === 'reserved' ? { status: 'reserved' } : null,
          },
          ownership: owner ? {
            id: owner.id,
            name: `${owner.first_name || ''} ${owner.last_name || ''}`.trim(),
            role: owner.role,
          } : null,
          urgency: isCritical ? 'stat' : bedTasks.some((task: any) => ['stat', 'urgent'].includes(task.urgency)) ? 'urgent' : 'routine',
          openTaskCount: bedTasks.length,
          waitingSince,
          blockedReasons,
        },
      };
    });

    return NextResponse.json({ floor: floorNumber, beds });
  } catch (err: any) {
    console.error('Beds API exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
