import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Authentication failed' }, { status: 401 });
    }

    // Fetch staff record associated with this auth user
    const admin = createAdminClient();
    const { data: staff } = await admin
      .from('staff')
      .select('*, department:departments(*)')
      .eq('auth_user_id', data.user.id)
      .single();

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        staff_profile: staff || null,
      },
      session: {
        access_token: data.session?.access_token,
        expires_at: data.session?.expires_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
