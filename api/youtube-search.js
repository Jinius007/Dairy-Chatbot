/** Search YouTube — OFFICIAL dairy cooperative / NDDB channels ONLY */
export const config = { runtime: "edge" };

import {
  isOfficialVideo,
  resolveOfficialChannelIds,
} from "./youtube-channels.js";

/** Verified NDDB official videos (fallback when API search finds nothing) */
const CURATED = [
  { id: "4TCt7b1q5aQ", topics: ["ration", "feed", "balanced", "poshan", "aahar", "lcf", "tdn", "concentrate", "fodder"] },
  { id: "LZnqdJjCJiE", topics: ["clean", "milk", "cooperative", "dcs", "procurement", "quality", "hygiene", "milking"] },
];

const TOPIC_RULES = [
  { re: /ration|balanced|least.?cost|lcf|poshan|aahar|feed|fodder|concentrate|चारा|खुराक|रेशन|आहार|tdn|berseem|silage/i, en: "ration balancing programme cattle feed", topics: ["ration", "feed"] },
  { re: /mastitis|thanela|थनैला|udder|teat|milk clot|sanit/i, en: "mastitis udder health clean milk", topics: ["mastitis", "udder", "clean", "milk"] },
  { re: /clean milk|hygiene|adulteration|dcs|collection centre|स्वच्छ|milking hygiene/i, en: "clean milk production cooperative", topics: ["clean", "milk", "hygiene"] },
  { re: /cooperative|amul|union|dcs|sell milk|pour milk|procurement|सहकार|सहकारी|दूध बेच/i, en: "cooperative milk procurement dairy union", topics: ["cooperative", "amul", "dcs"] },
  { re: /insemination|breeding|heat|ai\b|garbh|calving|pregnancy|प्रसव|गर्मी|गर्भ/i, en: "artificial insemination cattle breeding", topics: ["ai", "breeding"] },
  { re: /vaccin|fmd|foot.?mouth|hs\b|black quarter|brucellosis|टीक/i, en: "cattle vaccination dairy", topics: ["vaccination"] },
  { re: /nddb|national dairy/i, en: "NDDB dairy development cooperative", topics: ["nddb"] },
];

const NOISE =
  /youtube|youtu\.be|video link|वीडियो|youtube link|watch video|कोई वीडियो|link|लिंक|give me|send|share|please|कृपया|दो|de do|bhejo|भेजो|link de|verified|सत्यापित|tap to open|📺/gi;

function videoUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

function extractTopics(raw) {
  const text = String(raw || "");
  const matched = [];
  let englishQuery = "";

  for (const rule of TOPIC_RULES) {
    if (rule.re.test(text)) {
      matched.push(...rule.topics);
      if (!englishQuery) englishQuery = rule.en;
    }
  }

  const stripped = text.replace(NOISE, " ").replace(/\s+/g, " ").trim();
  const latinWords = stripped
    .split(/\s+/)
    .filter((w) => w.length > 3 && /[a-zA-Z]/.test(w))
    .slice(0, 8)
    .join(" ");

  if (!englishQuery && latinWords.length > 8) {
    englishQuery = `${latinWords} dairy cattle`;
  } else if (!englishQuery) {
    englishQuery = "dairy farming cooperative extension";
  }

  return { englishQuery, topics: [...new Set(matched)], stripped };
}

