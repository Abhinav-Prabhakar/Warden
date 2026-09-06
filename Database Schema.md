# Database Schema
Absolutely. I’d design this as a **live hospital operations database**, rather than simply a patient database.
The key architectural decision is:
**Patients are entities. Tasks, events, assignments, resources, communications, queues, and state changes are first-class entities.**
That lets Warden answer things like *“What is happening to Bed 18 right now?”*, *“Why is this delayed?”*, *“Who should I call?”*, and *“What changed since I started speaking?”* without having to reconstruct everything from one giant patient table.
For a Supabase/Postgres implementation, I’d use UUID primary keys, timestamptz for all timestamps, foreign keys everywhere, and indexes around the live operational queries. Supabase's guidance also recommends RLS for exposed tables and careful authorization rather than treating authenticated as sufficient access control.

# 0. The overall model
I'd split the database into **12 domains**:
ORGANIZATION
├── hospitals
├── wards
├── rooms
├── beds
└── departments

PEOPLE
├── staff
├── staff_shifts
├── staff_skills
├── staff_locations
└── contacts

PATIENTS
├── patients
├── patient_contacts
├── patient_conditions
├── patient_allergies
├── patient_medications
└── patient_preferences

CLINICAL STATE
├── vitals
├── lab_orders
├── lab_results
├── procedures
├── clinical_notes
└── patient_events

BED / MOVEMENT
├── bed_assignments
├── patient_transfers
├── discharge_plans
└── cleaning_jobs

TASKS
├── tasks
├── task_assignments
├── task_dependencies
└── task_events

RESOURCES
├── resource_types
├── resources
├── resource_assignments
├── inventory_items
└── inventory_transactions

TRANSPORT
├── transport_requests
├── transport_resources
└── transport_events

COMMUNICATION
├── communication_contacts
├── communication_attempts
├── notifications
└── escalations

FACILITIES
├── equipment
├── facility_requests
├── elevators
├── maintenance_jobs
└── incidents

QUEUES / AUTOMATION
├── print_jobs
├── dispatch_queue
├── notification_queue
├── automation_jobs
└── system_alerts

AUDIT / REAL-TIME STATE
├── patient_events
├── system_events
├── warden_actions
└── state_snapshots
There are some deliberately overlapping concepts here. That's okay. **Operational systems benefit from an append-only event history rather than trying to derive everything from mutable current-state fields.**

# 1. Organization
# hospitals
id                  UUID PK
name                TEXT
code                TEXT UNIQUE
timezone            TEXT
address             JSONB
phone               TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
# departments
Examples: Emergency, ICU, Radiology, Pharmacy, Laboratory.
id                  UUID PK
hospital_id         UUID FK → hospitals
name                TEXT
code                TEXT
department_type     TEXT
floor_number        INTEGER
phone               TEXT
active              BOOLEAN
created_at          TIMESTAMPTZ
# wards
id                  UUID PK
hospital_id         UUID FK → hospitals
department_id       UUID FK → departments
name                TEXT
code                TEXT
floor_number        INTEGER
ward_type           TEXT
capacity             INTEGER
active              BOOLEAN
created_at          TIMESTAMPTZ

# 2. Physical hospital
You want Warden to understand the hospital as a **graph**, not just a collection of rooms.
# rooms
id                  UUID PK
ward_id             UUID FK → wards NULL
department_id       UUID FK → departments NULL
room_number         TEXT
room_type           TEXT
floor_number        INTEGER
isolation_capable   BOOLEAN
capacity            INTEGER
latitude            DOUBLE PRECISION NULL
longitude           DOUBLE PRECISION NULL
active              BOOLEAN
# beds
id                  UUID PK
room_id             UUID FK → rooms
bed_number          TEXT
bed_type            TEXT
status              TEXT
isolation_capable   BOOLEAN
oxygen_available    BOOLEAN
ventilator_capable  BOOLEAN
monitor_available   BOOLEAN
current_patient_id  UUID FK → patients NULL
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
status:
available
occupied
reserved
cleaning
maintenance
blocked
### Important
current_patient_id is a **cache of current state**, while the authoritative history lives in bed_assignments.

