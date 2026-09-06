# Warden — Coding Agent Handoff

## 0. READ THIS FIRST

Build **Warden**, a voice-first hospital ward operations agent for **night-shift ward coordinators / nurses**.

Core idea:

> Warden maintains a live model of what is happening in the ward, coordinates people/resources/tasks, and continuously re-evaluates its responses as the underlying situation changes.

This is NOT:
- generic hospital management software
- a static CRUD dashboard
- a chatbot sitting beside a dashboard
- an EHR replacement
- a diagnostic/clinical decision-making system

This IS:
- a live operational coordination layer
- voice-first
- state-aware
- action-oriented
- interruptible
- continuously updating
- designed specifically for chaotic night-shift workflows

### Tech stack

- Next.js
- TypeScript
- Vercel
- Supabase
- Supabase DB schema will be provided separately
- **Do NOT design, invent, modify, or document the DB schema in this specification**
- Use the attached schema as the source of truth
- UI/visual design is intentionally NOT specified here — implementation agent should focus on functionality, state, data flow, business logic, and interactions

---

# 1. CORE PRODUCT PRINCIPLE

Warden should behave as though it has a continuously updating mental model of the ward.

It should know:

- patients
- beds
- staff
- current shifts
- tasks
- task dependencies
- medications
- equipment
- supplies
- incidents
- admissions
- discharges
- transfers
- pending requests
- calls
- acknowledgements
- transport
- room/bed availability
- staff availability
- operational bottlenecks
- recent changes
- unresolved problems
- what the current worker has already seen/heard
- what has changed since they last checked

The system should distinguish:

- current state
- historical state
- planned state
- pending state
- stale information
- confirmed information
- inferred information
- contradictory information

---

# 2. THE VOICE AGENT

Voice is a first-class interface, not an add-on.

Users should be able to speak naturally.

Examples:

- "Who's still waiting for medication?"
- "What's happening with bed 14?"
- "Find me someone to take Mrs Rao down for imaging."
- "Which patients need me right now?"
- "Tell Dr Shah that bed 8 is deteriorating."
- "What changed since I last checked?"
- "Can someone bring an oxygen cylinder to 12?"
- "Mark bed 17 as ready for discharge."
- "Print the discharge paperwork for bed 17."
- "Who's free?"
- "Why is bed 22 still blocked?"
- "What am I forgetting?"
- "Give me a handoff for the morning team."

### Voice requirements

- natural-language commands
- contextual understanding
- multi-turn conversations
- maintain conversational context
- interruptions
- corrections
- confirmations when appropriate
- clarification when genuinely ambiguous
- action execution
- action status reporting
- ability to cancel/modify actions
- ability to react when underlying state changes while speaking

---

# 3. THE CENTRAL WARD MODEL

Everything revolves around a live operational state.

Warden should be able to answer:

### "What is happening right now?"

Across:

- patients
- beds
- staff
- tasks
- medications
- equipment
- supplies
- incidents
- transfers
- admissions
- discharges
- requests
- calls
- printing
- transport
- capacity

The model should update whenever relevant events occur.

---

# 4. SELF-INVALIDATING RESPONSES

This is one of the most important features.

Warden must NEVER blindly continue speaking information that has become obsolete.

Example:

User:
> "Who can take bed 8 to imaging?"

Warden begins:
> "Nurse Priya is available—"

Priya gets assigned another urgent task.

Warden should:
- detect the state change
- stop/reconsider the response
- avoid presenting Priya as available
- produce an updated answer

Similarly:

User:
> "Is bed 12 still waiting for a doctor?"

While Warden is processing:
- doctor arrives
- patient is seen

Warden should answer based on the new state, not the state at query time.

### General principle

Every answer involving mutable information should be considered potentially stale.

Particularly:
- staff availability
- task assignment
- patient status
- bed status
- medication status
- equipment availability
- transport
- incidents
- queue position
- capacity

---

# 5. "WHAT CHANGED?" AWARENESS

Warden should understand temporal context.

Examples:

- "What changed?"
- "What's changed since I went on break?"
- "Anything important since 1 AM?"
- "What happened with bed 8?"
- "What's different from an hour ago?"
- "What did I miss?"

Track meaningful changes and surface:
- newly urgent patients
- newly assigned tasks
- completed tasks
- overdue tasks
- new incidents
- bed changes
- admissions/discharges/transfers
- medication changes
- staff availability changes
- equipment/supply changes
- unresolved requests
- escalations
- failures/blockages

Avoid flooding the user with trivial changes.

