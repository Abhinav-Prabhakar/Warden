import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const patientId = new URL(request.url).searchParams.get('patientId');
    if (!patientId) return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    const admin = createAdminClient() as any;
    const { data, error } = await admin.from('medication_requests')
      .select('*, medication:medications(id,name,strength,form)')
      .eq('patient_id', patientId).order('requested_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ requests: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load medication requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.patientId || !body.bedId || !body.medicationId) {
      return NextResponse.json({ error: 'patientId, bedId and medicationId are required' }, { status: 400 });
    }
    const admin = createAdminClient() as any;
    const { data: requester, error: requesterError } = await admin.from('staff').select('id')
      .eq('is_on_duty', true).in('role', ['nurse', 'warden']).limit(1).maybeSingle();
    if (requesterError) throw requesterError;
    if (!requester) return NextResponse.json({ error: 'No on-duty nurse or warden is available to own this request' }, { status: 409 });
    const { data, error } = await admin.rpc('create_medication_request', {
      p_patient_id: body.patientId, p_bed_id: body.bedId,
      p_medication_id: body.medicationId, p_requested_by: requester.id,
    });
    if (error) throw error;
    return NextResponse.json({ request: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to request medication' }, { status: 500 });
  }
}