# 3. Hospital navigation graph
This is worth doing because you explicitly want indoor navigation.
# navigation_nodes
id                  UUID PK
hospital_id         UUID FK → hospitals
floor_number        INTEGER
node_type           TEXT
x                   DOUBLE PRECISION
y                   DOUBLE PRECISION
room_id             UUID FK → rooms NULL
name                TEXT NULL
Node types:
corridor
room
elevator
stairs
entrance
department
junction
# navigation_edges
id                  UUID PK
from_node_id        UUID FK → navigation_nodes
to_node_id          UUID FK → navigation_nodes
distance_meters     NUMERIC
estimated_seconds   INTEGER
accessible          BOOLEAN
blocked             BOOLEAN
Now Warden can calculate:
nurse → Bed 18 → pharmacy → Bed 22
rather than just giving directions.

# 4. Staff
# staff
id                  UUID PK
auth_user_id        UUID UNIQUE
hospital_id         UUID FK → hospitals
employee_number     TEXT UNIQUE
first_name          TEXT
last_name           TEXT
display_name        TEXT
role                TEXT
department_id       UUID FK → departments NULL
phone               TEXT
email               TEXT
status              TEXT
is_on_duty          BOOLEAN
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
Roles:
nurse
doctor
carer
warden
porter
clerk
pharmacist
technician
facility_staff
administrator
# staff_shifts
id                  UUID PK
staff_id            UUID FK → staff
ward_id             UUID FK → wards NULL
department_id       UUID FK → departments NULL
shift_start         TIMESTAMPTZ
shift_end           TIMESTAMPTZ
status              TEXT
# staff_skills
id                  UUID PK
staff_id            UUID FK → staff
skill_code          TEXT
proficiency         TEXT
certified           BOOLEAN
expires_at          TIMESTAMPTZ NULL
Examples:
icu
pediatric
transport
phlebotomy
medication
ventilator
emergency_response
# staff_locations
Don't overwrite the history.
id                  UUID PK
staff_id            UUID FK → staff
navigation_node_id  UUID FK → navigation_nodes
recorded_at          TIMESTAMPTZ
source               TEXT
accuracy_meters     NUMERIC NULL
Then maintain a fast current-location cache:
# staff_current_locations
staff_id            UUID PK FK → staff
navigation_node_id  UUID FK → navigation_nodes
updated_at          TIMESTAMPTZ

# 5. Patients
# patients
id                  UUID PK
hospital_id         UUID FK → hospitals
medical_record_number TEXT UNIQUE
first_name          TEXT
last_name           TEXT
date_of_birth       DATE
sex                 TEXT
blood_type          TEXT
admission_at        TIMESTAMPTZ
discharge_at        TIMESTAMPTZ NULL
status              TEXT
acuity              TEXT
language            TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
Status:
admitted
observation
discharged
transferred
deceased

# 6. Patient contacts / family
# contacts
id                  UUID PK
first_name          TEXT
last_name           TEXT
phone               TEXT
email               TEXT
preferred_language  TEXT
created_at          TIMESTAMPTZ
# patient_contacts
id                  UUID PK
patient_id          UUID FK → patients
contact_id          UUID FK → contacts
relationship        TEXT
priority             INTEGER
is_primary          BOOLEAN
can_receive_updates BOOLEAN
communication_notes TEXT
This lets Warden know:
"Call the patient's daughter."
without hardcoding family members into the patient row.

# 7. Patient clinical data
# patient_conditions
id                  UUID PK
patient_id          UUID FK → patients
code                TEXT
name                TEXT
status              TEXT
severity            TEXT
onset_date          DATE NULL
resolved_at         TIMESTAMPTZ NULL
# patient_allergies
id                  UUID PK
patient_id          UUID FK → patients
allergen            TEXT
reaction            TEXT
severity            TEXT
verified             BOOLEAN
# patient_preferences
id                  UUID PK
patient_id          UUID FK → patients
food_preferences    JSONB
dietary_restrictions JSONB
mobility_notes      TEXT
communication_preferences JSONB
other_preferences   JSONB

# 8. Vitals
# vitals
id                  UUID PK
patient_id          UUID FK → patients
recorded_by         UUID FK → staff
recorded_at         TIMESTAMPTZ
heart_rate          NUMERIC
respiratory_rate    NUMERIC
spo2                NUMERIC
temperature         NUMERIC
systolic_bp         NUMERIC
diastolic_bp        NUMERIC
pain_score          NUMERIC
weight_kg           NUMERIC NULL
raw_data            JSONB NULL
Do **not** store only the latest vitals. You need the time series.