---

# 6. PATIENT MANAGEMENT

### Patient overview

For every patient, operationally relevant information should be accessible:

- identity
- bed
- current status
- assigned workers
- care team
- active tasks
- pending tasks
- medications
- relevant requests
- incidents
- transfers
- discharge status
- recent events
- outstanding work
- dependencies/blockers

### Manage patients under care

Workers should be able to:

- see assigned patients
- assign/unassign patients
- transfer responsibility
- see all work associated with a patient
- see overdue work
- see pending work
- add tasks
- complete tasks
- reprioritize tasks
- delegate tasks
- request assistance
- escalate
- leave notes/context
- review recent activity

### Patient state

Support operational statuses such as:

- stable
- needs attention
- urgent
- critical
- awaiting action
- awaiting doctor
- awaiting medication
- awaiting procedure
- awaiting transport
- discharge pending
- transfer pending
- blocked

Do not hard-code clinical logic unnecessarily; clinical severity/status data should be treated as supplied operational data.

---

# 7. BED MANAGEMENT

Each bed should have a live operational state.

Examples:

- occupied
- available
- reserved
- cleaning
- blocked
- maintenance
- discharge pending
- transfer pending
- admission pending

Support:

- assign patient to bed
- move patient between beds
- reserve bed
- release bed
- mark cleaning required
- mark ready
- mark blocked
- record reason for blockage
- track expected availability
- associate tasks/incidents with bed
- view bed history

### Bed dependency awareness

Example:

Bed cannot be marked ready because:
- patient not discharged
- cleaning incomplete
- maintenance incomplete
- equipment missing
- paperwork incomplete

Warden should explain **why a bed is blocked**.

---

# 8. TASK MANAGEMENT

Tasks are a central primitive.

Tasks can belong to:

- patient
- bed
- staff member
- ward
- incident
- admission
- discharge
- transfer
- equipment
- supply
- operational request

Task fields/behavior should support concepts such as:

- title
- description/context
- priority
- status
- assignee
- creator
- due time
- created time
- completed time
- dependencies
- blockers
- escalation
- recurrence where relevant
- acknowledgement
- notes
- cancellation
- reassignment

### Task states

At minimum:

- pending
- assigned
- acknowledged
- in progress
- blocked
- completed
- cancelled
- overdue

### Natural language task creation

Examples:

> "Ask Rahul to check bed 8 in 15 minutes."

> "Someone needs to restock gloves."

> "Make sure bed 12's paperwork is printed before discharge."

Warden converts these into actionable work.

---

# 9. TASK ASSIGNMENT

Warden should intelligently help assign work.

Consider:

- staff availability
- current workload
- existing assignments
- proximity/location where available
- role/permissions
- shift
- urgency
- patient assignment
- task dependencies
- required skills/capabilities
- current incidents

Examples:

> "Who should I give this to?"

> "Find someone free."

> "Who's closest?"

> "Give this to whoever has the lightest workload."

### Avoid blind assignment

Before assigning:
- verify worker is eligible
- verify worker is available
- verify task isn't already assigned
- detect conflicting assignments
- ask for confirmation where consequences are significant

---

# 10. PRIORITIZATION

Warden should dynamically prioritize work.

Priority should consider:

- urgency
- patient importance/severity as provided by system
- deadline
- overdue status
- dependencies
- downstream impact
- staff availability
- resource availability
- incident context

Example:

A low-priority task may become high priority because:
- it blocks a discharge
- discharge blocks a bed
- the bed is needed for an incoming patient

Warden should recognize chains like this.

---

# 11. BLOCKED WORK / DEPENDENCY GRAPHS

Tasks can depend on other tasks/resources/events.

Example:

```text
Doctor signs discharge
        ↓
Paperwork generated
        ↓
Paperwork printed
        ↓
Patient discharge
        ↓
Bed cleaning
        ↓
Bed available
```

If something blocks the chain:

> "Why isn't bed 14 available?"

Warden should trace the dependency chain and explain the actual blocker.

Support:
- dependency creation
- dependency resolution
- blocked state
- downstream impact
- critical path awareness

---

# 12. CLOSED-LOOP TASK EXECUTION

Don't treat "I told someone" as "done."

Important actions should have lifecycle:

```text
requested
→ assigned
→ acknowledged
→ in progress
→ completed
→ verified where appropriate
```

Example:

> "Ask Rahul to bring oxygen to bed 12."

Track:
- request sent
- Rahul received it
- Rahul acknowledged
- Rahul is doing it
- oxygen delivered
- task complete

