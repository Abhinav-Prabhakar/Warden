# Warden Telephone Backend

A provider-swappable Node/TypeScript service that lets hospital staff create and dispatch patient-transport requests using ordinary phone calls.

## Implemented call flow

1. A LiveKit SIP call dispatches `src/agent-entry.ts`.
2. The agent uses LiveKit Inference STT and LLM with Rime TTS.
3. An incoming nurse verifies their existing Warden staff record using phone number and spoken PIN.
4. Warden collects the bed, destination, urgency and transport mode, then asks for confirmation.
5. `POST /api/tasks` validates the occupied bed, readiness and duplicates.
6. The workflow ranks on-duty Warden porters with the `transport` skill and calls them sequentially.
7. The outbound agent records “accept/reject” or DTMF `1/2` through `/api/dispatch/respond`.
8. The accepted operation is mirrored into Warden's existing `tasks` and `task_assignments` tables for the dashboard.
9. Timeouts and rejections try the next porter; exhaustion creates a coordinator notification.

## Database setup

Apply files in this order:

```text
../supabase/migrations/20260906000001_initial_warden_schema.sql
../supabase/seed.sql
supabase/migrations/001_initial.sql
supabase/seed.sql
```

The telephone migration extends the existing Warden schema. It does not recreate `staff`, `patients`, `beds`, `tasks`, or transport tables.

The demo seed assigns PIN `2468` to Nurse Priya and PIN `1111` to Porter Arjun. Replace these synthetic credentials outside the hackathon fixture.

## Local verification

```sh
cp .env.example .env
npm ci
npm test
npm run typecheck
npm run build
API_AUTH_TOKEN=local-development-token npm run dev
```

Development mode uses in-memory repository and telephony adapters. Production validates the Supabase, LiveKit SIP and Rime provider configuration at startup.

Start the LiveKit worker separately with `npm run agent`.

## Production configuration

- Configure a LiveKit inbound SIP trunk and dispatch rule for the Warden number.
- Configure the outbound trunk and set `LIVEKIT_SIP_OUTBOUND_TRUNK_ID`.
- Deploy `src/server.ts` as a persistent Node service.
- Deploy `src/agent-entry.ts` through LiveKit Cloud Agents.
- Set `BACKEND_BASE_URL` to the persistent service URL.
- Store all values from `.env.example` as server-side secrets.
- Configure LiveKit webhooks to `POST /api/calls/livekit/webhook` using `application/webhook+json`.

## API

All routes except health and the signature-verified LiveKit webhook require `Authorization: Bearer <API_AUTH_TOKEN>`. Staff mutations require `x-staff-id`. Task creation also requires `Idempotency-Key`.

- `GET /health`
- `POST /api/calls/livekit/webhook`
- `POST /api/tasks`
- `GET /api/wards/:id/state`
- `GET /api/tasks/:id/events`
- `POST /api/tasks/:id/accept`
- `POST /api/tasks/:id/reject`
- `POST /api/tasks/:id/complete`
- `POST /api/tasks/:id/cancel`
- `POST /api/dispatch/respond`

Business rules depend on interfaces in `src/ports`. LiveKit and Supabase remain adapters. The judged voice path uses Rime through LiveKit Inference.