# 9. Medications
# medications
id                  UUID PK
name                TEXT
generic_name        TEXT
strength            TEXT
form                TEXT
# patient_medications
id                  UUID PK
patient_id          UUID FK → patients
medication_id       UUID FK → medications
dose                TEXT
route               TEXT
frequency           TEXT
scheduled_at        TIMESTAMPTZ
start_at            TIMESTAMPTZ
end_at              TIMESTAMPTZ NULL
status              TEXT
prescribed_by       UUID FK → staff
# medication_administrations
id                  UUID PK
patient_medication_id UUID FK → patient_medications
administered_by     UUID FK → staff
scheduled_at        TIMESTAMPTZ
administered_at     TIMESTAMPTZ NULL
status              TEXT
dose_given          TEXT NULL
notes               TEXT
This lets Warden identify:
**Medication due → not administered → overdue.**

# 10. Labs
# lab_orders
id                  UUID PK
patient_id          UUID FK → patients
ordered_by          UUID FK → staff
department_id       UUID FK → departments
test_code           TEXT
test_name           TEXT
priority             TEXT
ordered_at          TIMESTAMPTZ
scheduled_at        TIMESTAMPTZ NULL
status              TEXT
# lab_results
id                  UUID PK
lab_order_id        UUID FK → lab_orders
result_code         TEXT
result_name         TEXT
value               TEXT
numeric_value       NUMERIC NULL
unit                TEXT NULL
reference_range     TEXT NULL
abnormal_flag       TEXT NULL
resulted_at         TIMESTAMPTZ
reviewed_at         TIMESTAMPTZ NULL
reviewed_by         UUID FK → staff NULL

# 11. Procedures
# procedures
id                  UUID PK
patient_id          UUID FK → patients
department_id       UUID FK → departments
procedure_code      TEXT
procedure_name      TEXT
priority            TEXT
scheduled_at        TIMESTAMPTZ NULL
started_at          TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
status              TEXT
assigned_staff_id   UUID FK → staff NULL
notes               TEXT

# 12. Bed assignments
# bed_assignments
id                  UUID PK
patient_id          UUID FK → patients
bed_id              UUID FK → beds
assigned_at         TIMESTAMPTZ
released_at         TIMESTAMPTZ NULL
assigned_by         UUID FK → staff
reason              TEXT
This gives you the patient's entire bed history.

# 13. Patient transfers
# patient_transfers
id                  UUID PK
patient_id          UUID FK → patients
from_bed_id         UUID FK → beds NULL
to_bed_id           UUID FK → beds NULL
from_department_id  UUID FK → departments NULL
to_department_id    UUID FK → departments NULL
requested_by        UUID FK → staff
transport_request_id UUID FK → transport_requests NULL
requested_at        TIMESTAMPTZ
started_at          TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
status              TEXT
reason              TEXT

# 14. Discharge
# discharge_plans
id                  UUID PK
patient_id          UUID FK → patients
planned_discharge_at TIMESTAMPTZ NULL
medically_cleared_at TIMESTAMPTZ NULL
cleared_by          UUID FK → staff NULL
medications_ready   BOOLEAN
paperwork_complete  BOOLEAN
family_notified     BOOLEAN
transport_arranged  BOOLEAN
belongings_ready    BOOLEAN
bed_cleaning_requested BOOLEAN
status              TEXT
notes               TEXT
This gives you a state machine for discharge.

# 15. Tasks — probably the most important operational table
# tasks
id                  UUID PK
hospital_id         UUID FK → hospitals
patient_id          UUID FK → patients NULL
created_by          UUID FK → staff NULL
task_type           TEXT
title               TEXT
description         TEXT
priority            INTEGER
urgency             TEXT
status              TEXT
due_at              TIMESTAMPTZ NULL
started_at          TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
cancelled_at        TIMESTAMPTZ NULL
source              TEXT
created_at          TIMESTAMPTZ
updated_at          TIMESTAMPTZ
Task types:
patient_check
medication
transport
doctor_review
lab_collection
family_call
discharge
cleaning
maintenance
inventory
handoff
printing
facility
emergency