Surface failures:
- no acknowledgement
- worker unavailable
- task overdue
- reassigned
- blocked

---

# 13. ALERTS & ESCALATION

Support operational alerts.

Examples:

- urgent patient
- overdue task
- missed acknowledgement
- equipment failure
- supply shortage
- bed blockage
- staffing shortage
- incoming admission
- incident
- capacity problem

Escalation paths may include:

- assigned worker
- shift coordinator
- doctor
- senior nurse
- department
- transport
- facilities
- security
- family/contact workflow where appropriate

Warden should know:
- who has been contacted
- who acknowledged
- who has not responded
- when escalation is necessary

---

# 14. DOCTOR / TEAM ROUTING

Warden should route requests to the correct person/team.

Examples:

> "Get the doctor for bed 12."

> "Who is covering cardiology?"

> "Tell Dr Shah about bed 8."

> "Has the doctor seen her yet?"

Support:
- on-call staff
- covering team
- specialty
- location
- availability
- acknowledgement
- escalation
- message/request lifecycle

---

# 15. MEDICATION MANAGEMENT

Operational medication workflow.

Support:

- medication orders/instructions as supplied by the system
- scheduled medications
- medication status
- due medications
- overdue medications
- administration tracking
- worker assignment
- acknowledgement
- exceptions
- missing medication
- pharmacy requests
- medication-related tasks

Warden should answer:

- "What's due now?"
- "What's overdue?"
- "Which patients are waiting?"
- "Who is handling it?"
- "What's blocking this medication?"

Do not invent clinical recommendations.

---

# 16. PHARMACY / MEDICAL SHELF

Support a ward/pharmacy inventory model.

Track:

- medicines
- stock quantity
- units
- location
- expiry
- batch information where available
- low-stock status
- out-of-stock status
- reserved stock
- replenishment requests
- dispensing/pickup workflow

Warden should answer:

- "Do we have this?"
- "Where is it?"
- "How many are left?"
- "Who's getting it?"
- "What medicines are running low?"
- "What needs restocking?"

---

# 17. EQUIPMENT MANAGEMENT

Track ward equipment.

Examples:

- oxygen cylinders
- monitors
- wheelchairs
- infusion equipment
- beds
- pumps
- emergency equipment
- portable devices

States:

- available
- assigned
- in use
- reserved
- cleaning
- maintenance
- missing
- broken
- unavailable

Support:

- find equipment
- reserve equipment
- assign equipment
- request equipment
- report missing equipment
- report failure
- maintenance task
- location tracking where available

Example:

> "Find me an available oxygen cylinder."

---

# 18. SUPPLIES / INVENTORY

Track consumables and operational supplies.

Examples:

- gloves
- syringes
- masks
- dressings
- cleaning supplies
- printer supplies
- other ward consumables

Support:

- quantity
- minimum threshold
- low-stock alerts
- restock requests
- assigned restocking tasks
- stock movement
- shortages
- expected deliveries

---

# 19. CLOUD PRINTER QUEUE

This is explicitly required.

Printing is an asynchronous operational system.

Support a **cloud printer queue**.

Example:

> "Print bed 17's discharge paperwork."

System should:

1. create print job
2. validate requested document
3. place job in queue
4. track status
5. send to printer
6. report success/failure
7. retry when appropriate
8. expose queue position/status

Print job states:

- queued
- processing
- printing
- completed
- failed
- cancelled
- retrying

Track:
- document
- requesting user
- printer
- timestamps
- error
- retry count
- completion

Warden should answer:

- "What's printing?"
- "Did bed 17's paperwork print?"
- "Why is the printer stuck?"
- "Cancel that print."
- "Print it again."

---

# 20. ADMISSIONS

Support incoming patients.

Track:

- expected admission
- patient
- expected arrival
- required bed
- requirements
- transport
- paperwork
- dependencies
- assigned staff
- readiness

Warden should identify blockers before arrival.

Example:

> "Can we take the incoming patient?"

Answer should consider:
- bed availability
- required equipment
- staff capacity
- cleaning
- paperwork
- other dependencies

---

# 21. DISCHARGES

Support discharge workflow.

Track:

- discharge status
- pending requirements
- responsible staff
- paperwork
- printing
- transport
- completion
- bed release
- cleaning dependency

Warden should be able to answer:

> "What's stopping bed 17 from being discharged?"

and:

> "What needs to happen before this bed is free?"

---

# 22. TRANSFERS

Support:

