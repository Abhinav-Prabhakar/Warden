import { describe, it, expect } from 'vitest';
import { TurnAudio } from '../../lib/voice/turn-audio';
describe('audio revision fence (no acoustic measurement)', () => {
  it('stops the attached player immediately and rejects all 20 late audio arrivals', () => { let stops = 0; const f = new TurnAudio(); for (let i = 0; i < 20; i++) { const old = f.next(); const signal = f.controller.signal; f.attach(old, () => stops++); f.next(); expect(signal.aborted).toBe(true); expect(f.current(old)).toBe(false); expect(f.attach(old, () => stops++)).toBe(false); } expect(stops).toBe(40); });
});