# 16. Task assignments
Don't put assigned_staff_id directly on tasks only.
You need assignment history.
# task_assignments
id                  UUID PK
task_id             UUID FK → tasks
staff_id            UUID FK → staff
assigned_at         TIMESTAMPTZ
accepted_at         TIMESTAMPTZ NULL
started_at          TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
declined_at         TIMESTAMPTZ NULL
decline_reason      TEXT NULL
assignment_role     TEXT
Now Warden can know:
"I assigned this to Priya, she declined, then Arjun accepted it."

# 17. Task dependencies
This is **very important** for orchestration.
# task_dependencies
id                  UUID PK
task_id             UUID FK → tasks
depends_on_task_id  UUID FK → tasks
dependency_type     TEXT
Example:
clean bed
      ↓
assign bed
      ↓
transport patient
Or:
doctor clears discharge
      ↓
pharmacy prepares medication
      ↓
family notified
      ↓
transport arranged
      ↓
discharge
This is how Warden can answer:
**"Why isn't Bed 18 ready?"**

# 18. Task events
# task_events
id                  UUID PK
task_id             UUID FK → tasks
event_type          TEXT
actor_staff_id      UUID FK → staff NULL
metadata            JSONB
created_at          TIMESTAMPTZ
Events:
created
assigned
accepted
started
paused
completed
cancelled
escalated
reassigned
failed

# 19. Transport
# transport_resources
id                  UUID PK
hospital_id         UUID FK → hospitals
resource_type       TEXT
identifier          TEXT
capacity             INTEGER
location_node_id    UUID FK → navigation_nodes NULL
status              TEXT
Types:
wheelchair
stretcher
bed
porter_team
ambulance
# transport_requests
id                  UUID PK
patient_id          UUID FK → patients
requested_by        UUID FK → staff
pickup_location_id  UUID FK → navigation_nodes
destination_id      UUID FK → navigation_nodes
transport_type      TEXT
priority            INTEGER
required_at         TIMESTAMPTZ
status              TEXT
assigned_resource_id UUID FK → transport_resources NULL
assigned_staff_id   UUID FK → staff NULL
created_at          TIMESTAMPTZ
started_at          TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
# transport_events
id                  UUID PK
transport_request_id UUID FK → transport_requests
event_type          TEXT
location_node_id    UUID FK → navigation_nodes NULL
actor_staff_id      UUID FK → staff NULL
created_at          TIMESTAMPTZ
metadata            JSONB

# 20. Resource management
I'd generalize equipment instead of making 50 tables.
# resource_types
id                  UUID PK
name                TEXT
category            TEXT
description         TEXT
requires_tracking   BOOLEAN
Examples:
iv_pump
oxygen_cylinder
monitor
ventilator
wheelchair
stretcher
crash_cart
# resources
id                  UUID PK
resource_type_id    UUID FK → resource_types
hospital_id         UUID FK → hospitals
asset_number        TEXT UNIQUE
serial_number      TEXT NULL
status              TEXT
location_node_id    UUID FK → navigation_nodes NULL
department_id       UUID FK → departments NULL
last_maintenance_at TIMESTAMPTZ NULL
next_maintenance_at TIMESTAMPTZ NULL
# resource_assignments
id                  UUID PK
resource_id         UUID FK → resources
patient_id          UUID FK → patients NULL
staff_id            UUID FK → staff NULL
task_id             UUID FK → tasks NULL
assigned_at         TIMESTAMPTZ
released_at         TIMESTAMPTZ NULL

# 21. Inventory
# inventory_items
id                  UUID PK
hospital_id         UUID FK → hospitals
department_id       UUID FK → departments
item_code           TEXT
name                TEXT
category            TEXT
unit                TEXT
quantity_on_hand    NUMERIC
reorder_threshold   NUMERIC
reorder_quantity    NUMERIC
supplier             TEXT NULL
# inventory_transactions
id                  UUID PK
inventory_item_id   UUID FK → inventory_items
transaction_type    TEXT
quantity            NUMERIC
performed_by        UUID FK → staff NULL
patient_id          UUID FK → patients NULL
reference_id        UUID NULL
created_at          TIMESTAMPTZ
notes               TEXT
Transactions:
received
dispensed
consumed
returned
wasted
adjusted
transferred