- internal transfers
- external transfers where applicable
- destination
- transport
- staff responsibility
- paperwork
- equipment
- readiness
- completion

Track blockers.

Example:

> "Why hasn't bed 12 transferred yet?"

---

# 23. TRANSPORT

Track transport requests.

Examples:

- imaging
- procedure
- transfer
- discharge
- internal movement

Support:

- request
- assignment
- vehicle/equipment where applicable
- transporter
- pickup time
- destination
- status
- acknowledgement
- completion
- delays

Warden should identify transport bottlenecks.

---

# 24. INCIDENT MANAGEMENT

Support operational incidents.

Examples:

- patient fall
- equipment failure
- staffing problem
- security issue
- infrastructure issue
- supply shortage
- sudden surge
- other ward incidents

Incident lifecycle:

- reported
- acknowledged
- active
- contained/resolved
- closed

Support:

- severity
- affected patients/resources
- assigned responders
- tasks
- escalation
- timeline
- notes
- resolution

---

# 25. SURGE / EMERGENCY MODE

Ward conditions can change rapidly.

Support a surge/incident mode where Warden:

- reprioritizes work
- identifies available staff
- identifies available beds
- identifies critical resources
- identifies bottlenecks
- surfaces urgent tasks
- tracks incident response
- coordinates assignments
- prevents non-essential work from obscuring urgent work

---

# 26. STAFF MANAGEMENT

Track operational staff state.

For each worker:

- role
- shift
- availability
- current location where available
- current assignments
- workload
- capabilities
- active tasks
- acknowledgement status

Warden should answer:

- "Who's on tonight?"
- "Who's free?"
- "Who's overloaded?"
- "Who is handling bed 8?"
- "Who can help?"
- "Where is Rahul?"
- "Who hasn't acknowledged their task?"

---

# 27. STAFF LOCATION / PROXIMITY

Where location data exists, use it operationally.

Examples:

- closest available worker
- closest equipment
- current room
- transport location
- incident location

Never rely on stale location information without indicating uncertainty.

---

# 28. SHIFT MANAGEMENT

Support:

- shift start
- shift end
- workers on duty
- assignments
- unresolved tasks
- incidents
- handoff
- coverage

Warden should understand the current shift.

---

# 29. NIGHT-SHIFT TASK MEMORY

The night shift has a unique problem:

People forget things.

Warden should maintain an operational memory of:

- things mentioned but not completed
- promised actions
- deferred tasks
- pending calls
- unresolved issues
- things to check later
- follow-ups
- things waiting on someone else

Examples:

> "Remind me to check bed 12 in an hour."

> "Don't let me forget to call radiology."

> "What did I say I'd do?"

> "What am I forgetting?"

---

# 30. HANDOFFS

Generate a concise shift handoff.

Include:

- patient concerns
- outstanding tasks
- overdue tasks
- unresolved incidents
- pending admissions
- pending discharges
- transfers
- medication issues
- equipment problems
- supply shortages
- staff/resource issues
- important changes
- things awaiting someone else's action

Support:

- automatic handoff generation
- spoken handoff
- written handoff
- filtering by patient/team/ward
- acknowledgement by incoming shift

---

# 31. CONTEXTUAL CONFIRMATIONS

Don't ask confirmation for every trivial action.

Do ask when:

- action has significant consequences
- target is ambiguous
- multiple patients match
- multiple staff match
- action is irreversible
- action affects multiple people
- user intent is unclear

Avoid:

> "Are you sure?"

for every tiny operation.

Prefer contextual confirmation:

> "There are two patients in bed 12's room. Do you mean Mr Rao?"

or:

> "That will reassign all three of Priya's pending tasks. Proceed?"

---

# 32. CONTRADICTION DETECTION

The system should detect conflicting state.

Examples:

- patient marked discharged but still assigned a bed
- worker marked unavailable but assigned a new task
- equipment marked broken but assigned
- bed marked available while occupied
- task completed but dependency still unresolved
- medication marked administered but still pending

Don't silently pick one.

Surface the contradiction and request resolution where necessary.

---

# 33. STALE / UNCERTAIN DATA

Warden should understand data freshness.

Potential states:

- confirmed
- recently updated
- stale
- unknown
- conflicting

Avoid confidently stating stale information as current.

Example:

> "The system last saw Rahul as available 23 minutes ago, so I can't reliably say he's free."

---

# 34. FORGETTING / MEMORY PROMPTS

Warden should proactively identify unfinished intentions.

Examples:

