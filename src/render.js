// 流れ星の描画(canvas 2D)。座標は CSS ピクセル。
import { meteorState } from './lib/meteor.js';

const SPRITE = 320; // スプライト全体
const FACE_D = 220; // うち顔の直径(残りは光のにじみ)

// 顔画像 → 縁をぼかした丸＋周りの光、を1枚にまとめたスプライト
export function makeFaceSprite(img) {
  const face = document.createElement('canvas');
  face.width = face.height = FACE_D;
  const f = face.getContext('2d');
  f.drawImage(img, 0, 0, FACE_D, FACE_D);
  const r = FACE_D / 2;
  const mask = f.createRadialGradient(r, r, r * 0.82, r, r, r);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  f.globalCompositeOperation = 'destination-in';
  f.fillStyle = mask;
  f.fillRect(0, 0, FACE_D, FACE_D);

  const s = document.createElement('canvas');
  s.width = s.height = SPRITE;
  const g = s.getContext('2d');
  const c = SPRITE / 2;
  const glow = g.createRadialGradient(c, c, r * 0.6, c, c, c);
  glow.addColorStop(0, 'rgba(225,235,255,0.75)');
  glow.addColorStop(0.45, 'rgba(170,195,255,0.28)');
  glow.addColorStop(1, 'rgba(140,170,255,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, SPRITE, SPRITE);
  g.drawImage(face, c - r, c - r);
  return s;
}

function drawTrail(ctx, m, st, headWidth, color) {
  const tx = st.x - m.dx * st.trail;
  const ty = st.y - m.dy * st.trail;
  const nx = -m.dy;
  const ny = m.dx;
  const grad = ctx.createLinearGradient(st.x, st.y, tx, ty);
  grad.addColorStop(0, `rgba(${color},${0.9 * st.alpha})`);
  grad.addColorStop(0.35, `rgba(${color},${0.35 * st.alpha})`);
  grad.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(st.x + (nx * headWidth) / 2, st.y + (ny * headWidth) / 2);
  ctx.lineTo(tx, ty);
  ctx.lineTo(st.x - (nx * headWidth) / 2, st.y - (ny * headWidth) / 2);
  ctx.closePath();
  ctx.fill();
}

function drawPlain(ctx, m, st) {
  ctx.globalCompositeOperation = 'lighter';
  drawTrail(ctx, m, st, m.size * 1.6, '220,232,255');
  const r = m.size * 3;
  const head = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, r);
  head.addColorStop(0, `rgba(255,255,255,${st.alpha})`);
  head.addColorStop(1, 'rgba(200,220,255,0)');
  ctx.fillStyle = head;
  ctx.fillRect(st.x - r, st.y - r, r * 2, r * 2);
}

function drawFace(ctx, m, st, sprite) {
  ctx.globalCompositeOperation = 'lighter';
  drawTrail(ctx, m, st, m.size * 0.7, '210,225,255');
  drawTrail(ctx, m, st, m.size * 0.12, '255,255,255');
  if (!sprite) return;
  ctx.globalCompositeOperation = 'source-over';
  const d = (m.size * SPRITE) / FACE_D;
  ctx.save();
  ctx.globalAlpha = st.alpha;
  ctx.translate(st.x, st.y);
  ctx.rotate(st.rotation);
  ctx.drawImage(sprite, -d / 2, -d / 2, d, d);
  ctx.restore();
}

// 描き終わった(画面から消えた)流れ星は false を返す
// まだ始まっていない(開始時刻がフレーム時刻より後)ものは描かずに残す
export function drawMeteor(ctx, entry, now) {
  const t = (now - entry.start) / 1000;
  if (t < 0) return true;
  const st = meteorState(entry.meteor, t);
  if (!st) return false;
  if (entry.meteor.kind === 'face') drawFace(ctx, entry.meteor, st, entry.sprite);
  else drawPlain(ctx, entry.meteor, st);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  return true;
}
