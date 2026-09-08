import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');
    const onDutyFilter = searchParams.get('on_duty');

    const admin = createAdminClient();
    let query = admin
      .from('staff')
      .select(`
        id,
        employee_number,
        first_name,
        last_name,
        display_name,
        role,
        phone,
        email,
        status,
        is_on_duty,
        department:departments (
          id,
          name,
          code
        ),
        skills:staff_skills (
          id,
          skill_code,
          proficiency,
          certified
        )
      `)
      .order('is_on_duty', { ascending: false })
      .order('role', { ascending: true })
      .order('display_name', { ascending: true });

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (onDutyFilter !== null && onDutyFilter !== undefined) {
      query = query.eq('is_on_duty', onDutyFilter === 'true');
    }

    const { data: staff, error } = await query;
    if (error) {
      console.error('Failed to fetch staff directory from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(staff || []);
  } catch (err: any) {
    console.error('Staff API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
