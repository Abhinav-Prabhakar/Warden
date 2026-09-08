import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Seeding Beds 1 through 11 with full clinical & operational details...");

  // 1. Get Ward & Rooms
  const { data: ward } = await supabase.from('wards').select('id, hospital_id').limit(1).single();
  const hospitalId = ward.hospital_id;

  const { data: rooms } = await supabase.from('rooms').select('id, room_number');
  const roomMap = {};
  rooms?.forEach(r => { roomMap[r.room_number] = r.id; });

  // Get a staff ID for vitals & tasks
  const { data: staff } = await supabase.from('staff').select('id').limit(1).single();
  const staffId = staff?.id;

  // 11 Bed Definitions matching the UI and color semantics:
  // - GREEN: Patient is doing well (stable, no pending tasks)
  // - ORANGE: Task you have to do there (cleaning, blocked discharge, transport, medication handover)
  // - RED: Danger and priority test (critical deterioration, STAT ECG & review)
  const BEDS_DATA = [
    {
      bed_number: 'Bed 1',
      room_number: '401',
      bed_type: 'standard',
      status: 'occupied',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2001',
        first_name: 'Meera',
        last_name: 'Patel',
        dob: '1988-02-18',
        sex: 'F',
        blood_type: 'AB-',
        acuity: 'stable',
        status: 'admitted',
        condition: 'Bacterial Pneumonia - Fully Resolved',
        severity: 'mild',
        vitals: { hr: 74, rr: 16, spo2: 98, temp: 36.6, sbp: 118, dbp: 76, pain: 0 },
        task: null, // Green: doing well, no pending tasks
        discharge: { status: 'ready', notes: 'Medically cleared. Patient doing well, discharge instructions provided.' }
      }
    },
    {
      bed_number: 'Bed 2',
      room_number: '401',
      bed_type: 'standard',
      status: 'cleaning',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: null,
      cleaning: { status: 'in_progress', started_at: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
      task: { title: 'Terminal disinfection & UV-C decontamination', type: 'cleaning', urgency: 'urgent', status: 'pending' }
    },
    {
      bed_number: 'Bed 3',
      room_number: '401',
      bed_type: 'icu_step_down',
      status: 'occupied',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: true,
      patient: {
        mrn: 'MRN-2003',
        first_name: 'Vikram',
        last_name: 'Malhotra',
        dob: '1962-04-12',
        sex: 'M',
        blood_type: 'B+',
        acuity: 'critical',
        status: 'admitted',
        condition: 'Unstable Angina / Deteriorating',
        severity: 'severe',
        vitals: { hr: 118, rr: 28, spo2: 90, temp: 38.2, sbp: 158, dbp: 98, pain: 8 },
        task: { title: 'STAT Doctor Review & 12-lead ECG', type: 'doctor_review', urgency: 'stat', status: 'pending' },
        discharge: null
      }
    },
    {
      bed_number: 'Bed 4',
      room_number: '401',
      bed_type: 'standard',
      status: 'blocked',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2004',
        first_name: 'Ramesh',
        last_name: 'Gupta',
        dob: '1970-11-03',
        sex: 'M',
        blood_type: 'A+',
        acuity: 'stable',
        status: 'admitted',
        condition: 'Post Left Knee Arthroplasty - Discharge Blocked',
        severity: 'mild',
        vitals: { hr: 80, rr: 18, spo2: 96, temp: 37.0, sbp: 130, dbp: 84, pain: 2 },
        task: { title: 'Awaiting Attending Dr Shah discharge sign-off & SNF bed', type: 'discharge', urgency: 'urgent', status: 'pending' },
        discharge: { status: 'delayed', notes: 'Discharge blocked: awaiting attending signature and SNF facility bed confirmation' }
      }
    },
    {
      bed_number: 'Bed 5',
      room_number: '402',
      bed_type: 'standard',
      status: 'occupied',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2005',
        first_name: 'Siddharth',
        last_name: 'Sen',
        dob: '1983-07-15',
        sex: 'M',
        blood_type: 'O+',
        acuity: 'stable',
        status: 'admitted',
        condition: 'Appendectomy Post-Op - Healing Well',
        severity: 'mild',
        vitals: { hr: 72, rr: 16, spo2: 99, temp: 36.8, sbp: 122, dbp: 78, pain: 1 },
        task: null, // Green: doing well
        discharge: null
      }
    },
    {
      bed_number: 'Bed 6',
      room_number: '402',
      bed_type: 'standard',
      status: 'occupied',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2006',
        first_name: 'Sunita',
        last_name: 'Reddy',
        dob: '1995-12-08',
        sex: 'F',
        blood_type: 'A-',
        acuity: 'stable',
        status: 'admitted',
        condition: 'Complicated Migraine - Symptoms Resolved',
        severity: 'mild',
        vitals: { hr: 68, rr: 15, spo2: 99, temp: 36.7, sbp: 110, dbp: 70, pain: 0 },
        task: null, // Green: doing well
        discharge: null
      }
    },
    {
      bed_number: 'Bed 7',
      room_number: '403',
      bed_type: 'standard',
      status: 'occupied',
      isolation_capable: true,
      oxygen_available: false,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2007',
        first_name: 'Ananya',
        last_name: 'Rao',
        dob: '1955-09-24',
        sex: 'F',
        blood_type: 'O+',
        acuity: 'needs_attention',
        status: 'admitted',
        condition: 'COPD with Active Transport Requirement',
        severity: 'moderate',
        vitals: { hr: 92, rr: 22, spo2: 91, temp: 37.2, sbp: 138, dbp: 86, pain: 1 },
        task: { title: 'Wheelchair Porter to CT Suite 1 (Dispatch porter & attach portable O2)', type: 'transport', urgency: 'urgent', status: 'pending' },
        discharge: null
      }
    },
    {
      bed_number: 'Bed 8',
      room_number: '403',
      bed_type: 'standard',
      status: 'occupied',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2008',
        first_name: 'Kavita',
        last_name: 'Desai',
        dob: '1979-06-30',
        sex: 'F',
        blood_type: 'O-',
        acuity: 'stable',
        status: 'admitted',
        condition: 'Abdominal Pain - Observation Complete, Doing Well',
        severity: 'mild',
        vitals: { hr: 74, rr: 16, spo2: 98, temp: 36.9, sbp: 120, dbp: 75, pain: 0 },
        task: null, // Green: doing well
        discharge: null
      }
    },
    {
      bed_number: 'Bed 9',
      room_number: '404',
      bed_type: 'standard',
      status: 'occupied',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2009',
        first_name: 'Devansh',
        last_name: 'Nair',
        dob: '1973-04-19',
        sex: 'M',
        blood_type: 'B-',
        acuity: 'stable',
        status: 'admitted',
        condition: 'Right Tibia Closed Reduction - Healing Well',
        severity: 'mild',
        vitals: { hr: 70, rr: 16, spo2: 98, temp: 36.5, sbp: 124, dbp: 80, pain: 1 },
        task: null, // Green: doing well
        discharge: null
      }
    },
    {
      bed_number: 'Bed 10',
      room_number: '405',
      bed_type: 'standard',
      status: 'occupied',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2010',
        first_name: 'Pooja',
        last_name: 'Hegde',
        dob: '1990-10-14',
        sex: 'F',
        blood_type: 'A+',
        acuity: 'stable',
        status: 'admitted',
        condition: 'Acute Pyelonephritis - Discharge In-Progress',
        severity: 'mild',
        vitals: { hr: 72, rr: 16, spo2: 99, temp: 36.6, sbp: 116, dbp: 74, pain: 0 },
        task: { title: 'Hand over take-home medications & escort family to checkout', type: 'discharge', urgency: 'routine', status: 'pending' },
        discharge: { status: 'ready', notes: 'Medications dispensed, waiting for family in ground floor reception' }
      }
    },
    {
      bed_number: 'Bed 11',
      room_number: '405',
      bed_type: 'standard',
      status: 'occupied',
      isolation_capable: false,
      oxygen_available: true,
      monitor_available: false,
      patient: {
        mrn: 'MRN-2011',
        first_name: 'Harish',
        last_name: 'Iyer',
        dob: '1966-08-22',
        sex: 'M',
        blood_type: 'AB+',
        acuity: 'stable',
        status: 'admitted',
        condition: 'DKA - Fully Resolved, Glycemia Stabilized',
        severity: 'mild',
        vitals: { hr: 74, rr: 16, spo2: 98, temp: 36.7, sbp: 120, dbp: 78, pain: 0 },
        task: null, // Green: doing well
        discharge: null
      }
    }
  ];

  for (const bedData of BEDS_DATA) {
    const roomId = roomMap[bedData.room_number] || rooms[0].id;
    let patientId = null;

    if (bedData.patient) {
      const p = bedData.patient;
      // Upsert patient
      const { data: patientRecord, error: patErr } = await supabase
        .from('patients')
        .upsert({
          hospital_id: hospitalId,
          medical_record_number: p.mrn,
          first_name: p.first_name,
          last_name: p.last_name,
          date_of_birth: p.dob,
          sex: p.sex,
          blood_type: p.blood_type,
          acuity: p.acuity,
          status: p.status,
          admission_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        }, { onConflict: 'medical_record_number' })
        .select('id')
        .single();

      if (patErr) console.warn("Patient upsert error:", patErr.message);
      patientId = patientRecord?.id;

      if (patientId) {
        // Insert vitals
        await supabase.from('vitals').insert({
          patient_id: patientId,
          recorded_by: staffId,
          recorded_at: new Date().toISOString(),
          heart_rate: p.vitals.hr,
          respiratory_rate: p.vitals.rr,
          spo2: p.vitals.spo2,
          temperature: p.vitals.temp,
          systolic_bp: p.vitals.sbp,
          diastolic_bp: p.vitals.dbp,
          pain_score: p.vitals.pain,
        });

        // Insert condition
        await supabase.from('patient_conditions').insert({
          patient_id: patientId,
          code: 'GEN-01',
          name: p.condition,
          status: 'active',
          severity: p.severity,
        });

        // Clear previous tasks for this patient before seeding fresh
        await supabase.from('tasks').delete().eq('patient_id', patientId);
        await supabase.from('discharge_plans').delete().eq('patient_id', patientId);

        // Insert task if any
        if (p.task) {
          await supabase.from('tasks').insert({
            hospital_id: hospitalId,
            patient_id: patientId,
            task_type: p.task.type,
            title: p.task.title,
            priority: p.task.urgency === 'stat' ? 1 : 2,
            urgency: p.task.urgency,
            status: p.task.status,
            due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          });
        }

        // Insert discharge plan if any
        if (p.discharge) {
          await supabase.from('discharge_plans').insert({
            patient_id: patientId,
            planned_discharge_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
            medications_ready: p.discharge.status === 'ready',
            paperwork_complete: p.discharge.status === 'ready',
            family_notified: true,
            transport_arranged: p.discharge.status === 'ready',
            status: p.discharge.status,
            notes: p.discharge.notes,
          });
        }
      }
    }

    // Check if bed already exists by bed_number
    const { data: existingBed } = await supabase
      .from('beds')
      .select('id')
      .eq('bed_number', bedData.bed_number)
      .limit(1)
      .single();

    if (existingBed) {
      await supabase
        .from('beds')
        .update({
          room_id: roomId,
          bed_type: bedData.bed_type,
          status: bedData.status,
          isolation_capable: bedData.isolation_capable,
          oxygen_available: bedData.oxygen_available,
          monitor_available: bedData.monitor_available,
          current_patient_id: patientId,
        })
        .eq('id', existingBed.id);
    } else {
      await supabase
        .from('beds')
        .insert({
          room_id: roomId,
          bed_number: bedData.bed_number,
          bed_type: bedData.bed_type,
          status: bedData.status,
          isolation_capable: bedData.isolation_capable,
          oxygen_available: bedData.oxygen_available,
          monitor_available: bedData.monitor_available,
          current_patient_id: patientId,
        });
    }

    const actualBedId = existingBed?.id || (await supabase.from('beds').select('id').eq('bed_number', bedData.bed_number).single()).data?.id;

    if (bedData.cleaning && actualBedId) {
      await supabase.from('cleaning_jobs').delete().eq('bed_id', actualBedId);
      await supabase.from('cleaning_jobs').insert({
        bed_id: actualBedId,
        status: bedData.cleaning.status,
        priority: 1,
        started_at: bedData.cleaning.started_at,
        requested_at: new Date().toISOString(),
      });
    }

    if (!bedData.patient && bedData.task) {
      await supabase.from('tasks').delete().ilike('title', `%${bedData.bed_number}%`);
      await supabase.from('tasks').insert({
        hospital_id: hospitalId,
        task_type: bedData.task.type,
        title: `${bedData.task.title} (${bedData.bed_number})`,
        priority: bedData.task.urgency === 'stat' ? 1 : 2,
        urgency: bedData.task.urgency,
        status: bedData.task.status,
        due_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    }

    console.log(`✓ Seeded ${bedData.bed_number}: ${bedData.status} - Patient: ${bedData.patient ? bedData.patient.first_name + ' ' + bedData.patient.last_name : 'None'}`);
  }

  console.log("All 11 beds successfully seeded in Supabase!");
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
