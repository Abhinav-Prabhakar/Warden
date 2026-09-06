import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: beds, error } = await admin
      .from('beds')
      .select(`
        *,
        room:rooms (room_number, floor_number),
        patient:patients (id, first_name, last_name, acuity, status)
      `)
      .order('bed_number', { ascending: true });

    if (error) throw error;
    return NextResponse.json(beds);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