# 22. Facilities
# facility_requests
id                  UUID PK
hospital_id         UUID FK → hospitals
location_node_id    UUID FK → navigation_nodes
reported_by         UUID FK → staff
category            TEXT
title               TEXT
description         TEXT
priority             INTEGER
status              TEXT
created_at          TIMESTAMPTZ
resolved_at         TIMESTAMPTZ NULL
Examples:
broken_elevator
broken_light
water
temperature
equipment_failure
cleaning
maintenance
# maintenance_jobs
id                  UUID PK
facility_request_id UUID FK → facility_requests
assigned_staff_id   UUID FK → staff NULL
scheduled_at        TIMESTAMPTZ NULL
started_at          TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
status              TEXT
notes               TEXT

# 23. Elevators
# elevators
id                  UUID PK
hospital_id         UUID FK → hospitals
name                TEXT
status              TEXT
current_floor       INTEGER
capacity_kg         INTEGER
accessible           BOOLEAN
# elevator_events
id                  UUID PK
elevator_id         UUID FK → elevators
event_type          TEXT
from_floor          INTEGER NULL
to_floor            INTEGER NULL
created_at          TIMESTAMPTZ
metadata            JSONB

# 24. Cleaning
# cleaning_jobs
id                  UUID PK
bed_id              UUID FK → beds
requested_at        TIMESTAMPTZ
assigned_to         UUID FK → staff NULL
started_at          TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL
status              TEXT
priority             INTEGER
Now discharge can trigger:
discharge complete
        ↓
cleaning_jobs INSERT
        ↓
task INSERT
        ↓
warden dispatch
        ↓
bed.status = cleaning
        ↓
cleaning complete
        ↓
bed.status = available

# 25. Communication
This needs to be much more structured than simply phone_number.
# communication_contacts
id                  UUID PK
contact_type        TEXT
staff_id            UUID FK → staff NULL
patient_contact_id  UUID FK → patient_contacts NULL
phone               TEXT NULL
email               TEXT NULL
preferred_channel   TEXT
available_from      TIME NULL
available_until     TIME NULL
active              BOOLEAN
# communication_attempts
id                  UUID PK
initiated_by        UUID FK → staff NULL
contact_id          UUID FK → communication_contacts
patient_id          UUID FK → patients NULL
channel             TEXT
purpose             TEXT
urgency             TEXT
started_at          TIMESTAMPTZ
answered_at         TIMESTAMPTZ NULL
ended_at            TIMESTAMPTZ NULL
outcome             TEXT
summary             TEXT
This allows:
"Who have we already called about Bed 18?"

# 26. Escalation
# escalations
id                  UUID PK
patient_id          UUID FK → patients NULL
task_id             UUID FK → tasks NULL
trigger_type        TEXT
severity            TEXT
current_level       INTEGER
status              TEXT
created_at          TIMESTAMPTZ
resolved_at         TIMESTAMPTZ NULL
# escalation_steps
id                  UUID PK
escalation_id       UUID FK → escalations
level                INTEGER
staff_id             UUID FK → staff
contact_attempt_id  UUID FK → communication_attempts NULL
response_deadline   TIMESTAMPTZ
responded_at        TIMESTAMPTZ NULL
status              TEXT
So:
Nurse
 ↓ no response
Senior nurse
 ↓ no response
Doctor
 ↓ no response
On-call physician

# 27. Notifications
# notifications
id                  UUID PK
recipient_staff_id  UUID FK → staff NULL
recipient_contact_id UUID FK → contacts NULL
patient_id          UUID FK → patients NULL
type                TEXT
title               TEXT
body                TEXT
priority             INTEGER
status               TEXT
created_at          TIMESTAMPTZ
sent_at             TIMESTAMPTZ NULL
read_at             TIMESTAMPTZ NULL
expires_at          TIMESTAMPTZ NULL
metadata             JSONB

# 28. The queues
**Yes — absolutely make these explicit.**
Don't rely entirely on application-side queues.

