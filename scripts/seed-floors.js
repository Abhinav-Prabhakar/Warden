const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
for (const line of env.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim().replace(/^['\"]|['\"]$/g, '');
}

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  console.log('Seeding hospital data for floors 4, 5, 6, 7, 8...');

  // 1. Get hospital
  const { data: hosp } = await supabase.from('hospitals').select('id').limit(1).single();
  const hospId = hosp.id;

  // 2. Get or create departments
  const { data: depts } = await supabase.from('departments').select('id, code');
  const deptMap = {};
  (depts || []).forEach(d => { deptMap[d.code] = d.id; });

  const medDeptId = deptMap['MED-4'] || Object.values(deptMap)[0];

  // 3. Define floors
  const floors = [
    { num: 4, name: 'Ward 4B - Acute Adult Care', code: 'W-4B', type: 'acute_care' },
    { num: 5, name: 'Ward 5A - Neurology & Stroke Unit', code: 'W-5A', type: 'step_down' },
    { num: 6, name: 'Ward 6B - Cardiology & Telemetry', code: 'W-6B', type: 'telemetry' },
    { num: 7, name: 'Ward 7A - General Medical Ward', code: 'W-7A', type: 'general' },
    { num: 8, name: 'Ward 8C - Surgical Step-Down', code: 'W-8C', type: 'surgical' },
  ];

  // Clinical patient profiles per floor
  const floorPatientData = {
    7: [
      { bedNum: 'Bed 1', name: 'Meera Patel', age: '1988-02-18', sex: 'F', blood: 'AB-', mrn: 'MRN-7001', acuity: 'stable', condition: 'Pneumonia Resolution', color: 'green', status: 'occupied', hr: 74, spo2: 98, bpSys: 118, bpDia: 76, temp: 36.6, task: null },
      { bedNum: 'Bed 2', name: 'Terminal Disinfection', age: null, sex: 'U', blood: 'O+', mrn: 'CLN-7002', acuity: 'non_urgent', condition: 'Post-Discharge Disinfection', color: 'orange', status: 'cleaning', isCleaning: true, task: 'UV-C Room Terminal Sterilization' },
      { bedNum: 'Bed 3', name: 'Vikram Malhotra', age: '1962-04-12', sex: 'M', blood: 'B+', mrn: 'MRN-7003', acuity: 'critical', condition: 'Acute Coronary Syndrome', color: 'red', status: 'occupied', hr: 122, spo2: 89, bpSys: 164, bpDia: 102, temp: 38.4, task: 'STAT Doctor Review & 12-Lead ECG' },
      { bedNum: 'Bed 4', name: 'Ramesh Gupta', age: '1970-11-03', sex: 'M', blood: 'A+', mrn: 'MRN-7004', acuity: 'urgent', condition: 'Knee Arthroplasty (Post-Op)', color: 'orange', status: 'blocked', hr: 82, spo2: 97, bpSys: 130, bpDia: 84, temp: 37.1, task: 'Discharge Blocked: Awaiting Attending Physician Sign-off' },
      { bedNum: 'Bed 5', name: 'Siddharth Sen', age: '1983-07-22', sex: 'M', blood: 'O+', mrn: 'MRN-7005', acuity: 'stable', condition: 'Acute Gastroenteritis Recovery', color: 'green', status: 'occupied', hr: 72, spo2: 99, bpSys: 120, bpDia: 78, temp: 36.7, task: null },
      { bedNum: 'Bed 6', name: 'Sunita Reddy', age: '1995-09-14', sex: 'F', blood: 'B+', mrn: 'MRN-7006', acuity: 'stable', condition: 'Asthma Exacerbation Controlled', color: 'green', status: 'occupied', hr: 76, spo2: 98, bpSys: 116, bpDia: 74, temp: 36.8, task: null },
      { bedNum: 'Bed 7', name: 'Ananya Rao', age: '1955-09-24', sex: 'F', blood: 'O+', mrn: 'MRN-7007', acuity: 'urgent', condition: 'COPD with Oxygen Dependency', color: 'orange', status: 'occupied', hr: 88, spo2: 93, bpSys: 138, bpDia: 86, temp: 37.3, task: 'Titrate O2 Cannula to 3L/min & Arterial Blood Gas' },
      { bedNum: 'Bed 8', name: 'Kavita Desai', age: '1979-06-30', sex: 'F', blood: 'O-', mrn: 'MRN-7008', acuity: 'stable', condition: 'Abdominal Pain Observation', color: 'green', status: 'occupied', hr: 70, spo2: 99, bpSys: 122, bpDia: 78, temp: 36.5, task: null },
      { bedNum: 'Bed 9', name: 'Devansh Nair', age: '1973-12-05', sex: 'M', blood: 'A-', mrn: 'MRN-7009', acuity: 'stable', condition: 'Cellulitis on IV Antibiotics', color: 'green', status: 'occupied', hr: 78, spo2: 98, bpSys: 124, bpDia: 80, temp: 36.9, task: null },
      { bedNum: 'Bed 10', name: 'Pooja Hegde', age: '1990-03-15', sex: 'F', blood: 'B-', mrn: 'MRN-7010', acuity: 'urgent', condition: 'Severe Migraine & Dehydration', color: 'orange', status: 'occupied', hr: 84, spo2: 98, bpSys: 110, bpDia: 70, temp: 37.0, task: 'Administer IV Normal Saline 500ml & Ondansetron' },
      { bedNum: 'Bed 11', name: 'Harish Iyer', age: '1966-08-20', sex: 'M', blood: 'AB+', mrn: 'MRN-7011', acuity: 'stable', condition: 'Elective Hernia Repair Recovery', color: 'green', status: 'occupied', hr: 68, spo2: 99, bpSys: 118, bpDia: 76, temp: 36.6, task: null },
    ],
    4: [
      { bedNum: 'Bed 1', name: 'Arun Bhatia', age: '1958-01-14', sex: 'M', blood: 'A+', mrn: 'MRN-4001', acuity: 'stable', condition: 'Hypertension Monitoring', color: 'green', status: 'occupied', hr: 72, spo2: 98, bpSys: 128, bpDia: 82, temp: 36.7, task: null },
      { bedNum: 'Bed 2', name: 'Deepa Narayan', age: '1985-05-19', sex: 'F', blood: 'B+', mrn: 'MRN-4002', acuity: 'urgent', condition: 'Pyelonephritis', color: 'orange', status: 'occupied', hr: 92, spo2: 97, bpSys: 132, bpDia: 86, temp: 38.1, task: 'IV Ceftriaxone 1g Infusion' },
      { bedNum: 'Bed 3', name: 'Rajesh Khanna', age: '1960-11-28', sex: 'M', blood: 'O+', mrn: 'MRN-4003', acuity: 'critical', condition: 'Ventricular Tachycardia Episode', color: 'red', status: 'occupied', hr: 135, spo2: 91, bpSys: 156, bpDia: 98, temp: 37.8, task: 'Continuous Telemetry & Cardiology STAT Consult' },
      { bedNum: 'Bed 4', name: 'Bed Sanitation', age: null, sex: 'U', blood: 'O+', mrn: 'CLN-4004', acuity: 'non_urgent', condition: 'Deep Cleaning', color: 'orange', status: 'cleaning', isCleaning: true, task: 'Bed Frame & Mattress Disinfection' },
      { bedNum: 'Bed 5', name: 'Nandini Joshi', age: '1976-03-08', sex: 'F', blood: 'AB+', mrn: 'MRN-4005', acuity: 'stable', condition: 'Observation post-syncope', color: 'green', status: 'occupied', hr: 68, spo2: 99, bpSys: 114, bpDia: 72, temp: 36.6, task: null },
      { bedNum: 'Bed 6', name: 'Mohit Chawla', age: '1992-10-12', sex: 'M', blood: 'B-', mrn: 'MRN-4006', acuity: 'stable', condition: 'Allergic Reaction Resolved', color: 'green', status: 'occupied', hr: 74, spo2: 98, bpSys: 120, bpDia: 78, temp: 36.5, task: null },
      { bedNum: 'Bed 7', name: 'Sanjay Dutt', age: '1964-07-29', sex: 'M', blood: 'A-', mrn: 'MRN-4007', acuity: 'urgent', condition: 'Diabetic Foot Ulcer', color: 'orange', status: 'occupied', hr: 80, spo2: 97, bpSys: 134, bpDia: 84, temp: 37.2, task: 'Daily Wound Debridement & Blood Glucose Check' },
      { bedNum: 'Bed 8', name: 'Kiran Bedi', age: '1959-06-09', sex: 'F', blood: 'O+', mrn: 'MRN-4008', acuity: 'stable', condition: 'Stable post-TIA', color: 'green', status: 'occupied', hr: 70, spo2: 99, bpSys: 126, bpDia: 80, temp: 36.6, task: null },
      { bedNum: 'Bed 9', name: 'Gaurav Gill', age: '1981-12-02', sex: 'M', blood: 'B+', mrn: 'MRN-4009', acuity: 'stable', condition: 'Concussion Recovery', color: 'green', status: 'occupied', hr: 75, spo2: 98, bpSys: 118, bpDia: 76, temp: 36.7, task: null },
      { bedNum: 'Bed 10', name: 'Shweta Tiwari', age: '1989-04-17', sex: 'F', blood: 'O-', mrn: 'MRN-4010', acuity: 'urgent', condition: 'Severe Anemia (Hb 6.8)', color: 'orange', status: 'occupied', hr: 96, spo2: 95, bpSys: 104, bpDia: 64, temp: 36.9, task: 'Packed Red Blood Cells Transfusion Unit #1' },
      { bedNum: 'Bed 11', name: 'Alok Nath', age: '1956-07-10', sex: 'M', blood: 'AB-', mrn: 'MRN-4011', acuity: 'stable', condition: 'Chest Pain Ruled Out', color: 'green', status: 'occupied', hr: 66, spo2: 100, bpSys: 122, bpDia: 78, temp: 36.5, task: null },
    ],
    5: [
      { bedNum: 'Bed 1', name: 'Aditi Roy', age: '1972-06-11', sex: 'F', blood: 'O+', mrn: 'MRN-5001', acuity: 'stable', condition: 'Ischemic Stroke Rehabilitation', color: 'green', status: 'occupied', hr: 74, spo2: 98, bpSys: 126, bpDia: 80, temp: 36.8, task: null },
      { bedNum: 'Bed 2', name: 'Kunal Kapoor', age: '1968-09-15', sex: 'M', blood: 'A+', mrn: 'MRN-5002', acuity: 'urgent', condition: 'Subarachnoid Hemorrhage Stable', color: 'orange', status: 'occupied', hr: 86, spo2: 96, bpSys: 138, bpDia: 88, temp: 37.4, task: 'Hourly Neurological Checks (GCS & Pupils)' },
      { bedNum: 'Bed 3', name: 'Farhan Akhtar', age: '1974-01-09', sex: 'M', blood: 'B+', mrn: 'MRN-5003', acuity: 'critical', condition: 'Status Epilepticus Post-Ictal', color: 'red', status: 'occupied', hr: 116, spo2: 91, bpSys: 148, bpDia: 96, temp: 38.6, task: 'STAT Levetiracetam IV & Continuous EEG' },
      { bedNum: 'Bed 4', name: 'Deepika Rao', age: '1986-01-05', sex: 'F', blood: 'O-', mrn: 'MRN-5004', acuity: 'urgent', condition: 'Multiple Sclerosis Flare', color: 'orange', status: 'occupied', hr: 82, spo2: 98, bpSys: 116, bpDia: 74, temp: 37.0, task: 'High-Dose Methylprednisolone 1g IV' },
      { bedNum: 'Bed 5', name: 'Ranbir Kapoor', age: '1982-09-28', sex: 'M', blood: 'AB+', mrn: 'MRN-5005', acuity: 'stable', condition: 'Guillain-Barré Recovering', color: 'green', status: 'occupied', hr: 70, spo2: 99, bpSys: 120, bpDia: 78, temp: 36.6, task: null },
      { bedNum: 'Bed 6', name: 'Terminal Disinfection', age: null, sex: 'U', blood: 'O+', mrn: 'CLN-5006', acuity: 'non_urgent', condition: 'Isolation Clean', color: 'orange', status: 'cleaning', isCleaning: true, task: 'Isolation Room Terminal Sanitization' },
      { bedNum: 'Bed 7', name: 'Anushka Sharma', age: '1988-05-01', sex: 'F', blood: 'B+', mrn: 'MRN-5007', acuity: 'stable', condition: 'Bell Palsy Improving', color: 'green', status: 'occupied', hr: 72, spo2: 99, bpSys: 114, bpDia: 72, temp: 36.7, task: null },
      { bedNum: 'Bed 8', name: 'Varun Dhawan', age: '1987-04-24', sex: 'M', blood: 'A-', mrn: 'MRN-5008', acuity: 'stable', condition: 'Migraine with Aura', color: 'green', status: 'occupied', hr: 68, spo2: 98, bpSys: 122, bpDia: 76, temp: 36.5, task: null },
      { bedNum: 'Bed 9', name: 'Sara Ali Khan', age: '1995-08-12', sex: 'F', blood: 'O+', mrn: 'MRN-5009', acuity: 'stable', condition: 'Peripheral Neuropathy', color: 'green', status: 'occupied', hr: 76, spo2: 99, bpSys: 118, bpDia: 74, temp: 36.8, task: null },
      { bedNum: 'Bed 10', name: 'Kartik Aaryan', age: '1990-11-22', sex: 'M', blood: 'B-', mrn: 'MRN-5010', acuity: 'urgent', condition: 'Cervical Radiculopathy', color: 'orange', status: 'occupied', hr: 80, spo2: 98, bpSys: 130, bpDia: 82, temp: 36.9, task: 'Physiotherapy & Pain Regimen Review' },
      { bedNum: 'Bed 11', name: 'Janhvi Kapoor', age: '1997-03-06', sex: 'F', blood: 'AB-', mrn: 'MRN-5011', acuity: 'stable', condition: 'Vestibular Neuritis', color: 'green', status: 'occupied', hr: 74, spo2: 100, bpSys: 112, bpDia: 70, temp: 36.6, task: null },
    ],
    6: [
      { bedNum: 'Bed 1', name: 'Ratan Tata', age: '1950-12-28', sex: 'M', blood: 'AB+', mrn: 'MRN-6001', acuity: 'stable', condition: 'Atrial Fibrillation Rate Controlled', color: 'green', status: 'occupied', hr: 78, spo2: 98, bpSys: 128, bpDia: 80, temp: 36.6, task: null },
      { bedNum: 'Bed 2', name: 'Cyrus Mistry', age: '1968-07-04', sex: 'M', blood: 'O+', mrn: 'MRN-6002', acuity: 'urgent', condition: 'Congestive Heart Failure NYHA III', color: 'orange', status: 'occupied', hr: 94, spo2: 94, bpSys: 142, bpDia: 90, temp: 37.1, task: 'IV Furosemide 40mg & Strict Fluid Balance' },
      { bedNum: 'Bed 3', name: 'Kishore Biyani', age: '1961-08-09', sex: 'M', blood: 'A+', mrn: 'MRN-6003', acuity: 'critical', condition: 'STEMI Post-Primary PCI', color: 'red', status: 'occupied', hr: 118, spo2: 90, bpSys: 92, bpDia: 58, temp: 37.6, task: 'STAT Cardiologist Bedside Review & Heparin Titration' },
      { bedNum: 'Bed 4', name: 'Uday Kotak', age: '1959-03-15', sex: 'M', blood: 'B+', mrn: 'MRN-6004', acuity: 'stable', condition: 'Pacemaker Placement Recovery', color: 'green', status: 'occupied', hr: 72, spo2: 99, bpSys: 120, bpDia: 78, temp: 36.7, task: null },
      { bedNum: 'Bed 5', name: 'Terminal Disinfection', age: null, sex: 'U', blood: 'O+', mrn: 'CLN-6005', acuity: 'non_urgent', condition: 'Routine Cleaning', color: 'orange', status: 'cleaning', isCleaning: true, task: 'Clean & Prepare for New Admission' },
      { bedNum: 'Bed 6', name: 'Nandan Nilekani', age: '1955-06-02', sex: 'M', blood: 'O-', mrn: 'MRN-6006', acuity: 'stable', condition: 'Unstable Angina Stabilized', color: 'green', status: 'occupied', hr: 68, spo2: 99, bpSys: 124, bpDia: 80, temp: 36.5, task: null },
      { bedNum: 'Bed 7', name: 'Narayan Murthy', age: '1946-08-20', sex: 'M', blood: 'A-', mrn: 'MRN-6007', acuity: 'urgent', condition: 'Aortic Valve Stenosis Evaluation', color: 'orange', status: 'occupied', hr: 82, spo2: 96, bpSys: 136, bpDia: 82, temp: 36.8, task: 'Echocardiogram Scheduled for 14:00' },
      { bedNum: 'Bed 8', name: 'Sudha Murthy', age: '1950-08-19', sex: 'F', blood: 'B-', mrn: 'MRN-6008', acuity: 'stable', condition: 'Essential Hypertension Managed', color: 'green', status: 'occupied', hr: 70, spo2: 98, bpSys: 126, bpDia: 78, temp: 36.6, task: null },
      { bedNum: 'Bed 9', name: 'Azim Premji', age: '1945-07-24', sex: 'M', blood: 'AB-', mrn: 'MRN-6009', acuity: 'stable', condition: 'Cardiomyopathy Stable', color: 'green', status: 'occupied', hr: 74, spo2: 98, bpSys: 118, bpDia: 76, temp: 36.7, task: null },
      { bedNum: 'Bed 10', name: 'Anand Mahindra', age: '1955-05-01', sex: 'M', blood: 'O+', mrn: 'MRN-6010', acuity: 'urgent', condition: 'Hypertensive Crisis Resolving', color: 'orange', status: 'occupied', hr: 84, spo2: 97, bpSys: 148, bpDia: 94, temp: 37.0, task: 'Titrate Amlodipine & Repeat BP Every 2 Hours' },
      { bedNum: 'Bed 11', name: 'Kumar Birla', age: '1967-06-14', sex: 'M', blood: 'A+', mrn: 'MRN-6011', acuity: 'stable', condition: 'Pericarditis on NSAIDs', color: 'green', status: 'occupied', hr: 72, spo2: 99, bpSys: 122, bpDia: 78, temp: 36.6, task: null },
    ],
    8: [
      { bedNum: 'Bed 1', name: 'Aarav Mehta', age: '1984-04-18', sex: 'M', blood: 'B+', mrn: 'MRN-8001', acuity: 'stable', condition: 'Laparoscopic Cholecystectomy D2', color: 'green', status: 'occupied', hr: 72, spo2: 99, bpSys: 120, bpDia: 78, temp: 36.7, task: null },
      { bedNum: 'Bed 2', name: 'Priya Nambiar', age: '1979-11-25', sex: 'F', blood: 'O+', mrn: 'MRN-8002', acuity: 'urgent', condition: 'Bowel Resection Post-Op Day 1', color: 'orange', status: 'occupied', hr: 90, spo2: 96, bpSys: 132, bpDia: 84, temp: 37.5, task: 'Check Surgical Drain Output & PCA Pump Status' },
      { bedNum: 'Bed 3', name: 'Suresh Raina', age: '1986-11-27', sex: 'M', blood: 'A+', mrn: 'MRN-8003', acuity: 'critical', condition: 'Post-Op Hemorrhagic Shock', color: 'red', status: 'occupied', hr: 128, spo2: 88, bpSys: 84, bpDia: 52, temp: 36.2, task: 'STAT Surgical Reg Review & Cross-Match 4 Units PRBC' },
      { bedNum: 'Bed 4', name: 'Terminal Disinfection', age: null, sex: 'U', blood: 'O+', mrn: 'CLN-8004', acuity: 'non_urgent', condition: 'Bed Cleaning', color: 'orange', status: 'cleaning', isCleaning: true, task: 'Post-Op Bed Sanitization' },
      { bedNum: 'Bed 5', name: 'Rohit Sharma', age: '1987-04-30', sex: 'M', blood: 'AB+', mrn: 'MRN-8005', acuity: 'stable', condition: 'Total Hip Replacement Day 3', color: 'green', status: 'occupied', hr: 76, spo2: 98, bpSys: 124, bpDia: 80, temp: 36.8, task: null },
      { bedNum: 'Bed 6', name: 'Shikhar Dhawan', age: '1985-12-05', sex: 'M', blood: 'O-', mrn: 'MRN-8006', acuity: 'stable', condition: 'Rotator Cuff Repair Post-Op', color: 'green', status: 'occupied', hr: 70, spo2: 99, bpSys: 118, bpDia: 76, temp: 36.5, task: null },
      { bedNum: 'Bed 7', name: 'Hardik Pandya', age: '1993-10-11', sex: 'M', blood: 'B-', mrn: 'MRN-8007', acuity: 'urgent', condition: 'Lumbar Microdiscectomy D1', color: 'orange', status: 'occupied', hr: 84, spo2: 98, bpSys: 128, bpDia: 82, temp: 37.0, task: 'Log-Roll Protocol & Epidural Analgesia Check' },
      { bedNum: 'Bed 8', name: 'Jasprit Bumrah', age: '1993-12-06', sex: 'M', blood: 'A-', mrn: 'MRN-8008', acuity: 'stable', condition: 'Knee ACL Reconstruction D2', color: 'green', status: 'occupied', hr: 68, spo2: 100, bpSys: 116, bpDia: 74, temp: 36.6, task: null },
      { bedNum: 'Bed 9', name: 'Ravindra Jadeja', age: '1988-12-06', sex: 'M', blood: 'AB-', mrn: 'MRN-8009', acuity: 'stable', condition: 'Appendectomy Day 2', color: 'green', status: 'occupied', hr: 74, spo2: 99, bpSys: 122, bpDia: 78, temp: 36.7, task: null },
      { bedNum: 'Bed 10', name: 'Virat Kohli', age: '1988-11-05', sex: 'M', blood: 'O+', mrn: 'MRN-8010', acuity: 'urgent', condition: 'Thyroidectomy Recovery', color: 'orange', status: 'occupied', hr: 82, spo2: 98, bpSys: 130, bpDia: 84, temp: 37.2, task: 'Check Serum Calcium & Vocal Cord Mobility' },
      { bedNum: 'Bed 11', name: 'MS Dhoni', age: '1981-07-07', sex: 'M', blood: 'B+', mrn: 'MRN-8011', acuity: 'stable', condition: 'Knee Meniscus Repair Discharge Ready', color: 'green', status: 'occupied', hr: 64, spo2: 99, bpSys: 120, bpDia: 76, temp: 36.5, task: null },
    ],
  };

  for (const floor of floors) {
    console.log(`Processing Floor ${floor.num}: ${floor.name}...`);
    // Upsert Ward
    const { data: existingWard } = await supabase
      .from('wards')
      .select('id')
      .eq('hospital_id', hospId)
      .eq('code', floor.code)
      .maybeSingle();

    let wardId = existingWard?.id;
    if (!wardId) {
      const { data: newWard } = await supabase
        .from('wards')
        .insert({
          hospital_id: hospId,
          department_id: medDeptId,
          name: floor.name,
          code: floor.code,
          floor_number: floor.num,
          ward_type: floor.type,
          capacity: 11,
          active: true
        })
        .select('id')
        .single();
      wardId = newWard?.id;
    }

    if (!wardId) {
      console.warn('Could not get ward id for', floor.name);
      continue;
    }

    // Rooms for this floor
    const roomSpecs = [
      { num: `${floor.num}01`, type: 'double', cap: 3 },
      { num: `${floor.num}02`, type: 'double', cap: 2 },
      { num: `${floor.num}03`, type: 'isolation', cap: 2 },
      { num: `${floor.num}04`, type: 'standard', cap: 1 },
      { num: `${floor.num}05`, type: 'standard', cap: 3 },
      { num: `${floor.num}06`, type: 'step_down', cap: 2 },
    ];

    const roomMap = {};
    for (const rs of roomSpecs) {
      const { data: existingRm } = await supabase
        .from('rooms')
        .select('id, room_number')
        .eq('ward_id', wardId)
        .eq('room_number', rs.num)
        .maybeSingle();

      if (existingRm) {
        roomMap[rs.num] = existingRm.id;
      } else {
        const { data: newRm } = await supabase
          .from('rooms')
          .insert({
            ward_id: wardId,
            department_id: medDeptId,
            room_number: rs.num,
            room_type: rs.type,
            floor_number: floor.num,
            capacity: rs.cap,
            active: true
          })
          .select('id, room_number')
          .single();
        if (newRm) roomMap[rs.num] = newRm.id;
      }
    }

    const bedToRoom = {
      'Bed 1': `${floor.num}01`,
      'Bed 5': `${floor.num}01`,
      'Bed 6': `${floor.num}01`,
      'Bed 7': `${floor.num}02`,
      'Bed 8': `${floor.num}02`,
      'Bed 2': `${floor.num}03`,
      'Bed 9': `${floor.num}03`,
      'Bed 3': `${floor.num}04`,
      'Bed 4': `${floor.num}05`,
      'Bed 10': `${floor.num}05`,
      'Bed 11': `${floor.num}05`,
    };

    const patients = floorPatientData[floor.num] || floorPatientData[7];

    for (const p of patients) {
      let patientId = null;

      if (!p.isCleaning) {
        const [firstName, ...lastNames] = p.name.split(' ');
        const lastName = lastNames.join(' ') || 'Patient';

        const { data: existingPat } = await supabase
          .from('patients')
          .select('id')
          .eq('hospital_id', hospId)
          .eq('medical_record_number', p.mrn)
          .maybeSingle();

        if (existingPat) {
          patientId = existingPat.id;
          await supabase.from('patients').update({
            first_name: firstName,
            last_name: lastName,
            acuity: p.acuity,
            status: 'admitted'
          }).eq('id', patientId);
        } else {
          const { data: newPat } = await supabase
            .from('patients')
            .insert({
              hospital_id: hospId,
              medical_record_number: p.mrn,
              first_name: firstName,
              last_name: lastName,
              date_of_birth: p.age || '1980-01-01',
              sex: p.sex,
              blood_type: p.blood,
              acuity: p.acuity,
              status: 'admitted'
            })
            .select('id')
            .single();
          patientId = newPat?.id;
        }

        if (patientId) {
          // Condition
          await supabase.from('patient_conditions').delete().eq('patient_id', patientId);
          await supabase.from('patient_conditions').insert({
            patient_id: patientId,
            code: p.condition.slice(0, 8).toUpperCase().replace(/\s+/g, '-'),
            name: p.condition,
            severity: p.acuity === 'critical' ? 'severe' : p.acuity === 'urgent' ? 'moderate' : 'mild',
          });

          // Vitals
          if (p.hr) {
            await supabase.from('vitals').insert({
              patient_id: patientId,
              heart_rate: p.hr,
              spo2: p.spo2,
              systolic_bp: p.bpSys,
              diastolic_bp: p.bpDia,
              temperature: p.temp,
              respiratory_rate: p.hr > 110 ? 24 : 16,
              recorded_at: new Date().toISOString()
            });
          }
        }
      }

      // Upsert Bed
      const roomNum = bedToRoom[p.bedNum] || `${floor.num}01`;
      const roomId = roomMap[roomNum];

      const { data: existingBed } = await supabase
        .from('beds')
        .select('id')
        .eq('room_id', roomId)
        .eq('bed_number', p.bedNum)
        .maybeSingle();

      let bedId = existingBed?.id;
      if (bedId) {
        await supabase.from('beds').update({
          status: p.status,
          current_patient_id: patientId,
          isolation_capable: p.bedNum === 'Bed 2',
          oxygen_available: true,
          monitor_available: p.acuity === 'critical'
        }).eq('id', bedId);
      } else {
        const { data: newBed } = await supabase
          .from('beds')
          .insert({
            room_id: roomId,
            bed_number: p.bedNum,
            bed_type: p.bedNum === 'Bed 3' ? 'icu_step_down' : 'standard',
            status: p.status,
            isolation_capable: p.bedNum === 'Bed 2',
            oxygen_available: true,
            monitor_available: p.acuity === 'critical',
            current_patient_id: patientId
          })
          .select('id')
          .single();
        bedId = newBed?.id;
      }

      // Tasks
      if (p.task && patientId) {
        await supabase.from('tasks').insert({
          hospital_id: hospId,
          patient_id: patientId,
          title: p.task,
          task_type: p.isCleaning ? 'cleaning' : p.acuity === 'critical' ? 'medical' : 'nursing',
          priority: p.acuity === 'critical' ? 'stat' : p.acuity === 'urgent' ? 'urgent' : 'routine',
          urgency: p.acuity === 'critical' ? 'stat' : 'urgent',
          status: 'in_progress',
          due_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });
      }

      // Cleaning job if cleaning
      if (p.isCleaning && bedId) {
        await supabase.from('cleaning_jobs').insert({
          bed_id: bedId,
          status: 'in_progress',
          cleaning_type: 'terminal',
          started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
        });
      }
    }
  }

  // 4. Expand Clinical Staff Directory
  console.log('Seeding expanded Clinical Staff Directory...');
  const staffList = [
    { num: 'EMP-101', first: 'Priya', last: 'Sharma', display: 'Nurse Priya Sharma', role: 'nurse', status: 'busy', onDuty: true, phone: '+91-98765-43210', email: 'priya.sharma@warden.hospital', skills: ['ICU Telemetry', 'Medication Specialist', 'Pediatric BLS'] },
    { num: 'EMP-102', first: 'Rahul', last: 'Verma', display: 'Nurse Rahul Verma', role: 'nurse', status: 'active', onDuty: true, phone: '+91-98765-43211', email: 'rahul.verma@warden.hospital', skills: ['Phlebotomy Expert', 'Emergency Response', 'Wound Care'] },
    { num: 'EMP-103', first: 'Sunita', last: 'Patel', display: 'Nurse Sunita Patel', role: 'nurse', status: 'active', onDuty: true, phone: '+91-98765-43215', email: 'sunita.patel@warden.hospital', skills: ['Post-Op Surgical Care', 'IV Cannulation', 'Pain Management'] },
    { num: 'EMP-104', first: 'David', last: 'Chen', display: 'Nurse David Chen', role: 'nurse', status: 'on_break', onDuty: true, phone: '+91-98765-43216', email: 'david.chen@warden.hospital', skills: ['Triage / Rapid Response', 'Airway Management', 'ACLS'] },
    { num: 'EMP-201', first: 'Alok', last: 'Shah', display: 'Dr. Alok Shah', role: 'doctor', status: 'busy', onDuty: true, phone: '+91-98765-43212', email: 'dr.shah@warden.hospital', skills: ['Cardiology Specialist', 'Interventional PCI', 'Critical Care'] },
    { num: 'EMP-202', first: 'Elena', last: 'Rostova', display: 'Dr. Elena Rostova', role: 'doctor', status: 'active', onDuty: true, phone: '+91-98765-43217', email: 'dr.rostova@warden.hospital', skills: ['Pulmonology Specialist', 'Mechanical Ventilation', 'Infectious Diseases'] },
    { num: 'EMP-203', first: 'Marcus', last: 'Vance', display: 'Dr. Marcus Vance', role: 'doctor', status: 'off_duty', onDuty: false, phone: '+91-98765-43218', email: 'dr.vance@warden.hospital', skills: ['General & Trauma Surgery', 'Laparoscopy', 'Wound Reconstruction'] },
    { num: 'EMP-301', first: 'Arjun', last: 'Patel', display: 'Porter Arjun Patel', role: 'porter', status: 'active', onDuty: true, phone: '+91-98765-43213', email: 'arjun.porter@warden.hospital', skills: ['Patient Stretcher Transport', 'Oxygen Cylinder Transfer', 'Wheelchair Escort'] },
    { num: 'EMP-401', first: 'Sunita', last: 'Rao', display: 'Sunita Rao (Night Coordinator)', role: 'warden', status: 'active', onDuty: true, phone: '+91-98765-43214', email: 'sunita.coordinator@warden.hospital', skills: ['Ward Operations', 'Bed Handoff Protocol', 'Crisis Coordination'] },
    { num: 'EMP-501', first: 'Maya', last: 'Lin', display: 'Pharm. Maya Lin', role: 'pharmacist', status: 'active', onDuty: true, phone: '+91-98765-43219', email: 'maya.pharm@warden.hospital', skills: ['Clinical Pharmacotherapy', 'Anticoagulation Dosing', 'Chemo Dispensing'] },
    { num: 'EMP-601', first: 'Ramesh', last: 'Nair', display: 'Tech Ramesh Nair', role: 'technician', status: 'busy', onDuty: true, phone: '+91-98765-43220', email: 'ramesh.tech@warden.hospital', skills: ['12-Lead ECG Acquisition', 'Bedside Ultrasound Fast Track', 'Telemetry Holter'] }
  ];

  for (const s of staffList) {
    const { data: existingStaff } = await supabase
      .from('staff')
      .select('id')
      .eq('hospital_id', hospId)
      .eq('employee_number', s.num)
      .maybeSingle();

    let staffId = existingStaff?.id;
    if (staffId) {
      await supabase.from('staff').update({
        first_name: s.first,
        last_name: s.last,
        display_name: s.display,
        role: s.role,
        department_id: medDeptId,
        phone: s.phone,
        email: s.email,
        status: s.status,
        is_on_duty: s.onDuty
      }).eq('id', staffId);
    } else {
      const { data: newStaff } = await supabase
        .from('staff')
        .insert({
          hospital_id: hospId,
          employee_number: s.num,
          first_name: s.first,
          last_name: s.last,
          display_name: s.display,
          role: s.role,
          department_id: medDeptId,
          phone: s.phone,
          email: s.email,
          status: s.status,
          is_on_duty: s.onDuty
        })
        .select('id')
        .single();
      staffId = newStaff?.id;
    }

    if (staffId) {
      await supabase.from('staff_skills').delete().eq('staff_id', staffId);
      for (const skill of s.skills) {
        await supabase.from('staff_skills').insert({
          staff_id: staffId,
          skill_code: skill,
          proficiency: 'expert',
          certified: true
        });
      }
    }
  }

  // 5. Seed Medications for Pharmacy Screen
  console.log('Seeding Pharmacy Medications...');
  const medsList = [
    { name: 'Cetirizine 10mg', generic: 'Cetirizine Hydrochloride', strength: '10mg', form: 'Oral Tablet' },
    { name: 'Benadryl', generic: 'Diphenhydramine HCl', strength: '25mg/5ml', form: 'Oral Elixir' },
    { name: 'Ibuprofen 400mg', generic: 'Ibuprofen', strength: '400mg', form: 'Film-Coated Tablet' },
    { name: 'Amoxicillin 500mg', generic: 'Amoxicillin Trihydrate', strength: '500mg', form: 'Capsule' },
    { name: 'Rocephin', generic: 'Ceftriaxone', strength: '1g', form: 'IV Injection' },
    { name: 'Dolo 650', generic: 'Paracetamol', strength: '650mg', form: 'Oral Tablet' },
    { name: 'Ventolin', generic: 'Salbutamol', strength: '2.5mg/3ml', form: 'Nebulizer Solution' },
  ];

  for (const m of medsList) {
    const { data: existingMed } = await supabase
      .from('medications')
      .select('id')
      .eq('name', m.name)
      .maybeSingle();

    if (!existingMed) {
      await supabase.from('medications').insert({
        name: m.name,
        generic_name: m.generic,
        strength: m.strength,
        form: m.form
      });
    }
  }

  console.log('Floors, beds, patients, staff, and pharmacy seed complete!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