> "You said you'd call radiology after finishing bed 12. That hasn't been marked complete."

> "You have three things you deferred earlier tonight."

The system should distinguish:
- explicit task
- casual statement
- completed action
- cancelled intention

Don't turn every conversational statement into a task.

---

# 35. PREDICTIVE BOTTLENECK DETECTION

Warden should identify problems before they become failures.

Examples:

- several discharges waiting on the same printer
- incoming patients exceed available beds
- one worker has too many urgent tasks
- equipment demand exceeds availability
- cleaning queue is delaying bed availability
- transport queue is growing
- medication stock approaching shortage

Surface:

- bottleneck
- cause
- affected operations
- expected consequence
- possible action

---

# 36. OPERATIONAL EXPLANATIONS

Don't only answer "what."

Answer "why" and "what next."

Examples:

> "Why is bed 14 blocked?"

> "What is causing the discharge backlog?"

> "Why is this task overdue?"

> "What's going to become a problem next?"

Warden should trace relevant dependencies and state changes.

---

# 37. DASHBOARD DATA / MAIN OPERATIONAL VIEW

UI implementation is up to the frontend agent, but functionality must expose the data necessary for the primary ward view.

Main ward view concept:

- live floor/bed representation
- each bed selectable
- complete operational information available for selected bed
- current patient
- status
- assigned staff
- active tasks
- pending work
- alerts
- medications
- equipment
- blockers
- recent events
- discharge/transfer state

Global at-a-glance information:

- critical/urgent patients
- tasks requiring attention
- overdue tasks
- unassigned work
- staff on duty
- staff availability
- incidents
- blocked beds
- pending admissions
- pending discharges
- pending transfers
- equipment issues
- supply alerts
- printing queue
- important recent changes

---

# 38. BED-LEVEL DRILLDOWN

Selecting a bed should expose everything operationally relevant to that bed/patient.

Examples:

- patient
- status
- care team
- assigned workers
- current tasks
- overdue tasks
- medication status
- equipment
- requests
- incidents
- transfers
- discharge
- blockers
- recent timeline
- relevant alerts
- voice actions

The same underlying information must be accessible through voice.

---

# 39. ACTIVITY / EVENT TIMELINE

Maintain an event history.

Events can include:

- task created
- task assigned
- task acknowledged
- task completed
- patient moved
- bed changed
- medication administered
- medication missed/delayed
- incident reported
- incident escalated
- equipment assigned
- supply restocked
- admission created
- discharge completed
- transfer completed
- print job submitted
- print job failed
- staff state changed

Timeline should support reconstructing what happened.

---

# 40. ACTION AUDITING

Important actions should be traceable.

Record:

- who initiated action
- what action occurred
- affected entity
- previous state where relevant
- resulting state
- timestamp
- source
  - voice
  - UI
  - system automation
  - external integration
- success/failure

Critical because Warden is coordinating real operations.

---

# 41. INTERRUPTIBLE CONVERSATIONS

User may interrupt Warden at any point.

Examples:

Warden:
> "Nurse Priya is available and—"

User:
> "No, not Priya. Rahul."

Warden:
- stop current response
- incorporate correction
- continue with new request

Other examples:

> "Actually, bed 14."

> "Forget that."

> "Wait."

> "Cancel it."

> "No, I meant tomorrow."

Conversation state must remain coherent.

---

# 42. ACTION CANCELLATION / CORRECTION

Users must be able to undo/correct actions.

Examples:

- cancel task
- reassign task
- cancel print
- cancel request
- correct patient/bed
- modify priority
- change due time
- retract message/request where possible

Warden should clearly report what was changed.

---

# 43. MULTI-STEP ORCHESTRATION

Warden should be capable of executing workflows rather than single CRUD operations.

Example:

> "Prepare bed 17 for the incoming patient."

Potential orchestration:

1. inspect bed state
2. identify current occupant/status
3. determine blockers
4. create/assign required tasks
5. coordinate cleaning
6. verify required equipment
7. monitor completion
8. mark bed ready
9. report readiness

Another:

> "Get Mr Rao ready for discharge."

Could involve:
- checking outstanding requirements
- identifying responsible staff
- paperwork
- printing
- transport
- discharge completion
- bed release
- cleaning

Do not pretend actions happened unless the underlying operation actually succeeded.

---

# 44. CROSS-TEAM / CROSS-DEPARTMENT COORDINATION

Where supported, coordinate beyond the immediate ward:

- radiology
- pharmacy
- transport
- housekeeping
- facilities
- security
- doctors
- other wards
- admissions
- discharge teams

