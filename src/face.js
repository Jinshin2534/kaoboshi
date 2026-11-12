// 写真から顔を見つけて丸く切り抜いた正方形PNGを作る。
// 検出は MediaPipe FaceDetector(初回だけ読み込み)。失敗しても中央切り抜きで必ず返す。
import { faceCropRect } from './lib/crop.js';

const OUT = 320; // 保存サイズ(px)
const MAX_DETECT = 1024; // 検出にかける画像の長辺
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

let detectorPromise = null;

function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FilesetResolver, FaceDetector } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks(WASM);
      return FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.4,
      });
    })().catch((e) => {
      detectorPromise = null;
      throw e;
    });
  }
  return detectorPromise;
}

// 一番大きい顔の枠(元画像の座標)。pad>0 のときは余白をつけて縮めた画像で探す
// (ドアップすぎて顔が枠いっぱいだと短距離モデルが見落とすため)。
function detectOn(detector, bitmap, pad) {
  const scale = Math.min(1, MAX_DETECT / Math.max(bitmap.width, bitmap.height)) / (1 + pad * 2);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const offX = Math.round(w * pad);
  const offY = Math.round(h * pad);
  const c = document.createElement('canvas');
  c.width = w + offX * 2;
  c.height = h + offY * 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bitmap, offX, offY, w, h);
  const res = detector.detect(c);
  const boxes = (res.detections || []).map((d) => d.boundingBox).filter(Boolean);
  if (!boxes.length) return null;
  const b = boxes.sort((a, z) => z.width * z.height - a.width * a.height)[0];
  return {
    x: (b.originX - offX) / scale,
    y: (b.originY - offY) / scale,
    w: b.width / scale,
    h: b.height / scale,
  };
}

export async function findFace(bitmap) {
  try {
    const detector = await getDetector();
    return detectOn(detector, bitmap, 0) || detectOn(detector, bitmap, 0.35);
  } catch (e) {
    console.warn('[kaoboshi] 顔検出を使えないので中央で切り抜きます', e);
    return null;
  }
}

export async function cropFace(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const bbox = await findFace(bitmap);
  const r = faceCropRect(bitmap.width, bitmap.height, bbox);
  const c = document.createElement('canvas');
  c.width = c.height = OUT;
  const ctx = c.getContext('2d');
  ctx.drawImage(bitmap, r.x, r.y, r.size, r.size, 0, 0, OUT, OUT);
  bitmap.close?.();
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  return { blob, detected: !!bbox };
}
