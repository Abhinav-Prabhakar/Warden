import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Online wardens roster across floors
const WARDENS_ROSTER = [
  { floor: 4, name: 'Warden Sarah Jenkins', ward: 'Ward 4B - Acute Adult Care', status: 'online', callsign: 'WARDEN-4', freq: '433.92 MHz' },
  { floor: 5, name: 'Warden Alex Chen', ward: 'Ward 5A - Neurology & Stroke', status: 'online', callsign: 'WARDEN-5', freq: '433.92 MHz' },
  { floor: 6, name: 'Warden Dev Patel', ward: 'Ward 6B - Cardiology Telemetry', status: 'busy', callsign: 'WARDEN-6', freq: '433.92 MHz' },
  { floor: 7, name: 'Warden Marcus Vance', ward: 'Ward 7A - General Medical', status: 'active_operator', callsign: 'WARDEN-7 (Current)', freq: '433.92 MHz' },
  { floor: 8, name: 'Warden Elena Rostova', ward: 'Ward 8C - Surgical Step-Down', status: 'online', callsign: 'WARDEN-8', freq: '433.92 MHz' },
];

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const floorParam = searchParams.get('floor');
    const floorNumber = floorParam ? parseInt(floorParam, 10) : 7;

    // 1. Fetch latest radio silence state
    const { data: silenceEvents } = await admin
      .from('system_events')
      .select('*')
      .eq('event_type', 'radio_silence')
      .order('timestamp', { ascending: false })
      .limit(1);

    const isRadioBlocked = silenceEvents && silenceEvents.length > 0
      ? Boolean((silenceEvents[0].metadata as any)?.blocked)
      : false;

    const blockedAt = silenceEvents?.[0]?.timestamp || null;

    // 2. Fetch radio transmissions from system_events
    const { data: rawEvents, error } = await admin
      .from('system_events')
      .select('*')
      .eq('event_type', 'radio_transmission')
      .order('timestamp', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Radio transmissions fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const transmissions = (rawEvents || []).map((e: any) => {
      const meta = e.metadata || {};
      return {
        id: e.id,
        sender: meta.sender_warden || 'Unknown Warden',
        senderFloor: meta.sender_floor || 4,
        recipientFloor: meta.recipient_floor || 7,
        channel: meta.channel || 'WARDEN-SECURE-CH-07',
        frequency: meta.frequency || '433.92 MHz',
        urgency: meta.urgency || 'routine',
        transcript: meta.transcript || 'Audio transmission received',
        status: meta.status || 'delivered',
        timestamp: e.timestamp,
        isQueued: meta.status === 'queued' || (isRadioBlocked && meta.status !== 'played'),
      };
    });

    const queuedCount = transmissions.filter((t) => t.isQueued).length;

    return NextResponse.json({
      channel: 'WARDEN-SECURE-CH-07',
      frequency: '433.92 MHz',
      encryption: 'AES-256 GCM',
      currentFloor: floorNumber,
      isRadioBlocked,
      blockedAt,
      queuedCount,
      wardens: WARDENS_ROSTER,
      transmissions,
    });
  } catch (err: any) {
    console.error('Radio API GET exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const {
      sender_warden = 'Warden Marcus Vance',
      sender_floor = 7,
      recipient_floor = 8,
      transcript,
      urgency = 'routine',
      channel = 'WARDEN-SECURE-CH-07',
    } = body;

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({ error: 'Transmission transcript is required' }, { status: 400 });
    }

    // Check if recipient floor or current has radio silence
    const { data: silenceEvents } = await admin
      .from('system_events')
      .select('*')
      .eq('event_type', 'radio_silence')
      .order('timestamp', { ascending: false })
      .limit(1);

    const isRadioBlocked = silenceEvents && silenceEvents.length > 0
      ? Boolean((silenceEvents[0].metadata as any)?.blocked)
      : false;

    const status = isRadioBlocked ? 'queued' : 'delivered';

    const entityId = crypto.randomUUID();
    const payload = {
      event_type: 'radio_transmission',
      entity_type: 'warden_radio',
      entity_id: entityId,
      actor_type: 'warden',
      metadata: {
        sender_warden,
        sender_floor: parseInt(sender_floor, 10),
        recipient_floor: parseInt(recipient_floor, 10),
        channel,
        frequency: '433.92 MHz',
        urgency,
        transcript: transcript.trim(),
        status,
        queued_reason: isRadioBlocked ? 'radio_silence_enabled' : null,
      },
    };

    const { data, error } = await admin
      .from('system_events')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Radio transmission insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      status,
      message: isRadioBlocked
        ? 'Transmission queued (Recipient has radio silence enabled)'
        : 'Transmission broadcasted successfully',
    });
  } catch (err: any) {
    console.error('Radio API POST exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const { action, blocked, transmissionId } = body;

    if (action === 'toggle_silence') {
      const entityId = crypto.randomUUID();
      const { data, error } = await admin
        .from('system_events')
        .insert({
          event_type: 'radio_silence',
          entity_type: 'warden_radio_control',
          entity_id: entityId,
          actor_type: 'warden',
          metadata: {
            blocked: Boolean(blocked),
            updated_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        isRadioBlocked: Boolean(blocked),
        message: blocked
          ? 'Radio silence enabled: Incoming communications will be queued silently'
          : 'Radio communications active: Real-time inbound transmissions restored',
      });
    }

    if (action === 'mark_played' && transmissionId) {
      const { data: existing } = await admin
        .from('system_events')
        .select('*')
        .eq('id', transmissionId)
        .single();

      if (existing) {
        const metaObj = (existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata))
          ? existing.metadata
          : {};
        const updatedMeta = { ...(metaObj as any), status: 'played' };
        await admin
          .from('system_events')
          .update({ metadata: updatedMeta })
          .eq('id', transmissionId);
      }

      return NextResponse.json({ success: true, transmissionId, status: 'played' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Radio API PATCH exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
