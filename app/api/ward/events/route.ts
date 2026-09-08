import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

type WardEvent = {
  id: string;
  type: string;
  message: string;
  occurredAt: string;
  bedNumber: string | null;
  owner: string | null;
  source: 'patient' | 'task' | 'system';
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 12, 1), 40);
    const since = searchParams.get('since') || new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const admin = createAdminClient();

    const [{ data: patientEvents, error: patientError }, { data: taskEvents, error: taskError }, { data: systemEvents, error: systemError }] = await Promise.all([
      admin
        .from('patient_events')
        .select('id, event_type, timestamp, metadata, patient:patients(first_name, last_name, beds(bed_number))')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(limit),
      admin
        .from('task_events')
        .select('id, event_type, created_at, task:tasks(title, patient:patients(beds(bed_number))), staff:staff(display_name)')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit),
      admin
        .from('system_events')
        .select('id, event_type, entity_type, entity_id, timestamp, metadata')
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(limit),
    ]);

    const firstError = patientError || taskError || systemError;
    if (firstError) throw firstError;

    const events: WardEvent[] = [
      ...(patientEvents || []).map((event: any) => ({
        id: event.id,
        type: event.event_type,
        message: `${event.patient?.first_name || 'Patient'} ${event.event_type.replaceAll('_', ' ')}`,
        occurredAt: event.timestamp,
        bedNumber: event.patient?.beds?.[0]?.bed_number ? String(event.patient.beds[0].bed_number) : null,
        owner: null,
        source: 'patient' as const,
      })),
      ...(taskEvents || []).map((event: any) => ({
        id: event.id,
        type: event.event_type,
        message: `${event.task?.title || 'Task'} · ${event.event_type.replaceAll('_', ' ')}`,
        occurredAt: event.created_at,
        bedNumber: event.task?.patient?.beds?.[0]?.bed_number ? String(event.task.patient.beds[0].bed_number) : null,
        owner: event.staff?.display_name || null,
        source: 'task' as const,
      })),
      ...(systemEvents || []).map((event: any) => ({
        id: event.id,
        type: event.event_type,
        message: String(event.metadata?.title || event.metadata?.reason || event.event_type).replaceAll('_', ' '),
        occurredAt: event.timestamp,
        bedNumber: event.metadata?.bed_number ? String(event.metadata.bed_number) : null,
        owner: null,
        source: 'system' as const,
      })),
    ]
      .filter((event) => Boolean(event.occurredAt))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, limit);

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load ward events' }, { status: 500 });
  }
}
