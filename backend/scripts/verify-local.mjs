import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = process.env.WARDEN_TEST_URL || 'http://localhost:3000';
const evidence = [];
const call = async (path, body) => {
  const res = await fetch(`${base}/api/voice/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  return { http: res.status, body: await res.json() };
};
const record = (name, result) => { evidence.push({ name, ...result }); console.log(name, JSON.stringify(result)); };
const initial = await call('state'); assert.equal(initial.http, 200); assert.equal(initial.body.mode, 'simulation');
assert.ok(initial.body.tasks.every(t => ['completed','cancelled','failed'].includes(t.status)), 'Finish existing synthetic tasks, or restart the backend before this resettable-fixture test.');
const before = new Set(initial.body.tasks.map(t => t.id));
const sessionId = crypto.randomUUID();
const old = call('chat', { sessionId, revision: 1, message: 'transport Bed 18 to Radiology by wheelchair' });
await new Promise(r => setTimeout(r, 300));
const replacement = call('chat', { sessionId, revision: 2, message: 'cancel, Bed 21 instead' });
const stale = await old; record('OLD_BED_18', stale); assert.equal(stale.http,409); assert.equal(stale.body.error,'STALE_OPERATION');
const created = await replacement; record('NEW_BED_21', created); assert.equal(created.http,200); assert.equal(created.body.task.status,'assigned');
const { id: taskId, assignedStaffId: staffId } = created.body.task;
const state = await call('state'); const fresh = state.body.tasks.filter(t => !before.has(t.id)); assert.equal(fresh.length,1); assert.ok(fresh[0].bedId.endsWith('021')); record('REPOSITORY_CHECK', { newTasks: fresh.length, beds: fresh.map(t => t.bedId), staleDiscardEvents: state.body.events.filter(e => e.type === 'lookup.stale_discarded').length });
for (const [action, actor, status] of [['accept',staffId,'accepted'],['cancel','00000000-0000-4000-8000-000000000001','cancellation_requested'],['ack_cancel',staffId,'cancelled']]) {
  const result = await call('action',{taskId,staffId:actor,action}); record(action.toUpperCase(), result); assert.equal(result.http,200); assert.equal(result.body.task.status,status);
}
const rime = await call('tts',{text:'Hello'}); record('RIME',rime); if (!initial.body.speech.configured) assert.equal(rime.http,503);
record('RESULT',{passed:true, storage:'memory simulation', audibleInterruptionMs:null, warmRimeLatencyMs:null, coldRimeLatencyMs:null});
await writeFile(new URL('../evidence/local-request.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
