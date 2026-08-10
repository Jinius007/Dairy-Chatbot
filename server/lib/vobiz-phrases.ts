import { normalizeVobizLang, vobizPhraseText, type VobizPhraseKey } from "./vobiz-i18n.ts";
import { cleanTtsText, synthesizeSpeech } from "./tts.ts";
import { readStaticPhrase } from "./vobiz-assets.ts";

const memoryCache = new Map<string, Buffer>();
const synthInflight = new Map<string, Promise<Buffer | null>>();
let warmStarted = false;

function cacheKey(lang: string, name: string): string {
  return `${normalizeVobizLang(lang)}:${name}`;
}

export async function getPhraseBytes(name: string, lang = "hi"): Promise<Buffer | null> {
  const key = name.replace(/[^a-z0-9-]/gi, "");
  const l = normalizeVobizLang(lang);
  const memKey = cacheKey(l, key);

  const fromDisk = readStaticPhrase(key);
  if (fromDisk && l === "hi") return fromDisk;

  const cached = memoryCache.get(memKey);
  if (cached) return cached;

  const inflight = synthInflight.get(memKey);
  if (inflight) return inflight;

  const text = vobizPhraseText(key as VobizPhraseKey, l);
  if (!text) return null;

  const job = (async () => {
    try {
      const { audio } = await synthesizeSpeech(cleanTtsText(text, l), l, { callMode: true });
      const buf = Buffer.from(audio);
      memoryCache.set(memKey, buf);
      return buf;
    } catch (e) {
      console.error(`vobiz phrase synth failed (${memKey}):`, e);
      if (l !== "hi") return getPhraseBytes(key, "hi");
      return null;
    } finally {
      synthInflight.delete(memKey);
    }
  })();

  synthInflight.set(memKey, job);
  return job;
}

/** Background only — never await inside Vobiz webhook handlers. */
export function warmVobizPhrasesBackground(lang = "hi"): void {
  if (warmStarted) return;
  warmStarted = true;
  void (async () => {
    for (const key of ["greeting", "prompt", "wait", "error"] as VobizPhraseKey[]) {
      await getPhraseBytes(key, lang);
    }
  })().catch((e) => console.error("warmVobizPhrasesBackground:", e));
}

export function phrasePlayUrl(base: string, name: string, lang = "hi"): string {
  const safe = name.replace(/[^a-z0-9-]/gi, "");
  const l = normalizeVobizLang(lang);
  return `${base}/vobiz/phrase/${safe}.mp3?lang=${encodeURIComponent(l)}`;
}
