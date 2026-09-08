# Rime integration evidence

## Automated verification

Run `npm ci && npm test && npm run typecheck && npm run build`.

Covered behavior includes PIN verification, transport creation, duplicate suppression, retry, timeout escalation, readiness checks, cancellation, stale-result rejection, dispatch response delivery and HTTP authentication.

## Judged voice path

`src/agent-entry.ts` configures streaming STT, structured LLM tool calls, Rime TTS, interruption handling and direct DTMF `1/2` capture. The web prototype no longer silently substitutes browser speech if Rime fails or announces a successful ward update after a failed request.

## Remaining live evidence

Carrier calls and latency percentiles require deployed credentials, a SIP number and LiveKit Cloud.

| Measurement | Result |
|---|---|
| Incoming call reaches agent | Pending deployed test |
| Outbound porter call reaches mobile | Pending deployed test |
| Voice acceptance updates dashboard | Pending deployed test |
| DTMF 1 acceptance updates dashboard | Pending deployed test |
| 19/20 interruptions stop within 500 ms | Pending deployed test |
| Warm end-of-speech to first Rime audio | Pending deployed test |
| Cold end-of-speech to first Rime audio | Pending deployed test |

Use the synthetic ward fixture for every test.
