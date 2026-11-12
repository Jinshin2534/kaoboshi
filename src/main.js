import { spawnMeteor, KIND } from './lib/meteor.js';
import { nextDelay, pickKind, pickFaceIndex, FREQ_DEFAULT } from './lib/schedule.js';
import { drawMeteor, makeFaceSprite } from './render.js';
import { cropFace } from './face.js';
import { loadFaces, addFace, removeFace, loadSetting, saveSetting } from './store.js';

const $ = (id) => document.getElementById(id);
const video = $('cam');
const canvas = $('sky');
const ctx = canvas.getContext('2d');

const state = {
  faces: [], // { id, blob, url, sprite }
  freq: loadSetting('freq', FREQ_DEFAULT),
  meteors: [],
  nextAt: 0,
  plainsSinceFace: 0,
  lastFace: -1,
  w: 0,
  h: 0,
};

// ---- 画面サイズ ----
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.w = window.innerWidth;
  state.h = window.innerHeight;
  canvas.width = Math.round(state.w * dpr);
  canvas.height = Math.round(state.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ---- カメラ ----
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play().catch(() => {});
    hideNotice();
  } catch (e) {
    console.warn('[kaoboshi] camera', e);
    showNotice('カメラを使えませんでした。ブラウザのカメラ許可を確認してください');
  }
}

let noticeTimer = 0;
function showNotice(text, ms = 0) {
  const n = $('notice');
  n.textContent = text;
  n.hidden = false;
  clearTimeout(noticeTimer);
  if (ms) noticeTimer = setTimeout(hideNotice, ms);
}
function hideNotice() {
  $('notice').hidden = true;
}

// ---- 全画面・スリープ防止(最初のタップで) ----
let wakeLock = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    }
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') keepAwake();
});
function goImmersive() {
  keepAwake();
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  if (video.paused && video.srcObject) video.play().catch(() => {});
}

// ---- 顔画像 ----
function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = reject;
    img.src = url;
  });
}

async function hydrate(face) {
  const { img, url } = await blobToImage(face.blob);
  return { ...face, url, sprite: makeFaceSprite(img) };
}

async function addFiles(files) {
  const list = [...files].filter((f) => f.type.startsWith('image/'));
  if (!list.length) return;
  showNotice('顔を切り抜いています…');
  let missed = 0;
  for (const file of list) {
    try {
      const { blob, detected } = await cropFace(file);
      if (!detected) missed++;
      state.faces.push(await hydrate(await addFace(blob)));
    } catch (e) {
      console.warn('[kaoboshi] crop', e);
      missed++;
    }
  }
  renderFaceList();
  updateFirst();
  showNotice(missed ? `${missed}枚は顔が見つからず、中央で切り抜きました` : '追加しました', 2500);
}

async function deleteFace(id) {
  const i = state.faces.findIndex((f) => f.id === id);
  if (i < 0) return;
  URL.revokeObjectURL(state.faces[i].url);
  state.faces.splice(i, 1);
  state.lastFace = -1;
  await removeFace(id);
  renderFaceList();
  updateFirst();
}

function renderFaceList() {
  const box = $('faces');
  box.replaceChildren(
    ...state.faces.map((f) => {
      const d = document.createElement('div');
      d.className = 'face';
      const img = document.createElement('img');
      img.src = f.url;
      img.alt = '';
      const del = document.createElement('button');
      del.textContent = '×';
      del.setAttribute('aria-label', '削除');
      del.onclick = () => deleteFace(f.id);
      d.append(img, del);
      return d;
    }),
  );
}

function updateFirst() {
  $('first').hidden = state.faces.length > 0 || !$('panel').hidden;
}

// ---- 隠し設定(長押し / S キー) ----
function openPanel() {
  $('freq').value = state.freq;
  $('panel').hidden = false;
  updateFirst();
}
function closePanel() {
  $('panel').hidden = true;
  updateFirst();
}

let pressTimer = 0;
let pressAt = null;
window.addEventListener('pointerdown', (e) => {
  goImmersive();
  if (!$('panel').hidden || e.target.closest('button,input,label')) return;
  pressAt = { x: e.clientX, y: e.clientY };
  clearTimeout(pressTimer);
  pressTimer = setTimeout(openPanel, 650);
});
window.addEventListener('pointermove', (e) => {
  if (pressAt && Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 12) clearTimeout(pressTimer);
});
for (const ev of ['pointerup', 'pointercancel']) {
  window.addEventListener(ev, () => {
    clearTimeout(pressTimer);
    pressAt = null;
  });
}
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
  if (e.key === 's' || e.key === 'S') $('panel').hidden ? openPanel() : closePanel();
  else if (e.key === 'Escape') closePanel();
});

$('panel').addEventListener('click', (e) => {
  if (e.target === $('panel')) closePanel();
});
$('close').onclick = closePanel;
$('add').onclick = () => $('file').click();
$('pick-first').onclick = () => $('file').click();
$('shoot').onclick = () => {
  closePanel();
  launch(state.faces.length ? KIND.FACE : KIND.PLAIN);
};
$('freq').oninput = (e) => {
  state.freq = Number(e.target.value);
  saveSetting('freq', state.freq);
  state.nextAt = performance.now() + nextDelay(Math.random, state.freq) * 1000;
};
$('file').onchange = async (e) => {
  const files = e.target.files;
  if (files?.length) await addFiles(files);
  e.target.value = '';
};

// ---- 流す ----
function launch(kind, now = performance.now()) {
  const meteor = spawnMeteor(Math.random, state.w, state.h, kind);
  const entry = { meteor, start: now, sprite: null };
  if (kind === KIND.FACE && state.faces.length) {
    const i = pickFaceIndex(Math.random, state.faces.length, state.lastFace);
    state.lastFace = i;
    entry.sprite = state.faces[i].sprite;
    state.plainsSinceFace = 0;
  } else {
    meteor.kind = KIND.PLAIN;
    state.plainsSinceFace++;
  }
  state.meteors.push(entry);
  return entry;
}

function tick(now) {
  if (now >= state.nextAt) {
    if (state.nextAt) launch(pickKind(Math.random, state.plainsSinceFace, state.faces.length), now);
    state.nextAt = now + nextDelay(Math.random, state.freq) * 1000;
  }
  ctx.clearRect(0, 0, state.w, state.h);
  state.meteors = state.meteors.filter((m) => drawMeteor(ctx, m, now));
  requestAnimationFrame(tick);
}

// ---- 起動 ----
(async () => {
  startCamera();
  try {
    state.faces = await Promise.all((await loadFaces()).map(hydrate));
  } catch (e) {
    console.warn('[kaoboshi] load', e);
  }
  renderFaceList();
  updateFirst();
  requestAnimationFrame(tick);
})();

// ヘッドレス検証用
window.__app = { state, launch, addFiles, openPanel, closePanel };
