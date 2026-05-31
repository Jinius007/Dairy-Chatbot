export type VerifiedVideo = {
  id: string;
  title: string;
  url: string;
  channel?: string;
};

const YOUTUBE_REQUEST =
  /youtube|youtu\.be|video link|वीडियो|youtube link|watch video|कोई वीडियो|ভিডিও|வீடியோ|వీడియో|व्हिडिओ|યુટ્યુબ|ಯೂಟ್ಯೂಬ್|യൂട്യൂബ്|ਯੂਟਿਊਬ|video দেখ|लिंक दे|link de|वीडियो लिंक|youtube का/i;

const YOUTUBE_URL_RE =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})[^\s\])>]*/g;

export function isYoutubeRequest(text: string): boolean {
  return YOUTUBE_REQUEST.test(text);
}

export function detectLangFromText(text: string): string {
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[a-zA-Z]/.test(text)) return "en";
  return "hi";
}

/** Build a rich search string from user message + recent chat + optional AI answer */
export function buildVideoQuery(userText: string, recentContext = "", assistantContext = ""): string {
  const combined = [recentContext, userText, assistantContext]
    .filter(Boolean)
    .join(" ")
    .replace(YOUTUBE_REQUEST, " ")
    .replace(/link|लिंक|give me|send|share|please|कृपया|दो|de do|bhejo|भेजो|verified|सत्यापित|📺/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return combined.slice(0, 400) || "dairy farming india";
}

export async function fetchVerifiedVideos(query: string, lang: string): Promise<VerifiedVideo[]> {
  try {
    const resp = await fetch(`${window.location.origin}/api/youtube-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, lang, max: 3 }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data?.videos) ? data.videos : [];
  } catch {
    return [];
  }
}

/** Remove any YouTube URL whose video ID is not in the verified allow-list */
export function stripUnverifiedYoutubeUrls(text: string, allowedIds: Set<string>): string {
  return text
    .replace(YOUTUBE_URL_RE, (match, id: string) => (allowedIds.has(id) ? match : ""))
    .replace(/^\s*[-•*]\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function appendVerifiedVideoBlock(text: string, videos: VerifiedVideo[], lang: string): string {
  const cleaned = stripUnverifiedYoutubeUrls(
    text,
    new Set(videos.map((v) => v.id)),
  );

  if (videos.length === 0) {
    const note =
      lang === "en"
        ? "\n\n📺 Could not fetch a verified video link right now. Search on YouTube: \"" + buildVideoQuery(text) + " dairy hindi\""
        : "\n\n📺 अभी सत्यापित वीडियो लिंक नहीं मिला। YouTube पर खोजें: \"" + buildVideoQuery(text) + " dairy hindi\"";
    return cleaned + note;
  }

  const header =
    lang === "en"
      ? "\n\n📺 Verified video links (tap to open):"
      : lang === "bn"
        ? "\n\n📺 যাচাইকৃত ভিডিও লিংক:"
        : "\n\n📺 सत्यापित वीडियो लिंक (खोलने के लिए टैप करें):";

  const block = videos
    .map((v, i) => `${i + 1}. ${v.title}${v.channel ? ` — ${v.channel}` : ""}\n${v.url}`)
    .join("\n");

  return `${cleaned}${header}\n${block}`;
}