Track requests and acknowledgements.

---

# 45. CROSS-HOSPITAL COORDINATION

If the data model supports it, Warden should be able to reason about:

- other wards
- bed capacity
- transfers
- external transport
- receiving departments
- shared equipment
- shared resources

Do not assume the current ward is an isolated system.

---

# 46. FAMILY / CONTACT WORKFLOWS

Where the product data/workflow supports it:

- contact requests
- communication tasks
- acknowledgement
- pending callbacks
- escalation
- communication status

Keep this operational rather than attempting to make Warden a general communications platform.

---

# 47. SECURITY / INFRASTRUCTURE SUPPORT

Operational incidents may include:

- security incident
- access problem
- power/infrastructure issue
- printer failure
- network problem
- equipment failure
- facility problem

These should enter the same operational coordination model:
- report
- assign
- escalate
- track
- resolve

---

# 48. QUEUES

Queues should be first-class concepts wherever work naturally accumulates.

Examples:

- print queue
- transport queue
- medication queue
- cleaning queue
- admissions queue
- discharge queue
- requests
- equipment requests
- maintenance
- staff assistance requests

Warden should be able to answer:

- "What's in the queue?"
- "What's taking so long?"
- "What's next?"
- "What's blocking the queue?"
- "Who is handling it?"

---

# 49. REAL-TIME UPDATES

The application should behave as a live system.

When state changes:
- update relevant views
- update voice context
- invalidate stale answers
- update queues
- update priorities
- update task assignments
- update alerts
- update capacity
- update dependencies

Avoid requiring manual refresh for core operational state.

Supabase realtime/event mechanisms should be used where appropriate.

---

# 50. NOTIFICATIONS

Support relevant operational notifications:

- task assigned
- task acknowledged
- task completed
- task overdue
- escalation
- incident
- equipment available
- supply shortage
- bed available
- print completed/failed
- transport delayed
- admission approaching
- discharge blocked

Notifications should be meaningful rather than noisy.

---

# 51. SEARCH / RETRIEVAL

Users should be able to find:

- patients
- beds
- staff
- tasks
- medications
- equipment
- supplies
- incidents
- events
- requests

Natural language search through Warden should work alongside conventional application search.

Examples:

> "Find everyone waiting for transport."

> "Show me patients who have something overdue."

> "Where is the spare monitor?"

---

# 52. ROLE / PERMISSION AWARENESS

Actions must respect user permissions.

Warden should know:
- current user
- role
- ward
- shift
- permitted actions

Never execute an action merely because the voice command is syntactically valid.

If user lacks permission:
- explain
- offer appropriate escalation/workflow where applicable

---

# 53. FAILURE HANDLING

External/system operations can fail.

Examples:

- printer unavailable
- notification failed
- staff unavailable
- database operation failed
- stale state
- integration timeout
- conflicting update

Never report:

> "Done."

unless the operation actually succeeded.

Instead:

> "I couldn't send the request because the transport service isn't responding."

Where possible:
- retry
- queue
- escalate
- preserve intent
- tell user what happened

---

# 54. IDEMPOTENCY / DUPLICATE PREVENTION

Voice interaction makes accidental duplication easy.

Examples:

User:
> "Print this."

Then repeats it.

Don't create two print jobs unless explicitly intended.

Similarly prevent accidental duplicate:
- tasks
- requests
- messages
- assignments
- escalations

---

# 55. CONCURRENT UPDATES

Multiple workers may change the same state.

Examples:

- two workers assign the same task
- bed status changes while user is viewing it
- patient transfer happens while someone is assigning a task
- equipment gets taken while Warden is searching

Handle concurrency gracefully.

The live state is authoritative.

---

# 56. NATURAL-LANGUAGE OPERATIONAL QUERIES

Support queries such as:

### Patients
- "Who needs attention?"
- "Who is waiting?"
- "Who's getting worse?"
- "Who has overdue work?"

### Beds
- "Which beds are free?"
- "What's blocking bed 14?"
- "Which beds will become available soon?"

### Staff
- "Who's free?"
- "Who's overloaded?"
- "Who is covering this patient?"

### Tasks
- "What's still pending?"
- "What's overdue?"
- "What am I responsible for?"

### Resources
- "Do we have an oxygen cylinder?"
- "Where's the wheelchair?"
- "What supplies are low?"

### Operations
- "What's going wrong tonight?"
- "What changed?"
- "What's the biggest bottleneck?"
- "What needs my attention?"

