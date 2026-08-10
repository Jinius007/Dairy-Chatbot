/** Short-lived MP3 cache for Vobiz Play URLs (same warm Catalyst instance). */
type Entry = { bytes: Uint8Array; expires: number };

const store = new Map<string, Entry>();
const TTL_MS = 20 * 60 * 1000;

function purge(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
}

export function putAudio(bytes: Uint8Array): string {
  purge();
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  store.set(id, { bytes, expires: Date.now() + TTL_MS });
  return id;
}

export function getAudio(id: string): Uint8Array | null {
  purge();
  const clean = id.replace(/\.mp3$/i, "");
  const entry = store.get(clean);
  if (!entry || entry.expires <= Date.now()) {
    store.delete(clean);
    return null;
  }
  return entry.bytes;
}
