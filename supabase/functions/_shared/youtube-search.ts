// Verified dairy extension videos + live YouTube search (no hallucinated URLs)

export type YoutubeVideo = {
  id: string;
  title: string;
  url: string;
  channel?: string;
};

/** Pre-verified videos (oembed-checked). Used when API search unavailable. */
export const CURATED_VIDEOS: { id: string; title: string; channel: string; topics: string[]; langs: string[] }[] = [
  { id: "4TCt7b1q5aQ", title: "Ration Balancing Programme", channel: "NDDB", topics: ["ration", "feed", "balanced", "poshan", "aahar", "lcf", "tdn"], langs: ["hi", "en"] },
  { id: "LZnqdJjCJiE", title: "NDDB Samvad — Clean milk production at DCS and Producer level", channel: "National Dairy Development Board", topics: ["clean milk", "cooperative", "dcs", "procurement", "quality"], langs: ["hi", "en"] },
  { id: "-LowRTqYC-c", title: "Demonstration on clean milk production", channel: "Extension", topics: ["clean milk", "milking", "hygiene", "quality"], langs: ["hi", "en"] },
  { id: "0HpzXhAz09E", title: "Amul: How Farmers Built India's Milk Revolution", channel: "Documentary", topics: ["cooperative", "amul", "dairy cooperative", "sell milk", "procurement"], langs: ["en", "hi"] },
  { id: "0sODT0C8quA", title: "Artificial Insemination in Cow", channel: "Extension", topics: ["ai", "insemination", "breeding", "heat", "pregnancy"], langs: ["hi", "en"] },
  { id: "rs-cGqA7yyM", title: "Mastitis treatment and udder infection", channel: "Veterinary", topics: ["mastitis", "udder", "thanela", "infection"], langs: ["hi", "en"] },
  { id: "XG0_XaMKT_w", title: "History of NDDB (National Dairy Development Board)", channel: "VetVlogs", topics: ["nddb", "cooperative", "dairy development"], langs: ["hi", "en"] },
];

const LANG_SEARCH: Record<string, string> = {
  hi: "hindi", bn: "bengali", ta: "tamil", te: "telugu", mr: "marathi",
  gu: "gujarati", kn: "kannada", ml: "malayalam", pa: "punjabi", or: "odia",
  as: "assamese", ur: "urdu", en: "english",
};

const YOUTUBE_REQUEST = /youtube|youtu\.be|video link|वीडियो|youtube link|watch video|कोई वीडियो|ভিডিও|வீடியோ|వీడియో|व्हिडिओ|યુટ્યુબ|ಯೂಟ್ಯೂಬ್|യൂട്യൂബ്|ਯੂਟਿਊਬ|video দেখ|लिंक दे|link de/i;

function videoUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

