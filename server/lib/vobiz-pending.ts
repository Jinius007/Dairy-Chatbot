/** In-flight call data between Vobiz Redirect steps (same CallUUID). */

type Entry = {
  recordUrl?: string;
  speech?: string;
  lang?: string;
  expires: number;
};

const store = new Map<string, Entry>();
const TTL_MS = 15 * 60 * 1000;

function purge(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
}

function keyFor(callUuid: string, speech?: string): string {
  const id = callUuid.trim() || "anon";
  const tail = speech ? `:${speech.slice(0, 48)}` : "";
  return `${id}${tail}`;
}

export function setPendingRecord(callUuid: string, recordUrl: string, lang?: string): void {
  purge();
  const key = keyFor(callUuid);
  const prev = store.get(key);
  store.set(key, {
    recordUrl,
    speech: prev?.speech,
    lang: lang || prev?.lang,
    expires: Date.now() + TTL_MS,
  });
}

export function getPendingRecord(callUuid: string): string | null {
  purge();
  return store.get(keyFor(callUuid))?.recordUrl ?? null;
}

export function setPendingSpeech(callUuid: string, speech: string, lang?: string): void {
  purge();
  const key = keyFor(callUuid, speech);
  store.set(key, {
    speech: speech.trim(),
    recordUrl: store.get(keyFor(callUuid))?.recordUrl,
    lang,
    expires: Date.now() + TTL_MS,
  });
}

export function getPendingSpeech(callUuid: string, speechHint?: string): string | null {
  purge();
  if (speechHint?.trim()) {
    const hit = store.get(keyFor(callUuid, speechHint));
    if (hit?.speech) return hit.speech;
  }
  return store.get(keyFor(callUuid))?.speech ?? null;
}

export function clearPending(callUuid: string): void {
  purge();
  for (const k of store.keys()) {
    if (k.startsWith(callUuid.trim())) store.delete(k);
  }
}
