// 流れ星1本の軌道と時間変化(純粋関数)。rng は () => [0,1)。

export const KIND = { PLAIN: 'plain', FACE: 'face' };

const between = (rng, a, b) => a + (b - a) * rng();

export function faceSize(w, h) {
  return Math.round(Math.min(Math.max(Math.min(w, h) * 0.2, 80), 260));
}

export function spawnMeteor(rng, w, h, kind) {
  const diag = Math.hypot(w, h);
  const rightward = rng() < 0.5;
  const angle = (between(rng, 22, 50) * Math.PI) / 180; // 水平から下向きの角度
  const dx = (rightward ? 1 : -1) * Math.cos(angle);
  const dy = Math.sin(angle);
  const x0 = rightward ? between(rng, -0.1 * w, 0.55 * w) : between(rng, 0.45 * w, 1.1 * w);
  const y0 = between(rng, -0.05 * h, 0.35 * h);
  const isFace = kind === KIND.FACE;
  return {
    kind,
    x0,
    y0,
    dx,
    dy,
    dist: diag * (isFace ? between(rng, 0.7, 0.95) : between(rng, 0.3, 0.55)),
    duration: isFace ? between(rng, 1.8, 2.6) : between(rng, 0.5, 1.1),
    trail: isFace ? diag * 0.32 : diag * between(rng, 0.12, 0.2),
    size: isFace ? faceSize(w, h) : between(rng, 1.5, 2.8),
    spin: isFace ? between(rng, -0.25, 0.25) : 0, // 顔をほんの少し回す(rad、全行程で)
  };
}

// t 秒後の状態。終わっていたら null。
export function meteorState(m, t) {
  if (t < 0) return null;
  const p = t / m.duration;
  if (p >= 1) return null;
  const travelled = m.dist * p;
  const fadeIn = Math.min(p / 0.12, 1);
  const fadeOut = Math.min((1 - p) / 0.3, 1);
  return {
    x: m.x0 + m.dx * travelled,
    y: m.y0 + m.dy * travelled,
    alpha: Math.max(0, Math.min(fadeIn, fadeOut)),
    trail: Math.min(m.trail, travelled), // 出だしは尾が伸びていく
    rotation: m.spin * p,
    progress: p,
  };
}
