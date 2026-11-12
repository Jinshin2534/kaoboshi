// 顔画像の切り抜き正方形を決める純粋関数。
// bbox(顔の検出枠)があれば顔を中心に髪まで少し含めた正方形、
// 無ければ画像中央やや上(ドアップ写真で顔が来やすい位置)の正方形。

const PAD = 1.5; // 検出枠に対する余白倍率(顔の輪郭＋髪まで入れる)
const LIFT = 0.08; // 検出枠は顎寄りなので中心を少し上へ

export function faceCropRect(imgW, imgH, bbox) {
  const maxSize = Math.min(imgW, imgH);
  let cx, cy, size;
  if (bbox && bbox.w > 0 && bbox.h > 0) {
    size = Math.min(Math.max(bbox.w, bbox.h) * PAD, maxSize);
    cx = bbox.x + bbox.w / 2;
    cy = bbox.y + bbox.h / 2 - bbox.h * LIFT;
  } else {
    size = maxSize;
    cx = imgW / 2;
    cy = imgH > imgW ? imgH * 0.42 : imgH / 2;
  }
  const x = clamp(cx - size / 2, 0, imgW - size);
  const y = clamp(cy - size / 2, 0, imgH - size);
  return { x: Math.round(x), y: Math.round(y), size: Math.round(size) };
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}
