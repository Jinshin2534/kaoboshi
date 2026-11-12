import { describe, it, expect } from 'vitest';
import { meanInterval, nextDelay, pickKind, pickFaceIndex } from '../src/lib/schedule.js';

describe('schedule', () => {
  it('頻度1で60秒、10で4秒、範囲外は丸める', () => {
    expect(meanInterval(1)).toBeCloseTo(60);
    expect(meanInterval(10)).toBeCloseTo(4);
    expect(meanInterval(99)).toBeCloseTo(4);
    expect(meanInterval(5)).toBeLessThan(meanInterval(4));
  });
  it('間隔は平均の0.5〜1.5倍', () => {
    expect(nextDelay(() => 0, 1)).toBeCloseTo(30);
    expect(nextDelay(() => 0.999999, 1)).toBeCloseTo(90, 3);
  });
  it('顔が無ければ常に普通の星', () => {
    expect(pickKind(() => 0, 10, 0)).toBe('plain');
  });
  it('普通の星が4回続いたら必ず顔', () => {
    expect(pickKind(() => 0.99, 4, 1)).toBe('face');
    expect(pickKind(() => 0.99, 3, 1)).toBe('plain');
    expect(pickKind(() => 0.1, 0, 1)).toBe('face');
  });
  it('同じ顔は連続しない・全部の顔が選ばれうる', () => {
    expect(pickFaceIndex(() => 0.5, 1, 0)).toBe(0);
    for (let last = 0; last < 3; last++) {
      const got = new Set();
      for (const r of [0, 0.3, 0.6, 0.99999]) {
        const i = pickFaceIndex(() => r, 3, last);
        expect(i).not.toBe(last);
        got.add(i);
      }
      expect(got.size).toBe(2);
    }
    const first = new Set([0, 0.4, 0.99999].map((r) => pickFaceIndex(() => r, 3, -1)));
    expect(first).toEqual(new Set([0, 1, 2]));
  });
});