async function verifyVideo(id: string): Promise<YoutubeVideo | null> {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl(id))}&format=json`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.title) return null;
    return { id, title: String(data.title), url: videoUrl(id), channel: data.author_name };
  } catch {
    return null;
  }
}

async function searchViaApi(query: string, lang: string, max: number): Promise<YoutubeVideo[]> {
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) return [];
  const langHint = LANG_SEARCH[lang] || "hindi";
  const q = `${query} dairy farming ${langHint} india`.trim();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("q", q);
  url.searchParams.set("relevanceLanguage", lang === "en" ? "en" : "hi");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("key", key);

  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return [];
  const data = await resp.json();
  const items = Array.isArray(data?.items) ? data.items : [];
  const out: YoutubeVideo[] = [];
  for (const item of items) {
    const id = item?.id?.videoId;
    if (!id || typeof id !== "string") continue;
    const verified = await verifyVideo(id);
    if (verified) out.push(verified);
    if (out.length >= max) break;
  }
  return out;
}

function matchCurated(query: string, lang: string, max: number): YoutubeVideo[] {
  const q = query.toLowerCase();
  const scored = CURATED_VIDEOS.map((v) => {
    let score = 0;
    for (const t of v.topics) if (q.includes(t) || t.split(" ").some((w) => q.includes(w))) score += 2;
    if (v.langs.includes(lang)) score += 1;
    if (/ration|feed|aahar|poshan|चारा|खुराक/.test(q) && v.topics.some((t) => /ration|feed/.test(t))) score += 3;
    if (/mastitis|thanela|udder|थनैला/.test(q) && v.topics.some((t) => /mastitis|udder/.test(t))) score += 3;
    if (/cooperative|amul|dcs|sell|pour|बेच|दूध/.test(q) && v.topics.some((t) => /cooperative|clean milk|procurement/.test(t))) score += 3;
    if (/ai|breeding|heat|गर्भ/.test(q) && v.topics.some((t) => /ai|breeding/.test(t))) score += 3;
    return { v, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return scored.map(({ v }) => ({
    id: v.id,
    title: v.title,
    url: videoUrl(v.id),
    channel: v.channel,
  }));
}

export function isYoutubeRequest(text: string): boolean {
  return YOUTUBE_REQUEST.test(text);
}

export function buildVideoSearchQuery(messages: { role: string; content: string }[]): { query: string; lang: string } {
  const users = messages.filter((m) => m.role === "user").slice(-4);
  const combined = users.map((m) => m.content).join(" ");
  const last = users.at(-1)?.content || combined;

  let lang = "hi";
  if (/[\u0980-\u09FF]/.test(combined)) lang = "bn";
  else if (/[\u0B80-\u0BFF]/.test(combined)) lang = "ta";
  else if (/[\u0C00-\u0C7F]/.test(combined)) lang = "te";
  else if (/[\u0A80-\u0AFF]/.test(combined)) lang = "gu";
  else if (/[\u0C80-\u0CFF]/.test(combined)) lang = "kn";
  else if (/[\u0D00-\u0D7F]/.test(combined)) lang = "ml";
  else if (/[\u0900-\u097F]/.test(combined)) lang = "hi";
  else if (/[a-zA-Z]/.test(combined) && !/[\u0900-\u09FF]/.test(combined)) lang = "en";

  const stripped = last
    .replace(YOUTUBE_REQUEST, " ")
    .replace(/link|लिंक|give me|send|share|please|कृपया|दो|de do/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const topic = stripped.length > 8 ? stripped : combined.replace(YOUTUBE_REQUEST, " ").trim();
  return { query: topic.slice(0, 120) || "dairy farming", lang };
}

export async function findYoutubeVideos(
  query: string,
  lang: string,
  max = 3,
): Promise<YoutubeVideo[]> {
  const fromApi = await searchViaApi(query, lang, max);
  if (fromApi.length > 0) return fromApi;

  const curated = matchCurated(query.toLowerCase(), lang, max);
  const verified: YoutubeVideo[] = [];
  for (const v of curated) {
    const ok = await verifyVideo(v.id);
    if (ok) verified.push(ok);
    if (verified.length >= max) break;
  }
  return verified;
}

export function formatYoutubeHint(videos: YoutubeVideo[], query: string): string {
  if (videos.length === 0) {
    return [
      "VERIFIED YOUTUBE VIDEOS: No verified video found for this topic right now.",
      "Do NOT invent or guess any YouTube URL or video ID.",
      "Tell the farmer to search on YouTube or the NDDB channel: https://www.youtube.com/results?search_query=NDDB+dairy+cooperative+hindi",
      `Suggested search: "${query} dairy farming hindi"`,
    ].join("\n");
  }
  const lines = videos.map((v, i) => `${i + 1}. ${v.title}${v.channel ? ` (${v.channel})` : ""}\n   ${v.url}`);
  return [
    "VERIFIED YOUTUBE VIDEOS (use ONLY these exact URLs — do NOT invent any other YouTube links):",
    ...lines,
    "Include these links in your answer. Copy URLs exactly as shown.",
  ].join("\n");
}

export async function tryYoutubeVideoHint(
  messages: { role: string; content: string }[],
): Promise<string | null> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  if (!isYoutubeRequest(lastUser)) return null;
  const { query, lang } = buildVideoSearchQuery(messages);
  const videos = await findYoutubeVideos(query, lang, 3);
  return formatYoutubeHint(videos, query);
}
