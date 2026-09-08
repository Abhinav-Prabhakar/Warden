import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Clinical call templates based on inpatient conditions
const CALL_INTENTS: Record<string, { purpose: string; prompt: string; sampleResponses: string[] }> = {
  comfort_check: {
    purpose: 'Post-Admission & Comfort Check-in',
    prompt: 'Hello, this is the Warden Automated Ward Assistant checking in on your comfort. How are you feeling right now, and is there anything you need for your room or bed?',
    sampleResponses: [
      "I am doing alright, but it gets quite cold near the window. Could I get an extra warm blanket and maybe some water?",
      "My incision is throbbing a bit, maybe 4 out of 10 pain. Could the nurse check when my next pain medication is scheduled?",
      "I feel a little dizzy when sitting up. I need someone to help me walk to the bathroom safely.",
    ],
  },
  symptom_followup: {
    purpose: 'Symptom & Pain Follow-up Assessment',
    prompt: 'Warden clinical check-in. I am reviewing your recovery notes. Can you rate your current pain level from 0 to 10 and let me know if you have any nausea or shortness of breath?',
    sampleResponses: [
      "Pain is around 6 out of 10 right now. No nausea, but breathing feels a bit tight. Can someone check my oxygen?",
      "Pain is down to 2 out of 10, much better. But my stomach feels a bit upset from the antibiotics. Could I get something light to eat?",
      "No pain, but my surgical dressing feels loose on the left side. I'd appreciate it if the nurse could take a look.",
    ],
  },
  discharge_readiness: {
    purpose: 'Discharge Readiness & Transportation Confirmation',
    prompt: 'Hello, Warden care coordinator calling regarding your discharge plan. Have you received your take-home medication instructions, and is your family ride confirmed?',
    sampleResponses: [
      "My son will be arriving around 4:30 PM to pick me up. I still have questions about the blood thinner dosage though.",
      "Yes, my ride is ready at the south entrance. Could I get a wheelchair assist down to the car when my paperwork is signed?",
      "I received the instructions, but I need the discharge summary printed for my cardiologist follow-up next Tuesday.",
    ],
  },
};

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const floorParam = searchParams.get('floor');
    const floorNumber = floorParam ? parseInt(floorParam, 10) : 7;

    // 1. Fetch recent phone call logs from system_events
    const { data: callEvents, error } = await admin
      .from('system_events')
      .select('*')
      .eq('event_type', 'patient_phone_call')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Phone calls fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const calls = (callEvents || []).map((e: any) => {
      const meta = (e.metadata && typeof e.metadata === 'object' && !Array.isArray(e.metadata))
        ? e.metadata
        : {};
      return {
        id: e.id,
        patientId: meta.patient_id,
        patientName: meta.patient_name || 'Inpatient',
        bedNumber: meta.bed_number || 'Bed',
        floor: meta.floor || floorNumber,
        phoneNumber: meta.phone_number || '+1 (555) 019-2834',
        purpose: meta.purpose || 'Clinical Check-in',
        status: meta.status || 'completed',
        durationSeconds: meta.duration_seconds || 84,
        transcript: meta.transcript || [],
        notes: meta.notes || {
          summary: 'Patient check-in complete.',
          needs: [],
          painLevel: null,
          urgency: 'routine',
        },
        createdTasks: meta.created_tasks || [],
        timestamp: e.timestamp,
      };
    });

    // 2. Fetch occupied beds on the specified floor for quick dialer selection
    const { data: floorBeds } = await admin
      .from('beds')
      .select(`
        id,
        bed_number,
        status,
        room:rooms!beds_room_id_fkey!inner (room_number, floor_number),
        patient:patients!beds_current_patient_id_fkey (
          id,
          first_name,
          last_name,
          acuity,
          patient_conditions (name)
        )
      `)
      .eq('room.floor_number', floorNumber)
      .order('bed_number', { ascending: true });

    const callCandidates = (floorBeds || [])
      .filter((b: any) => b.patient && b.status !== 'available')
      .map((b: any) => {
        const rawBedNum = String(b.bed_number);
        const bedLabel = rawBedNum.startsWith('Bed') ? rawBedNum : `Bed ${rawBedNum}`;
        return {
          bedId: b.id,
          bedNumber: bedLabel,
          roomNumber: b.room?.room_number,
          patientId: b.patient.id,
          patientName: `${b.patient.first_name} ${b.patient.last_name}`,
          acuity: b.patient.acuity,
          condition: b.patient.patient_conditions?.[0]?.name || 'Acute Care',
          phone: `+1 (555) 01${(b.bed_number % 90 + 10).toString().padStart(2, '0')}-${b.room?.room_number || '701'}`,
        };
      });

    return NextResponse.json({
      floor: floorNumber,
      calls,
      callCandidates,
      templates: Object.keys(CALL_INTENTS).map((k) => ({
        key: k,
        purpose: CALL_INTENTS[k].purpose,
      })),
    });
  } catch (err: any) {
    console.error('Calls API GET exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const {
      patientId,
      patientName = 'Inpatient',
      bedNumber = 'Bed 3',
      floor = 7,
      phoneNumber = '+1 (555) 019-2834',
      templateKey = 'comfort_check',
      customPrompt,
    } = body;

    const template = CALL_INTENTS[templateKey] || CALL_INTENTS.comfort_check;
    const initialPrompt = customPrompt || template.prompt;

    // Pick a realistic patient response based on template
    const responses = template.sampleResponses;
    const patientReply = responses[Math.floor(Math.random() * responses.length)];

    // 1. Build Autonomous Conversation Transcript
    const transcript = [
      {
        speaker: 'Warden AI Voice Agent',
        text: initialPrompt,
        timestamp: '00:02',
      },
      {
        speaker: patientName,
        text: patientReply,
        timestamp: '00:18',
      },
      {
        speaker: 'Warden AI Voice Agent',
        text: `Understood, ${patientName.split(' ')[0]}. I have logged your needs into the clinical system and dispatched an alert to your assigned nurse. Please remain resting comfortably.`,
        timestamp: '00:36',
      },
      {
        speaker: patientName,
        text: 'Thank you very much, Warden. I appreciate you checking in.',
        timestamp: '00:48',
      },
    ];

    // 2. Extract Structured Clinical Notes of Patient Needs
    const detectedNeeds: string[] = [];
    let painLevel: number | null = null;
    let urgency: 'routine' | 'urgent' | 'stat' = 'routine';

    if (/blanket|cold/i.test(patientReply)) {
      detectedNeeds.push('Thermal comfort: Extra warm blanket requested');
    }
    if (/water|thirst|drink/i.test(patientReply)) {
      detectedNeeds.push('Hydration: Fresh oral fluids / ice water');
    }
    if (/pain|throbbing|incision/i.test(patientReply)) {
      const match = patientReply.match(/(\d+)\s*(?:out of 10|\/10)/i);
      painLevel = match ? parseInt(match[1], 10) : 5;
      detectedNeeds.push(`Analgesia review: Breakthrough pain rated ${painLevel}/10`);
      if (painLevel >= 6) urgency = 'urgent';
    }
    if (/walk|bathroom|dizzy|stand/i.test(patientReply)) {
      detectedNeeds.push('Fall prevention: Supervised ambulation & transfer assist');
      urgency = 'urgent';
    }
    if (/oxygen|breathing|tight/i.test(patientReply)) {
      detectedNeeds.push('Respiratory: O2 cannula titration & SpO2 check');
      urgency = 'stat';
    }
    if (/dressing|bandage/i.test(patientReply)) {
      detectedNeeds.push('Wound care: Surgical dressing inspection');
    }
    if (/wheelchair|transport/i.test(patientReply)) {
      detectedNeeds.push('Logistics: Wheelchair escort to discharge vehicle');
    }

    if (detectedNeeds.length === 0) {
      detectedNeeds.push('Routine observation: Patient resting comfortably with stable baseline');
    }

    const clinicalSummary = `Autonomous phone check-in completed with ${patientName} in ${bedNumber} (Floor ${floor}). Patient voiced ${detectedNeeds.length} clinical/comfort need(s): ${detectedNeeds.join('; ')}.`;

    // 3. Automatically Create Real Tasks in Supabase `tasks` Table for Detected Needs
    const createdTasks: any[] = [];
    if (patientId) {
      const { data: hosp } = await admin.from('hospitals').select('id').limit(1).single();
      const hospitalId = hosp?.id || 'd9f45709-f978-4100-a662-6330a27b7578';

      for (const need of detectedNeeds) {
        const title = `${bedNumber}: ${need.split(':')[0]}`;
        const { data: createdTask } = await admin
          .from('tasks')
          .insert({
            hospital_id: hospitalId,
            patient_id: patientId,
            task_type: 'patient_check',
            title,
            description: `${need} — Logged autonomously by Warden Telephone Agent during comfort call.`,
            priority: urgency === 'stat' ? 1 : urgency === 'urgent' ? 2 : 3,
            urgency,
            status: 'pending',
            source: 'voice',
          })
          .select('id, title, status, priority')
          .single();

        if (createdTask) {
          createdTasks.push(createdTask);
        }
      }
    }

    // 4. Save the Phone Call Log in `system_events`
    const entityId = crypto.randomUUID();
    const callRecord = {
      event_type: 'patient_phone_call',
      entity_type: 'telephone_session',
      entity_id: entityId,
      actor_type: 'warden_voice_agent',
      metadata: {
        patient_id: patientId,
        patient_name: patientName,
        bed_number: bedNumber,
        floor,
        phone_number: phoneNumber,
        purpose: template.purpose,
        status: 'completed',
        duration_seconds: 52,
        transcript,
        notes: {
          summary: clinicalSummary,
          needs: detectedNeeds,
          painLevel,
          urgency,
          recordedAt: new Date().toISOString(),
        },
        created_tasks: createdTasks,
      },
    };

    const { data: savedEvent, error: saveErr } = await admin
      .from('system_events')
      .insert(callRecord)
      .select()
      .single();

    if (saveErr) {
      console.error('Failed to log call session:', saveErr);
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      callId: savedEvent.id,
      patientName,
      bedNumber,
      floor,
      duration: '00:52',
      transcript,
      notes: {
        summary: clinicalSummary,
        needs: detectedNeeds,
        painLevel,
        urgency,
      },
      createdTasks,
      message: `Call completed with ${patientName}. ${detectedNeeds.length} need(s) logged and ${createdTasks.length} task(s) dispatched to ward staff.`,
    });
  } catch (err: any) {
    console.error('Calls API POST exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
