// いつ・何を流すかを決める純粋関数。

export const FREQ_MIN = 1;
export const FREQ_MAX = 10;
export const FREQ_DEFAULT = 5;
const FACE_CHANCE = 0.3;
const MAX_PLAINS_BETWEEN_FACES = 4;

// 頻度つまみ(1=まれ〜10=頻繁)→平均間隔(秒)。1で60秒、10で4秒の等比。
export function meanInterval(freq) {
  const f = Math.min(Math.max(Math.round(freq), FREQ_MIN), FREQ_MAX);
  const r = (f - FREQ_MIN) / (FREQ_MAX - FREQ_MIN);
  return 60 * Math.pow(4 / 60, r);
}

// 平均の0.5〜1.5倍でばらつかせる
export function nextDelay(rng, freq) {
  return meanInterval(freq) * (0.5 + rng());
}

// 顔が無ければ常に普通の星。普通の星が続きすぎたら必ず顔。
export function pickKind(rng, plainsSinceFace, faceCount) {
  if (faceCount <= 0) return 'plain';
  if (plainsSinceFace >= MAX_PLAINS_BETWEEN_FACES) return 'face';
  return rng() < FACE_CHANCE ? 'face' : 'plain';
}

// 同じ顔が連続しないように選ぶ
export function pickFaceIndex(rng, count, lastIndex) {
  if (count <= 1) return 0;
  const hasLast = Number.isInteger(lastIndex) && lastIndex >= 0 && lastIndex < count;
  if (!hasLast) return Math.min(Math.floor(rng() * count), count - 1);
  let i = Math.min(Math.floor(rng() * (count - 1)), count - 2);
  if (i >= lastIndex) i += 1;
  return i;
}
