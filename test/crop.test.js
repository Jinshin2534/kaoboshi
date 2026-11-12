import { describe, it, expect } from 'vitest';
import { faceCropRect } from '../src/lib/crop.js';

const inside = (r, W, H) => r.x >= 0 && r.y >= 0 && r.x + r.size <= W && r.y + r.size <= H;

describe('faceCropRect', () => {
  it('検出枠を中心に1.5倍の正方形で切る', () => {
    const r = faceCropRect(1000, 1000, { x: 400, y: 400, w: 200, h: 200 });
    expect(r.size).toBe(300);
    expect(r.x).toBe(350);
    expect(r.y).toBe(334); // 少し上に寄せる
  });
  it('ドアップ(枠が画像より大きい)なら画像の短辺に収める', () => {
    const r = faceCropRect(800, 1200, { x: -50, y: 100, w: 900, h: 1000 });
    expect(r.size).toBe(800);
    expect(inside(r, 800, 1200)).toBe(true);
  });
  it('端に寄った顔でも画像からはみ出さない', () => {
    const r = faceCropRect(1000, 800, { x: 900, y: -20, w: 150, h: 160 });
    expect(inside(r, 1000, 800)).toBe(true);
  });
  it('検出なし: 縦長は中央やや上の正方形', () => {
    const r = faceCropRect(600, 1000, null);
    expect(r).toEqual({ x: 0, y: 120, size: 600 });
  });
  it('検出なし: 横長は中央の正方形', () => {
    expect(faceCropRect(1000, 600, null)).toEqual({ x: 200, y: 0, size: 600 });
  });
  it('大きさ0の枠は検出なし扱い', () => {
    expect(faceCropRect(1000, 600, { x: 1, y: 1, w: 0, h: 0 })).toEqual({ x: 200, y: 0, size: 600 });
  });
});