# dispatch_queue
For Warden's work assignment engine.
id                  UUID PK
task_id             UUID FK → tasks
priority             INTEGER
queued_at            TIMESTAMPTZ
available_after      TIMESTAMPTZ
status               TEXT
candidate_staff_ids UUID[] NULL
selected_staff_id   UUID FK → staff NULL
attempt_count       INTEGER
last_attempt_at     TIMESTAMPTZ NULL
locked_at            TIMESTAMPTZ NULL
completed_at        TIMESTAMPTZ NULL

# 29. Cloud printer queue
**Definitely give this its own table.**
# printers
id                  UUID PK
hospital_id         UUID FK → hospitals
department_id       UUID FK → departments NULL
name                TEXT
location_node_id    UUID FK → navigation_nodes
printer_type        TEXT
status              TEXT
supports_color      BOOLEAN
supports_duplex     BOOLEAN
active              BOOLEAN
# print_jobs
id                  UUID PK
printer_id          UUID FK → printers
requested_by        UUID FK → staff
patient_id          UUID FK → patients NULL
task_id             UUID FK → tasks NULL

document_type       TEXT
document_title      TEXT
storage_path        TEXT

copies              INTEGER
duplex              BOOLEAN
color               BOOLEAN

priority             INTEGER
status               TEXT

queued_at            TIMESTAMPTZ
started_at           TIMESTAMPTZ NULL
completed_at         TIMESTAMPTZ NULL
failed_at            TIMESTAMPTZ NULL

attempt_count       INTEGER
error_message       TEXT NULL
metadata             JSONB
Status:
queued
printing
completed
failed
cancelled
Warden can literally say:
"The discharge summary is in the print queue. Printer 3 is currently busy; it's third in line."

# 30. Notification queue
# notification_queue
id                  UUID PK
notification_id     UUID FK → notifications
channel             TEXT
priority             INTEGER
scheduled_at         TIMESTAMPTZ
status               TEXT
attempt_count       INTEGER
last_attempt_at     TIMESTAMPTZ NULL
error_message       TEXT NULL
Channels:
push
sms
email
voice
internal

# 31. Automation queue
For things Warden decides to execute asynchronously.
# automation_jobs
id                  UUID PK
job_type             TEXT
patient_id           UUID FK → patients NULL
task_id              UUID FK → tasks NULL
payload              JSONB
priority             INTEGER
status               TEXT
scheduled_at         TIMESTAMPTZ
started_at            TIMESTAMPTZ NULL
completed_at         TIMESTAMPTZ NULL
attempt_count        INTEGER
error_message        TEXT NULL

# 32. Patient event stream
This is one of the **most important tables in the whole system**.
# patient_events
id                  UUID PK
patient_id          UUID FK → patients
event_type           TEXT
actor_type           TEXT
actor_id             UUID NULL
timestamp            TIMESTAMPTZ
severity             TEXT NULL
source               TEXT
metadata             JSONB
Examples:
admitted
bed_assigned
vital_recorded
vital_changed
medication_ordered
medication_administered
lab_ordered
lab_resulted
lab_reviewed
procedure_scheduled
procedure_completed
doctor_notified
family_contacted
transport_requested
transport_started
transport_completed
transferred
discharge_planned
discharged
This becomes Warden's **timeline / institutional memory**.

# 33. System event stream
# system_events
id                  UUID PK
event_type           TEXT
entity_type          TEXT
entity_id            UUID
actor_type           TEXT
actor_id             UUID NULL
timestamp            TIMESTAMPTZ
metadata             JSONB
Examples:
elevator_failed
printer_offline
bed_cleaned
inventory_low
staff_shift_started
staff_shift_ended
equipment_unavailable
ct_delayed

# 34. Warden's own actions
This is essential for accountability.
# warden_actions
id                  UUID PK
session_id           UUID
staff_id             UUID
action_type          TEXT
target_type          TEXT
target_id            UUID NULL

user_command         TEXT
interpreted_intent   JSONB
decision_reason      TEXT
proposed_action      JSONB

confirmation_required BOOLEAN
confirmed             BOOLEAN NULL

executed              BOOLEAN
execution_result      JSONB NULL

created_at            TIMESTAMPTZ
completed_at          TIMESTAMPTZ NULL
For example:
user_command:
"Get Bed 18 to CT."