---

# 57. PROACTIVE WARDEN

Warden should not merely wait for commands.

When appropriate, it can surface:

- urgent changes
- newly blocked work
- dangerous operational bottlenecks
- missed acknowledgements
- approaching deadlines
- sudden resource shortages
- staffing problems
- important changes since last interaction

But:
- prioritize signal over noise
- don't interrupt unnecessarily
- don't make unsupported clinical claims

---

# 58. "WHAT SHOULD I DO NEXT?"

A major capability.

Given the current ward state:

> "What should I do?"

Warden should produce a prioritized set of operational actions based on:

- urgency
- responsibility
- deadlines
- dependencies
- patient/workload context
- unresolved issues

Likewise:

> "What should the team do next?"

should produce a ward-level operational picture.

---

# 59. "WHY?" EXPLANATION LAYER

Every recommendation/prioritization should have an explainable reason.

Example:

> "Bed 14 should be your next priority because its discharge is blocked by paperwork, and bed 14 is needed for the incoming admission."

Avoid opaque AI decisions.

---

# 60. SAFETY PRINCIPLES

Warden is an operational coordination tool.

It should NOT:
- diagnose patients
- invent medical facts
- prescribe treatment
- override clinicians
- fabricate observations
- claim a task was completed when it wasn't
- claim someone acknowledged something when they didn't
- hide contradictory information
- silently resolve dangerous ambiguity

When information is missing:
- say so
- ask
- defer to the appropriate human

---

# 61. DATA SOURCES / SYSTEM EVENTS

Design the application so that state can change from multiple sources:

- voice action
- UI action
- staff action
- system automation
- external integration
- scheduled event
- realtime event

All of these should ultimately update the same operational state.

---

# 62. APPLICATION ARCHITECTURE EXPECTATION

Keep business logic separate from UI.

Suggested conceptual layers:

- UI
- application actions
- domain/business logic
- Warden orchestration
- realtime event handling
- data access
- external integrations
- background/asynchronous processing

Avoid burying important business logic inside React components.

Prefer:
- typed domain objects
- reusable services
- explicit state transitions
- deterministic business rules
- event-driven updates where useful
- testable orchestration functions

---

# 63. BACKGROUND / ASYNC WORK

Some operations should not depend on an open browser tab.

Examples:

- print queue processing
- retries
- reminders
- escalations
- overdue detection
- scheduled tasks
- queue processing
- state reconciliation
- notifications

Use appropriate Vercel/Supabase mechanisms.

---

# 64. DEMO / SIMULATION SUPPORT

The project should be easy to demonstrate.

Include mechanisms for realistic live state changes.

Examples:

- patient state changes
- task assignments
- worker availability changes
- printer changes
- incoming admission
- equipment becoming unavailable
- new incident
- task completion
- queue movement

This is particularly important for demonstrating Warden's **live-state / self-invalidating-agent** concept.

The demo should be able to show:

1. Warden starts answering based on state A
2. state changes
3. Warden notices
4. previous answer becomes invalid
5. Warden responds using state B

---

# 65. SEED / DEMO DATA

Create realistic demo data covering:

- multiple patients
- multiple beds
- multiple staff
- different workloads
- active tasks
- overdue tasks
- blocked tasks
- incidents
- equipment
- supplies
- medication queues
- admissions
- discharges
- transfers
- transport
- printer queue

The dataset should contain enough interconnected state for Warden's reasoning/orchestration to be demonstrated.

---

# 66. TESTING PRIORITIES

Test the actual operational behavior, not just rendering.

Especially test:

### State changes
- state changes while query is processing
- state changes while response is being generated
- concurrent updates

### Voice
- interruption
- correction
- ambiguity
- context retention
- cancellation

### Tasks
- assignment
- reassignment
- dependencies
- blocking
- overdue
- escalation
- duplicate prevention

### Resources
- resource becomes unavailable mid-operation
- stale availability

### Queues
- queue ordering
- retries
- failures
- cancellation
- duplicate jobs

### Safety
- unauthorized action
- contradictory state
- missing information
- failed action incorrectly reported as success

---

# 67. IMPLEMENTATION PRIORITY

Build in this order conceptually:

### P0 — Core Warden
- authentication/session
- ward context
- live state
- patients
- beds
- staff
- tasks
- realtime updates
- voice interaction
- action execution

### P1 — Operational intelligence
- prioritization
- dependencies
- blockers
- alerts
- escalation
- change detection
- stale-state awareness
- staff workload
- proactive Warden
- handoffs

