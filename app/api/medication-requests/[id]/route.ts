import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const NEXT = ['preparing', 'ready', 'delivered', 'cancelled'];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!NEXT.includes(body.status)) return NextResponse.json({ error: 'Invalid medication request status' }, { status: 400 });
    const admin = createAdminClient() as any;
    const { data, error } = await admin.rpc('transition_medication_request', {
      p_request_id: id, p_to: body.status, p_actor_id: body.actorId || null,
    });
    if (error) throw error;
    return NextResponse.json({ request: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update medication request' }, { status: 500 });
  }
}
