import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export interface IncomingAdmission {
  id: string;
  patient_name: string;
  mrn: string;
  age: number;
  sex: string;
  diagnosis: string;
  acuity: 'critical' | 'urgent' | 'stable';
  eta_minutes: number;
  expected_arrival: string;
  staged_bed_number: string;
  staged_bed_status?: string;
  transfer_source: string;
  requirements: string[];
  blockers: string[];
  status: 'staged' | 'en_route' | 'arrived' | 'admitted' | 'cancelled';
  created_at: string;
}

export async function GET() {
  try {
    const admin = createAdminClient();

    // Fetch incoming admissions from system_events
    const { data: rows, error } = await admin
      .from('system_events')
      .select('id, timestamp, metadata')
      .eq('event_type', 'incoming_admission')
      .order('timestamp', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch live beds to cross-reference staged bed status
    const { data: beds } = await admin
      .from('beds')
      .select('id, bed_number, status');

    const bedStatusMap = new Map<string, string>();
    (beds || []).forEach((b) => {
      if (b.bed_number) {
        bedStatusMap.set(b.bed_number.toLowerCase().trim(), b.status || 'unknown');
      }
    });

    const now = Date.now();
    const admissions: IncomingAdmission[] = (rows || []).map((r) => {
      const meta = (r.metadata as any) || {};
      const arrivalTime = meta.expected_arrival
        ? new Date(meta.expected_arrival).getTime()
        : now + 30 * 60 * 1000;
      const diffMins = Math.max(1, Math.round((arrivalTime - now) / 60000));

      const stagedBedKey = (meta.staged_bed_number || '').toLowerCase().trim();
      const liveBedStatus = bedStatusMap.get(stagedBedKey) || 'unknown';

      return {
        id: r.id,
        patient_name: meta.patient_name || 'Incoming Patient',
        mrn: meta.mrn || 'MRN-PENDING',
        age: meta.age || 45,
        sex: meta.sex || 'U',
        diagnosis: meta.diagnosis || 'Observation Required',
        acuity: meta.acuity || 'urgent',
        eta_minutes: diffMins,
        expected_arrival: meta.expected_arrival || new Date(arrivalTime).toISOString(),
        staged_bed_number: meta.staged_bed_number || 'Unassigned',
        staged_bed_status: liveBedStatus,
        transfer_source: meta.transfer_source || 'Emergency Department',
        requirements: Array.isArray(meta.requirements) ? meta.requirements : [],
        blockers: Array.isArray(meta.blockers) ? meta.blockers : [],
        status: meta.status || 'en_route',
        created_at: r.timestamp || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      admissions,
      count: admissions.length,
      criticalCount: admissions.filter((a) => a.acuity === 'critical').length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patient_name,
      mrn,
      age = 50,
      sex = 'M',
      diagnosis,
      acuity = 'urgent',
      eta_minutes = 30,
      staged_bed_number = 'Bed 2',
      transfer_source = 'ED Triage',
      requirements = ['Continuous Vitals'],
      blockers = [],
    } = body;

    if (!patient_name || !diagnosis) {
      return NextResponse.json(
        { error: 'patient_name and diagnosis are required' },
        { status: 400 }
      );
    }

    const expectedArrival = new Date(Date.now() + Number(eta_minutes) * 60 * 1000).toISOString();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from('system_events')
      .insert({
        event_type: 'incoming_admission',
        entity_type: 'admission',
        entity_id: crypto.randomUUID(),
        actor_type: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          patient_name,
          mrn: mrn || `MRN-${Math.floor(1000 + Math.random() * 9000)}`,
          age: Number(age),
          sex,
          diagnosis,
          acuity,
          eta_minutes: Number(eta_minutes),
          expected_arrival: expectedArrival,
          staged_bed_number,
          transfer_source,
          requirements,
          blockers,
          status: 'en_route',
        },
      })
      .select('id, timestamp, metadata')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, action, bed_number } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: event, error: fetchErr } = await admin
      .from('system_events')
      .select('metadata')
      .eq('id', id)
      .single();

    if (fetchErr || !event) {
      return NextResponse.json({ error: 'Admission not found' }, { status: 404 });
    }

    const meta = (event.metadata as any) || {};

    if (action === 'reserve_bed') {
      const targetBed = bed_number || meta.staged_bed_number;
      if (targetBed) {
        // Update bed status to 'reserved' in beds table
        await admin
          .from('beds')
          .update({ status: 'reserved' })
          .ilike('bed_number', `%${targetBed.replace('Bed', '').trim()}%`);
      }
      meta.status = 'staged';
    } else if (action === 'expedite_cleaning') {
      meta.blockers = meta.blockers.map((b: string) =>
        b.includes('Disinfection') || b.includes('cleaning') ? `${b} [EXPEDITED STAT]` : b
      );
    } else if (action === 'mark_admitted') {
      meta.status = 'admitted';
      const targetBed = bed_number || meta.staged_bed_number;
      if (targetBed) {
        await admin
          .from('beds')
          .update({ status: 'occupied' })
          .ilike('bed_number', `%${targetBed.replace('Bed', '').trim()}%`);
      }
    }

    const { error: updateErr } = await admin
      .from('system_events')
      .update({ metadata: meta })
      .eq('id', id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action, updatedStatus: meta.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
