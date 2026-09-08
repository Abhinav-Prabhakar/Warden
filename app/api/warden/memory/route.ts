import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export interface DeferredReminder {
  id: string;
  title: string;
  category: 'bed_check' | 'doctor_call' | 'transport' | 'equipment' | 'medication' | 'general';
  bed_number?: string;
  status: 'active' | 'completed' | 'dismissed';
  remind_at: string;
  created_at: string;
  created_by: string;
  source: 'voice' | 'ui';
  due_in_minutes?: number;
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: rows, error } = await admin
      .from('system_events')
      .select('id, timestamp, metadata')
      .eq('event_type', 'deferred_reminder')
      .order('timestamp', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const now = Date.now();
    const reminders: DeferredReminder[] = (rows || []).map((r) => {
      const meta = (r.metadata as any) || {};
      const remindTime = meta.remind_at ? new Date(meta.remind_at).getTime() : now;
      const diffMinutes = Math.round((remindTime - now) / 60000);

      return {
        id: r.id,
        title: meta.title || 'Deferred task',
        category: meta.category || 'general',
        bed_number: meta.bed_number || undefined,
        status: meta.status || 'active',
        remind_at: meta.remind_at || r.timestamp || new Date().toISOString(),
        created_at: r.timestamp || new Date().toISOString(),
        created_by: meta.created_by || 'Staff Coordinator',
        source: meta.source || 'voice',
        due_in_minutes: diffMinutes,
      };
    });

    const active = reminders.filter((r) => r.status === 'active');
    const completed = reminders.filter((r) => r.status === 'completed');

    return NextResponse.json({
      reminders,
      activeCount: active.length,
      completedCount: completed.length,
      active,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      category = 'general',
      bed_number,
      delayMinutes = 30,
      created_by = 'Ward Coordinator',
      source = 'voice',
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const remindAt = new Date(Date.now() + Number(delayMinutes) * 60 * 1000).toISOString();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('system_events')
      .insert({
        event_type: 'deferred_reminder',
        entity_type: 'ward_memory',
        entity_id: crypto.randomUUID(),
        actor_type: 'staff',
        timestamp: new Date().toISOString(),
        metadata: {
          title: title.trim(),
          category,
          bed_number: bed_number || null,
          status: 'active',
          remind_at: remindAt,
          created_by,
          source,
        },
      })
      .select('id, timestamp, metadata')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        reminder: {
          id: data.id,
          title: title.trim(),
          category,
          bed_number,
          status: 'active',
          remind_at: remindAt,
          created_at: data.timestamp,
          created_by,
          source,
          due_in_minutes: Number(delayMinutes),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status = 'completed' } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: existing, error: fetchErr } = await admin
      .from('system_events')
      .select('metadata')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    const updatedMeta = {
      ...((existing.metadata as any) || {}),
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    };

    const { error } = await admin
      .from('system_events')
      .update({ metadata: updatedMeta })
      .eq('id', id)
      .select('id, timestamp, metadata')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
