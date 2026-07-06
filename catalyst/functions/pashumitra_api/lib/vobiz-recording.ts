/** Download farmer recordings from Vobiz (requires account auth — public fetch returns 401). */

function env(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key];
  // @ts-expect-error Deno shim
  if (typeof Deno !== "undefined") return Deno.env.get(key);
  return undefined;
}

export function getVobizCredentials(): { authId: string; authToken: string } | null {
  const authId = env("VOBIZ_AUTH_ID")?.trim();
  const authToken = env("VOBIZ_AUTH_TOKEN")?.trim();
  if (!authId || !authToken) return null;
  return { authId, authToken };
}

export function hasVobizCredentials(): boolean {
  return Boolean(getVobizCredentials());
}

export function pickRecordingId(body: Record<string, unknown>, query: Record<string, unknown>): string {
  return String(
    body.RecordingID || body.RecordingId || body.recording_id || body.RecordingUUID ||
    query.RecordingID || query.RecordingId || query.recording_id || "",
  ).trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchRecordingBytes(
  url: string,
  auth: { authId: string; authToken: string },
  timeoutMs = 25000,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "X-Auth-ID": auth.authId,
        "X-Auth-Token": auth.authToken,
        Accept: "audio/*,*/*",
        "User-Agent": "BharatPashudhan-Vobiz/1.0",
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Recording download ${res.status}: ${detail.slice(0, 160)}`);
    }
    const mime = res.headers.get("content-type") || guessMimeFromUrl(url);
    return { bytes: new Uint8Array(await res.arrayBuffer()), mime };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRecordingById(
  recordingId: string,
  auth: { authId: string; authToken: string },
): Promise<{ bytes: Uint8Array; mime: string }> {
  const metaUrl = `https://api.vobiz.ai/api/v1/Account/${encodeURIComponent(auth.authId)}/Recording/${encodeURIComponent(recordingId)}/`;
  const metaRes = await fetch(metaUrl, {
    headers: {
      "X-Auth-ID": auth.authId,
      "X-Auth-Token": auth.authToken,
      "Content-Type": "application/json",
    },
  });
  if (!metaRes.ok) {
    const detail = await metaRes.text().catch(() => "");
    throw new Error(`Recording metadata ${metaRes.status}: ${detail.slice(0, 160)}`);
  }
  const meta = await metaRes.json() as { recording_url?: string; recording_format?: string };
  const url = meta.recording_url?.trim();
  if (!url) throw new Error("Vobiz recording metadata missing recording_url");
  const mime = meta.recording_format === "wav" ? "audio/wav" : "audio/mpeg";
  const { bytes } = await fetchRecordingBytes(url, auth);
  return { bytes, mime };
}

function guessMimeFromUrl(url: string): string {
  if (/\.mp3(\?|$)/i.test(url)) return "audio/mpeg";
  if (/\.wav(\?|$)/i.test(url)) return "audio/wav";
  if (/\.m4a(\?|$)/i.test(url)) return "audio/mp4";
  return "audio/wav";
}

/**
 * Vobiz posts RecordUrl before the file is always ready — retry with auth headers.
 * See https://docs.vobiz.ai/recording/download-recording
 */
export async function downloadVobizRecording(
  recordUrl: string,
  recordingId?: string | null,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const auth = getVobizCredentials();
  if (!auth) {
    throw new Error("VOBIZ_AUTH_ID and VOBIZ_AUTH_TOKEN must be set on Catalyst for phone STT");
  }

  const url = recordUrl.trim();
  if (!url.startsWith("http")) throw new Error("Invalid recording URL from Vobiz");

  const delays = [0, 1200, 2400, 4000];
  let lastErr: unknown;
  for (const delay of delays) {
    if (delay > 0) await sleep(delay);
    try {
      return await fetchRecordingBytes(url, auth);
    } catch (e) {
      lastErr = e;
      console.warn(`vobiz recording download retry (${delay}ms):`, e instanceof Error ? e.message : e);
    }
  }

  if (recordingId) {
    try {
      return await fetchRecordingById(recordingId, auth);
    } catch (e) {
      console.error("vobiz recording by ID failed:", e);
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Could not download Vobiz recording");
}
