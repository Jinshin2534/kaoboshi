import { describe, it, expect } from 'vitest';
import { spawnMeteor, meteorState, faceSize, KIND } from '../src/lib/meteor.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe('spawnMeteor / meteorState', () => {
  it('どの乱数でも斜め下向きに流れ、軌道の途中で画面内を通る', () => {
    for (const [w, h] of [[390, 844], [1440, 900]]) {
      for (let seed = 1; seed <= 300; seed++) {
        for (const kind of [KIND.PLAIN, KIND.FACE]) {
          const m = spawnMeteor(seeded(seed), w, h, kind);
          expect(m.dy).toBeGreaterThan(0);
          const angle = (Math.atan2(m.dy, Math.abs(m.dx)) * 180) / Math.PI;
          expect(angle).toBeGreaterThanOrEqual(22);
          expect(angle).toBeLessThanOrEqual(50);
          let seen = false;
          for (let t = 0; t < m.duration; t += m.duration / 50) {
            const s = meteorState(m, t);
            if (s && s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= h) seen = true;
          }
          expect(seen).toBe(true);
        }
      }
    }
  });
  it('顔は普通の星よりゆっくり長く流れる', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const p = spawnMeteor(seeded(seed), 1000, 800, KIND.PLAIN);
      const f = spawnMeteor(seeded(seed), 1000, 800, KIND.FACE);
      expect(f.duration).toBeGreaterThan(p.duration);
    }
  });
  it('フェードイン→不透明→フェードアウトし、終われば null', () => {
    const m = { x0: 0, y0: 0, dx: 1, dy: 0, dist: 100, duration: 2, trail: 50, spin: 0 };
    expect(meteorState(m, 0).alpha).toBe(0);
    expect(meteorState(m, 1).alpha).toBe(1);
    expect(meteorState(m, 1.9).alpha).toBeLessThan(0.5);
    expect(meteorState(m, 2)).toBeNull();
    expect(meteorState(m, -0.1)).toBeNull();
    expect(meteorState(m, 1).x).toBe(50);
  });
  it('尾は進んだ距離より長くならない', () => {
    const m = { x0: 0, y0: 0, dx: 1, dy: 0, dist: 100, duration: 1, trail: 50, spin: 0 };
    expect(meteorState(m, 0.1).trail).toBeCloseTo(10);
    expect(meteorState(m, 0.8).trail).toBe(50);
  });
  it('顔の大きさは画面に比例しつつ上下限つき', () => {
    expect(faceSize(390, 844)).toBe(80);
    expect(faceSize(1440, 900)).toBe(180);
    expect(faceSize(4000, 3000)).toBe(260);
  });
});
