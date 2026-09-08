import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, bedId, medicationId, medicationName, dropLocation, requestedBy } = body;

    const admin = createAdminClient();

    // 1. Resolve staff requester ID
    let actorId = requestedBy;
    if (!actorId) {
      const { data: staff } = await admin.from('staff').select('id').limit(1).maybeSingle();
      actorId = staff?.id;
    }

    // 2. Resolve medication ID if not directly provided
    let medId = medicationId;
    if (!medId && medicationName) {
      const { data: med } = await admin
        .from('medications')
        .select('id, name')
        .ilike('name', `%${medicationName}%`)
        .limit(1)
        .maybeSingle();
      medId = med?.id;
    }

    // 3. Resolve bed ID if bed is provided by name or object
    let targetBedId = bedId;
    let targetPatientId = patientId;

    if (!targetBedId && dropLocation) {
      // e.g. "Bed 3 (Floor 7)" or "Bed 3"
      const match = dropLocation.match(/Bed\s+(\d+)/i);
      if (match) {
        const bedNum = match[1];
        const { data: bedRecord } = await admin
          .from('beds')
          .select('id, current_patient_id')
          .eq('bed_number', bedNum)
          .limit(1)
          .maybeSingle();
        if (bedRecord) {
          targetBedId = bedRecord.id;
          if (!targetPatientId && bedRecord.current_patient_id) {
            targetPatientId = bedRecord.current_patient_id;
          }
        }
      }
    }

    // If we have patientId, bedId, medId, and actorId, invoke create_medication_request RPC
    if (targetPatientId && targetBedId && medId && actorId) {
      const { data: rpcData, error: rpcErr } = await (admin as any).rpc('create_medication_request', {
        p_patient_id: targetPatientId,
        p_bed_id: targetBedId,
        p_medication_id: medId,
        p_requested_by: actorId,
      });

      if (!rpcErr) {
        return NextResponse.json({
          success: true,
          method: 'rpc',
          request: rpcData,
          dropLocation: dropLocation || 'Assigned Bed',
          message: `Medication ordered to ${dropLocation || 'bed'} successfully`,
        });
      }
      console.warn('RPC create_medication_request error, falling back to task dispatch:', rpcErr);
    }

    // Fallback: Dispatch task to pharmacy / transport
    const { data: hospital } = await admin.from('hospitals').select('id').limit(1).maybeSingle();
    const title = `Deliver ${medicationName || 'Medication'} to ${dropLocation || 'Bed'}`;

    const { data: task, error: taskErr } = await (admin as any)
      .from('tasks')
      .insert({
        hospital_id: hospital?.id || '00000000-0000-0000-0000-000000000001',
        patient_id: targetPatientId || null,
        created_by: actorId || null,
        task_type: 'medication',
        title,
        priority: 2,
        urgency: 'urgent',
        status: 'pending',
        source: 'ui',
      })
      .select()
      .single();

    if (taskErr) throw taskErr;

    return NextResponse.json({
      success: true,
      method: 'task',
      task,
      dropLocation: dropLocation || 'Assigned Bed',
      message: `Medication order dispatched for ${dropLocation || 'bed'}`,
    });
  } catch (err: any) {
    console.error('Failed to order medication:', err);
    return NextResponse.json({ error: err.message || 'Failed to order medication' }, { status: 500 });
  }
}
