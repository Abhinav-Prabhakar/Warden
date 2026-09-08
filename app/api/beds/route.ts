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

    // 2. Fetch active tasks
    const tasksMap: Record<string, any[]> = {};
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

    // 4. Fetch latest vitals for each patient
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
      };
    });

    return NextResponse.json({ floor: floorNumber, beds });
  } catch (err: any) {
    console.error('Beds API exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
