// 切り抜いた顔画像(PNG Blob)を IndexedDB に保存する。使えない環境ではメモリだけで動く。
const DB = 'kaoboshi';
const STORE = 'faces';
let memory = [];

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

export async function loadFaces() {
  try {
    const all = await tx('readonly', (s) => s.getAll());
    return all.sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return memory.slice();
  }
}

export async function addFace(blob) {
  const face = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, blob };
  try {
    await tx('readwrite', (s) => s.put(face));
  } catch {
    memory.push(face);
  }
  return face;
}

export async function removeFace(id) {
  try {
    await tx('readwrite', (s) => s.delete(id));
  } catch {
    memory = memory.filter((f) => f.id !== id);
  }
}

export function loadSetting(key, fallback) {
  try {
    const v = localStorage.getItem(`kaoboshi:${key}`);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

export function saveSetting(key, value) {
  try {
    localStorage.setItem(`kaoboshi:${key}`, JSON.stringify(value));
  } catch {}
}
