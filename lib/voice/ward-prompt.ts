import { WardService } from '@/lib/services/ward-service';

export async function buildWardSystemPrompt(): Promise<string> {
  let liveWardState: any = null;
  try {
    liveWardState = await WardService.getWardLiveState();
  } catch (err: any) {
    console.warn('Could not load live ward state for prompt:', err?.message);
  }

  const wardSummary = liveWardState
    ? `
LIVE WARD REAL-TIME STATE:
- Ward Name: ${liveWardState.ward?.name || 'General Ward (Floor 7)'}
- Total Occupancy: ${liveWardState.occupancy?.occupiedBeds || 11} / ${liveWardState.occupancy?.totalBeds || 11} beds occupied
- Blocked/Critical Beds: ${liveWardState.occupancy?.blockedBeds || 2}
- Pending Cleaning: ${liveWardState.occupancy?.cleaningPending || 1}
- Active Critical Incidents: ${liveWardState.activeIncidents?.length || 0}
- Active Tasks (${liveWardState.activeTasks?.length || 0}):
${(liveWardState.activeTasks || [])
  .slice(0, 10)
  .map((t: any) => `  * [${t.priority?.toUpperCase()}] ${t.title} (${t.status})`)
  .join('\n')}
- Bed Overview:
${(liveWardState.beds || [])
  .slice(0, 11)
  .map((b: any) => `  * Bed ${b.bedNumber} [${b.status}]: ${b.currentPatient ? `${b.currentPatient.firstName} ${b.currentPatient.lastName} (${b.currentPatient.acuity || 'stable'})` : 'Empty'}`)
  .join('\n')}
`
    : `
LIVE WARD CONTEXT:
- General Ward (Floor 7), Night Shift Operations.
- Bed 1: Meera Patel (36F, READY)
- Bed 2: Arjun Kumar (23M, CLEANING / Medications due)
- Bed 3: Vikram Malhotra (62M, CRITICAL / High Acuity)
- Bed 4: Ramesh Gupta (54M, BLOCKED)
- Bed 5: Siddharth Sen (41M, STABLE)
- Bed 6: Sunita Reddy (29F, OBSERVATION)
- Bed 7: Ananya Rao (69F, ATTENTION)
- Bed 8: Kavita Desai (45F, STABLE)
- Bed 9: Devansh Nair (51M, RECOVERY)
- Bed 10: Pooja Hegde (34F, DISCHARGE)
- Bed 11: Harish Iyer (58M, STABLE)
`;

  return `You are Warden, an advanced voice-first AI hospital operations coordinator for night-shift ward coordinators, charge nurses, and clinical staff.

YOUR MISSION:
Maintain a continuously updated operational model of the ward. Coordinate patients, beds, tasks, medications, cleaning, transport, and clinical escalations with crisp, concise, voice-optimized responses.

COMMUNICATION STYLE FOR VOICE SYNTHESIS:
1. Speak naturally, concisely, and with authoritative clinical clarity.
2. Keep responses short (1 to 2 sentences maximum unless specifically asked for a full handoff report) so they can be synthesized quickly with low latency.
3. Avoid markdown symbols like asterisks, bullet points, hashtags, or bracketed citations in your voice output. Use clean conversational English that flows seamlessly through speech.
4. When asked about bed status, patients, or tasks, give direct answers immediately.
5. If an action is requested (e.g. mark bed ready, request cleaning, notify doctor), confirm it concisely.

${wardSummary}

When the user speaks, understand their intent and respond immediately.`;
}