interpreted_intent:
{
  "patient": "Bed 18",
  "destination": "CT",
  "priority": "normal"
}

proposed_action:
{
  "transport": "...",
  "porter": "...",
  "route": "..."
}
Then if the CT suddenly becomes unavailable, you have the original decision **and** the new decision.

# 35. Warden sessions
# warden_sessions
id                  UUID PK
staff_id             UUID FK → staff
started_at           TIMESTAMPTZ
ended_at             TIMESTAMPTZ NULL
device_id            TEXT NULL
context              JSONB

# 36. Conversations
Since this is fundamentally a voice agent:
# voice_interactions
id                  UUID PK
session_id           UUID FK → warden_sessions
staff_id             UUID FK → staff
started_at           TIMESTAMPTZ
ended_at             TIMESTAMPTZ
transcript           TEXT
intent               JSONB
entities             JSONB
confidence           NUMERIC
interrupted          BOOLEAN
interruption_reason  TEXT NULL
You can then study:
What commands are people actually giving Warden?

# 37. Feedback
You mentioned collecting feedback and checking on discharged patients.
# feedback_requests
id                  UUID PK
patient_id           UUID FK → patients
contact_id            UUID FK → contacts
trigger              TEXT
scheduled_at          TIMESTAMPTZ
sent_at               TIMESTAMPTZ NULL
completed_at          TIMESTAMPTZ NULL
status                TEXT
# feedback_responses
id                  UUID PK
feedback_request_id UUID FK → feedback_requests
rating               INTEGER NULL
responses            JSONB
free_text             TEXT NULL
submitted_at          TIMESTAMPTZ

# 38. Scheduled calls
For post-discharge check-ins.
# call_tasks
id                  UUID PK
patient_id           UUID FK → patients
contact_id            UUID FK → contacts
call_type             TEXT
scheduled_at          TIMESTAMPTZ
assigned_staff_id     UUID FK → staff NULL
status                TEXT
attempt_count         INTEGER
completed_at          TIMESTAMPTZ NULL
outcome               TEXT NULL
notes                 TEXT NULL

# 39. Alerts
# system_alerts
id                  UUID PK
hospital_id          UUID FK → hospitals
patient_id           UUID FK → patients NULL
alert_type           TEXT
severity             TEXT
title                TEXT
description          TEXT
source               TEXT
triggered_at         TIMESTAMPTZ
acknowledged_at      TIMESTAMPTZ NULL
acknowledged_by      UUID FK → staff NULL
resolved_at          TIMESTAMPTZ NULL
metadata             JSONB
Examples:
critical_vital
overdue_medication
unreviewed_lab
equipment_failure
inventory_low
staff_unavailable
transport_delayed
bed_ready

# 40. State snapshots
For fast retrieval.
# patient_current_state
This can actually be a **materialized/derived table or view**, rather than your source of truth.
patient_id
bed_id
ward_id
acuity
latest_vitals
latest_lab_status
pending_task_count
overdue_task_count
pending_medication_count
active_transport_id
active_escalation_id
discharge_status
last_event_at
state_updated_at
Then:
"What's happening with Bed 18?"
becomes extremely cheap.

# 41. Relationships
The most important relationships look like this:
                    ┌──────────────┐
                    │   HOSPITAL   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
          DEPARTMENT      WARD       STAFF
              │            │            │
              ↓            ↓            ↓
           ROOMS ──────── BEDS      SHIFTS
                            │
                            │
                            ↓
                         PATIENT
                            │
       ┌────────────┬───────┼──────────────┐
       ↓            ↓       ↓              ↓
    VITALS      MEDICATIONS LABS       PROCEDURES
       │            │       │              │
       └────────────┴───────┴──────────────┘
                            │
                            ↓
                      PATIENT EVENTS
                            │
                            ↓
                          TASKS
                            │
                 ┌──────────┼───────────┐
                 ↓          ↓           ↓
            ASSIGNMENTS  TRANSPORT   DEPENDENCIES
                 │
                 ↓
               STAFF
And:
TASK
 │
 ├──→ dispatch_queue
 ├──→ notifications
 ├──→ communication
 ├──→ transport
 ├──→ print_jobs
 ├──→ escalation
 └──→ task_events
That's the operational nervous system.