function scoreCurated(query) {
  const q = query.toLowerCase();
  return CURATED.map((v) => {
    let score = 0;
    for (const t of v.topics) {
      if (q.includes(t)) score += 3;
    }
    if (/ration|feed|aahar|poshan|चारा|खुराक|रेशन/.test(q) && v.topics.some((t) => /ration|feed|fodder/.test(t))) score += 5;
    if (/clean|hygiene|milking|स्वच्छ|dcs/.test(q) && v.topics.some((t) => /clean|milk|hygiene/.test(t))) score += 5;
    return { v, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function matchCurated(query, max) {
  const scored = scoreCurated(query);
  if (scored.length === 0) return [];
  return scored.slice(0, max).map((x) => x.v.id);
}

async function fetchOembed(id) {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl(id))}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function verifyOfficial(id, apiKey, allowedChannelIds) {
  const oembed = await fetchOembed(id);
  if (!oembed?.title) return null;
  const ok = await isOfficialVideo(id, oembed, apiKey, allowedChannelIds);
  if (!ok) return null;
  return {
    id,
    title: String(oembed.title),
    url: videoUrl(id),
    channel: oembed.author_name || "",
  };
}

async function verifyOfficialIds(ids, max, apiKey, allowedChannelIds) {
  const out = [];
  for (const id of ids) {
    const v = await verifyOfficial(id, apiKey, allowedChannelIds);
    if (v) out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

async function searchInChannel(channelId, query, max, key) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("q", query);
  url.searchParams.set("order", "relevance");
  url.searchParams.set("maxResults", String(Math.min(max + 2, 10)));
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("key", key);

  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.items || [])
    .map((item) => ({
      id: item?.id?.videoId,
      title: item?.snippet?.title || "",
      description: item?.snippet?.description || "",
      channel: item?.snippet?.channelTitle || "",
      channelId: item?.snippet?.channelId || channelId,
    }))
    .filter((x) => typeof x.id === "string");
}

function rankResults(items, topics, englishQuery) {
  const qTokens = `${englishQuery} ${topics.join(" ")}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  return items
    .map((item) => {
      const blob = `${item.title} ${item.description} ${item.channel}`.toLowerCase();
      let score = 0;
      for (const t of qTokens) if (blob.includes(t)) score += 2;
      for (const t of topics) if (blob.includes(t)) score += 4;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);
}

async function searchOfficialChannels(query, max, key, allowedChannelIds) {
  const { englishQuery, topics } = extractTopics(query);
  const channelIds = [...allowedChannelIds];
  if (channelIds.length === 0) return [];

  const seen = new Set();
  const pooled = [];

  // Search official channels in batches (quota-friendly)
  const batchSize = 6;
  for (let i = 0; i < channelIds.length && pooled.length < max + 10; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((channelId) => searchInChannel(channelId, englishQuery, 3, key)),
    );
    for (const items of results) {
      for (const item of items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        pooled.push(item);
      }
    }
  }

  return rankResults(pooled, topics, englishQuery)
    .slice(0, max + 4)
    .map((x) => x.id);
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { query = "dairy farming", lang = "hi", max = 3 } = await request.json();
    const limit = Math.min(Math.max(Number(max) || 3, 1), 5);
    const apiKey = process.env.YOUTUBE_API_KEY || "";
    const q = String(query);

    const { englishQuery } = extractTopics(q);
    let source = "none";
    let videos = [];

    const allowedChannelIds = await resolveOfficialChannelIds(apiKey);

    // 1. Search ONLY within official cooperative / NDDB channels
    if (apiKey && allowedChannelIds.size > 0) {
      const apiIds = await searchOfficialChannels(q, limit, apiKey, allowedChannelIds);
      if (apiIds.length > 0) {
        videos = await verifyOfficialIds(apiIds, limit, apiKey, allowedChannelIds);
        if (videos.length > 0) source = "official_channels";
      }
    }

    // 2. Curated NDDB official videos (topic-matched)
    if (videos.length < limit) {
      const curatedIds = matchCurated(q, limit);
      const curatedVideos = await verifyOfficialIds(curatedIds, limit, apiKey, allowedChannelIds);
      const seen = new Set(videos.map((v) => v.id));
      for (const v of curatedVideos) {
        if (seen.has(v.id)) continue;
        videos.push(v);
        seen.add(v.id);
        if (videos.length >= limit) break;
      }
      if (curatedVideos.length > 0 && source === "none") source = "curated_official";
      else if (curatedVideos.length > 0) source = "mixed_official";
    }

    return new Response(
      JSON.stringify({
        videos: videos.slice(0, limit),
        query: q,
        searchTerms: englishQuery,
        source,
        hasApiKey: Boolean(apiKey),
        officialChannelCount: allowedChannelIds.size,
        policy: "official_cooperative_channels_only",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=1800",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (e) {
    console.error("youtube-search error:", e);
    return new Response(
      JSON.stringify({ videos: [], query: "dairy farming", fallback: true, source: "error", policy: "official_cooperative_channels_only" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  }
}