### P2 — Resource coordination
- medications
- pharmacy
- equipment
- supplies
- transport
- admissions
- discharges
- transfers

### P3 — Infrastructure
- printer queue
- notifications
- maintenance
- facilities
- security
- asynchronous jobs
- retries

### P4 — Advanced intelligence
- predictive bottlenecks
- cross-team coordination
- cross-ward coordination
- deeper orchestration
- richer operational memory

---

# 68. MOST IMPORTANT PRODUCT BEHAVIOR

The agent should internalize these rules:

### Rule 1
**The current ward state beats the state from five seconds ago.**

### Rule 2
**Never confidently answer using information you know may be stale.**

### Rule 3
**Never say an action happened unless it actually happened.**

### Rule 4
**Don't just tell the user what is wrong — identify why and what can be done.**

### Rule 5
**Tasks are not complete merely because someone was asked to do them.**

### Rule 6
**A blocker can propagate through an entire operational dependency chain.**

### Rule 7
**Every important operation needs observable state.**

### Rule 8
**The user can interrupt Warden at any time.**

### Rule 9
**Warden should reduce cognitive load during the night shift, not create more of it.**

### Rule 10
**Prefer operationally useful answers over exhaustive information dumps.**

---

# 69. README REQUIREMENT — CRITICAL

Before doing substantial implementation work, create/update:

```text
README.md
```

The README is the project's **persistent source of truth for the coding agent**.

It must document:

- what Warden is
- product purpose
- core principles
- full feature inventory
- supported workflows
- voice behavior
- realtime behavior
- orchestration behavior
- task lifecycle
- queue behavior
- safety constraints
- architectural principles
- implementation status
- completed features
- partially completed features
- known limitations
- important decisions
- TODOs

### CRITICAL:

**Do not rely on conversation history to remember requirements.**

Whenever a meaningful feature/architectural decision is implemented or changed:

- update README.md
- keep feature status current
- record important behavioral decisions
- record known limitations
- record unfinished work

The README should allow a new coding agent to enter the project and understand what has been built and what remains without needing this conversation.

---

# 70. DATABASE

A complete database schema will be supplied separately.

**Do not design the schema in this document.**

When implementing:
- inspect the supplied schema
- treat it as authoritative
- use its exact entities/relations/fields
- do not invent competing schema structures
- do not duplicate schema documentation unnecessarily in README
- focus README documentation on behavior and architecture

Database:
- Supabase
- PostgreSQL
- realtime capabilities where appropriate

---

# 71. FRONTEND

Framework:

- Next.js
- TypeScript

Hosting:

- Vercel

UI is intentionally left to the implementation agent / product designer.

Do NOT spend significant effort inventing a visual design based on this specification.

Focus on:
- functionality
- data
- interactions
- state
- realtime behavior
- voice
- orchestration
- reliability

---

# 72. DEFINITION OF "DONE"

A feature is not done merely because:
- a button exists
- a row exists
- an API route exists
- data can be inserted

A feature is done when its **full operational lifecycle works**.

For example:

### "Assign task"
means:

- task can be created
- eligible worker can be identified
- assignment occurs
- worker sees/receives assignment
- acknowledgement can occur
- status changes are tracked
- reassignment works
- completion works
- overdue/blocking behavior works
- Warden understands the new state
- realtime clients update
- audit/event history reflects it

Similarly:

### "Print document"
means:

- print request created
- queued
- processed
- printer receives job
- success/failure tracked
- retry handled
- cancellation works
- Warden can answer its status

Think in **end-to-end workflows**, not isolated CRUD features.

---

# 73. FINAL PRODUCT TEST

The finished application should make this scenario possible:

A nurse working alone at 2 AM can say:

> "What's going on?"

and Warden can understand the current ward.

Then:

> "What needs me?"

and get a prioritized answer.

Then:

> "Get someone to take bed 8 to imaging."

and Warden coordinates it.

While this is happening:

- another patient becomes urgent
- a staff member becomes unavailable
- a printer fails
- a bed becomes blocked
- an admission is announced

Warden must incorporate those changes into its operational model.

The nurse should then be able to ask:

> "What changed?"

and receive the important changes.

Then:

> "Why can't we use bed 14?"

and Warden traces the blocker.

Then:

> "Handle it."

and Warden orchestrates the appropriate operational workflow.

Finally:

> "Give me the handoff."

and Warden produces a concise, useful summary of everything the next shift needs to know.

**That is the product.**

Build the system around this behavior rather than around individual screens.