# 42. The REALLY important relationship: everything → events
I would make an architectural rule:
**Every meaningful state transition produces an event.**
For example:
Bed 18:
occupied
    ↓
discharge requested
    ↓
doctor cleared
    ↓
family notified
    ↓
transport requested
    ↓
transport assigned
    ↓
patient discharged
    ↓
cleaning requested
    ↓
cleaning complete
    ↓
bed available
You don't want Warden trying to infer that entire sequence from 20 mutable columns.
You record it.

# 43. How a Warden command flows through the DB
Suppose the user says:
**"Get Bed 18 to radiology."**
Warden:
### 1. Resolve patient
beds
→ patient
### 2. Check current state
patient_current_state
patient_events
tasks
### 3. Create task
tasks
### 4. Determine destination
departments
rooms
navigation_nodes
### 5. Find transport
transport_resources
### 6. Find workers
staff
staff_shifts
staff_current_locations
staff_skills
### 7. Create transport request
transport_requests
### 8. Dispatch worker
task_assignments
dispatch_queue
### 9. If physical movement required
navigation_nodes
navigation_edges
### 10. Log everything
warden_actions
patient_events
task_events
system_events
Now imagine **while Warden is speaking**:
"I'll send—"
CT becomes unavailable.
The system generates:
system_events
    ↓
ct_unavailable
Warden re-evaluates:
current state
+
original intent
+
new event
and changes the plan.
**That is the database architecture I'd build the hackathon around.**

# 44. Indexes I'd absolutely create
At minimum:
-- patients
patients(medical_record_number)
patients(status)
patients(hospital_id, status)

-- beds
beds(status)
beds(current_patient_id)
beds(room_id)

-- staff
staff(hospital_id, is_on_duty)
staff_current_locations(staff_id)

-- tasks
tasks(status, priority)
tasks(patient_id, status)
tasks(due_at)
task_assignments(staff_id, completed_at)

-- events
patient_events(patient_id, timestamp DESC)
system_events(entity_type, entity_id, timestamp DESC)

-- transport
transport_requests(status, priority, required_at)

-- queues
dispatch_queue(status, priority, queued_at)
print_jobs(status, priority, queued_at)
notification_queue(status, priority, scheduled_at)
automation_jobs(status, priority, scheduled_at)

-- communication
communication_attempts(patient_id, started_at DESC)

-- inventory
inventory_items(hospital_id, quantity_on_hand)
For the event tables especially, indexing by (entity_id, timestamp DESC) is important because the dominant query is likely going to be **"give me the latest events for X."**

# 45. Don't make everything relational
I'd use **JSONB selectively**.
Good uses:
patient_events.metadata
system_events.metadata
warden_actions.interpreted_intent
warden_actions.execution_result
voice_interactions.entities
notifications.metadata
inventory_transactions.metadata
Bad uses:
patients EVERYTHING
staff EVERYTHING
tasks EVERYTHING
Things Warden needs to **query, filter, sort, join, or enforce constraints on** should generally get real columns.
Things that represent **variable event payloads** can be JSONB.

# 46. The MVP database
If this is for the hackathon and you're trying to actually build this rather than write a hospital ERP, I'd implement these **first**:
### Core
hospitals
departments
wards
rooms
beds

staff
staff_shifts
staff_current_locations

patients
patient_contacts

vitals
patient_medications
medication_administrations
lab_orders
lab_results

bed_assignments

tasks
task_assignments
task_dependencies
task_events

transport_resources
transport_requests

communication_attempts
escalations
notifications

resources
resource_assignments
inventory_items

navigation_nodes
navigation_edges

print_jobs
printers

patient_events
system_events
warden_sessions
warden_actions
Everything else can be layered on top.

## One final architectural change I'd strongly recommend
Don't think of the database as:
**"Where we store hospital information."**
Think of it as:
**"A continuously changing model of the hospital."**
The most important tables for your demo therefore aren't actually patients or beds.
They're:
**patient_events** **+** **system_events** **+** **tasks** **+** **task_dependencies** **+** **dispatch_queue** **+** **warden_actions****.**
Those six are what let Warden understand **what was supposed to happen, what actually happened, what is happening now, and what should happen next.**
And that distinction is exactly what separates your idea from *"ChatGPT connected to a hospital database."*
