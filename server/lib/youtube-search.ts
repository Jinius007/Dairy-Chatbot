// Verified dairy videos — OFFICIAL cooperative / NDDB channels ONLY

import {
  isOfficialVideo,
  resolveOfficialChannelIds,
} from "./youtube-channels.ts";

export type YoutubeVideo = {
  id: string;
  title: string;
  url: string;
  channel?: string;
};

const CURATED_VIDEOS: { id: string; title: string; topics: string[] }[] = [
  { id: "4TCt7b1q5aQ", title: "Ration Balancing Programme", topics: ["ration", "feed", "balanced", "poshan", "aahar", "lcf", "tdn"] },
  { id: "LZnqdJjCJiE", title: "NDDB Samvad — Clean milk at DCS", topics: ["clean milk", "cooperative", "dcs", "procurement", "quality"] },
  { id: "TiyrcCcjuVA", title: "Lumpy Skin Disease awareness (Hindi)", topics: ["lumpy", "lsd", "skin disease", "vaccination"] },
  { id: "SFQT1w5q5wM", title: "Awareness film on bovine mastitis (Hindi)", topics: ["mastitis", "udder", "milk", "health"] },
  { id: "uziQPBVq0yc", title: "Film on green fodder (Hindi)", topics: ["green fodder", "fodder", "chara", "napier"] },
  { id: "BmHI6wiTXZA", title: "Moringa plantation for green fodder (Hindi)", topics: ["moringa", "fodder", "green"] },
  { id: "Hrz7kar1a-Y", title: "Manure management at Zakariyapura Anand (Hindi)", topics: ["manure", "biogas", "waste", "dung"] },
];

const YOUTUBE_REQUEST = /youtube|youtu\.be|video link|वीडियो|youtube link|watch video|कोई वीडियो|ভিডিও|வீடியோ|వీడియో|व्हिडिओ|યુટ્યુબ|youtube का|लिंक दे|link de/i;

function videoUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

async function fetchOembed(id: string) {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl(id))}&format=json`,
      { signal: AbortSignal.timeout(4000) },
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function verifyOfficialVideo(
  id: string,
  apiKey: string | undefined,
  allowed: Set<string>,
): Promise<YoutubeVideo | null> {
  const oembed = await fetchOembed(id);
  if (!oembed?.title) return null;
  const ok = await isOfficialVideo(id, oembed, apiKey, allowed);
  if (!ok) return null;
  return { id, title: String(oembed.title), url: videoUrl(id), channel: oembed.author_name };
}

async function searchInChannel(channelId: string, query: string, max: number, key: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("q", query);
  url.searchParams.set("order", "relevance");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("key", key);
  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return [] as string[];
  const data = await resp.json();
  return (data.items || [])
    .map((item: { id?: { videoId?: string } }) => item?.id?.videoId)
    .filter((id: unknown): id is string => typeof id === "string");
}

function matchCurated(query: string, max: number): string[] {
  const q = query.toLowerCase();
  const scored = CURATED_VIDEOS.map((v) => {
    let score = 0;
    for (const t of v.topics) if (q.includes(t)) score += 2;
    if (/ration|feed|aahar|poshan|चारा|खुराक/.test(q) && v.topics.some((t) => /ration|feed/.test(t))) score += 3;
    if (/clean|dcs|milking|स्वच्छ/.test(q) && v.topics.some((t) => /clean|dcs/.test(t))) score += 3;
    return { id: v.id, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
  return scored.map((x) => x.id);
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
  else if (/[\u0900-\u097F]/.test(combined)) lang = "hi";
  else if (/[a-zA-Z]/.test(combined)) lang = "en";
  const stripped = last.replace(YOUTUBE_REQUEST, " ").replace(/\s+/g, " ").trim();
  const topic = stripped.length > 8 ? stripped : combined.replace(YOUTUBE_REQUEST, " ").trim();
  return { query: topic.slice(0, 200) || "dairy cooperative extension", lang };
}

export async function findYoutubeVideos(query: string, _lang: string, max = 3): Promise<YoutubeVideo[]> {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  const allowed = await resolveOfficialChannelIds(apiKey);
  const out: YoutubeVideo[] = [];
  const seen = new Set<string>();

  if (apiKey && allowed.size > 0) {
    const q = `${query} dairy cooperative`.slice(0, 120);
    for (const channelId of allowed) {
      if (out.length >= max) break;
      const ids = await searchInChannel(channelId, q, 3, apiKey);
      for (const id of ids) {
        if (seen.has(id)) continue;
        const v = await verifyOfficialVideo(id, apiKey, allowed);
        if (!v) continue;
        seen.add(id);
        out.push(v);
        if (out.length >= max) break;
      }
    }
  }

  if (out.length < max) {
    for (const id of matchCurated(query.toLowerCase(), max)) {
      if (seen.has(id)) continue;
      const v = await verifyOfficialVideo(id, apiKey, allowed);
      if (!v) continue;
      seen.add(id);
      out.push(v);
      if (out.length >= max) break;
    }
  }

  return out.slice(0, max);
}

export function formatYoutubeHint(videos: YoutubeVideo[], query: string): string {
  if (videos.length === 0) {
    return [
      "VERIFIED YOUTUBE VIDEOS: No official NDDB/cooperative/union channel video found for this topic.",
      "Do NOT invent or guess any YouTube URL or video ID.",
      "Tell the farmer only official dairy cooperative and NDDB YouTube channels have verified videos.",
      `Suggested search on NDDB channel: "${query}"`,
    ].join("\n");
  }
  const lines = videos.map((v, i) => `${i + 1}. ${v.title}${v.channel ? ` (${v.channel})` : ""}\n   ${v.url}`);
  return [
    "VERIFIED YOUTUBE VIDEOS — OFFICIAL NDDB / COOPERATIVE / MILK UNION CHANNELS ONLY:",
    ...lines,
    "Include these links in your answer. Copy URLs exactly as shown.",
    "Do NOT add any other YouTube URL.",
  ].join("\n");
}

export async function tryYoutubeVideoHint(messages: { role: string; content: string }[]): Promise<string | null> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  if (!isYoutubeRequest(lastUser)) return null;
  const { query, lang } = buildVideoSearchQuery(messages);
  const videos = await findYoutubeVideos(query, lang, 3);
  return formatYoutubeHint(videos, query);
}
