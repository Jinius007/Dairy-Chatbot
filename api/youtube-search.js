/** Search YouTube and return oembed-verified video links only */
export const config = { runtime: "edge" };

const CURATED = [
  { id: "4TCt7b1q5aQ", title: "Ration Balancing Programme", channel: "NDDB", topics: ["ration", "feed", "balanced", "poshan", "aahar", "lcf", "tdn", "concentrate", "fodder"] },
  { id: "LZnqdJjCJiE", title: "NDDB Samvad — Clean milk at DCS", channel: "NDDB", topics: ["clean", "milk", "cooperative", "dcs", "procurement", "quality", "hygiene", "milking"] },
  { id: "-LowRTqYC-c", title: "Clean milk production demonstration", channel: "Extension", topics: ["clean", "milk", "milking", "hygiene", "quality"] },
  { id: "0HpzXhAz09E", title: "Amul cooperative milk revolution", channel: "Documentary", topics: ["cooperative", "amul", "sell", "procurement", "union"] },
  { id: "0sODT0C8quA", title: "Artificial insemination in cow", channel: "Extension", topics: ["ai", "insemination", "breeding", "heat", "pregnancy", "garbh"] },
  { id: "rs-cGqA7yyM", title: "Mastitis treatment udder infection", channel: "Veterinary", topics: ["mastitis", "udder", "thanela", "infection", "thanela"] },
  { id: "XG0_XaMKT_w", title: "History of NDDB", channel: "NDDB", topics: ["nddb", "cooperative", "dairy", "development"] },
];

/** Map farmer language (any script) → English YouTube search terms */
const TOPIC_RULES = [
  { re: /ration|balanced|least.?cost|lcf|poshan|aahar|feed|fodder|concentrate|चारा|खुराक|रेशन|आहार|tdn|berseem|silage/i, en: "ration balancing programme dairy cattle NDDB", topics: ["ration", "feed", "balanced", "fodder"] },
  { re: /mastitis|thanela|थनैला|udder|teat|milk clot|sanit/i, en: "mastitis treatment dairy cow udder", topics: ["mastitis", "udder"] },
  { re: /clean milk|hygiene|adulteration|dcs|collection centre|स्वच्छ|गंदगी|milking hygiene/i, en: "clean milk production dairy cooperative NDDB", topics: ["clean", "milk", "hygiene"] },
  { re: /cooperative|amul|union|dcs|sell milk|pour milk|procurement|सहकार|सहकारी|दूध बेच|collection/i, en: "dairy cooperative milk procurement NDDB Amul", topics: ["cooperative", "amul", "dcs"] },
  { re: /insemination|breeding|heat|ai\b|garbh|calving|pregnancy|प्रसव|गर्मी|गर्भ/i, en: "artificial insemination cattle breeding heat detection", topics: ["ai", "breeding", "insemination"] },
  { re: /vaccin|fmd|foot.?mouth|hs\b|black quarter|brucellosis|टीक/i, en: "cattle vaccination FMD dairy farm india", topics: ["vaccination"] },
  { re: /nddb|national dairy/i, en: "NDDB National Dairy Development Board", topics: ["nddb"] },
];

const LANG_HINT = {
  hi: "hindi", bn: "bengali", ta: "tamil", te: "telugu", mr: "marathi",
  gu: "gujarati", kn: "kannada", ml: "malayalam", pa: "punjabi", or: "odia",
  as: "assamese", ur: "urdu", en: "english",
};

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

  // Residual meaningful words (latin) from stripped query
  const stripped = text.replace(NOISE, " ").replace(/\s+/g, " ").trim();
  const latinWords = stripped
    .split(/\s+/)
    .filter((w) => w.length > 3 && /[a-zA-Z]/.test(w))
    .slice(0, 8)
    .join(" ");

  if (!englishQuery && latinWords.length > 8) {
    englishQuery = `${latinWords} dairy cattle india`;
  } else if (!englishQuery) {
    englishQuery = "dairy farming extension india NDDB";
  }

  return { englishQuery, topics: [...new Set(matched)], stripped };
}

function scoreCurated(query, lang) {
  const q = query.toLowerCase();
  return CURATED.map((v) => {
    let score = 0;
    for (const t of v.topics) {
      if (q.includes(t)) score += 3;
      if (t.split(" ").some((w) => w.length > 3 && q.includes(w))) score += 1;
    }
    if (/ration|feed|aahar|poshan|चारा|खुराक|रेशन/.test(q) && v.topics.some((t) => /ration|feed|fodder/.test(t))) score += 5;
    if (/mastitis|thanela|udder|थनैला/.test(q) && v.topics.some((t) => /mastitis|udder/.test(t))) score += 5;
    if (/clean|hygiene|milking|स्वच्छ/.test(q) && v.topics.some((t) => /clean|hygiene|milking/.test(t))) score += 5;
    if (/cooperative|amul|dcs|सहकार/.test(q) && v.topics.some((t) => /cooperative|amul|dcs/.test(t))) score += 5;
    if (/breeding|insemination|ai\b|heat|garmi/.test(q) && v.topics.some((t) => /breeding|insemination|ai/.test(t))) score += 5;
    if (v.channel === "NDDB") score += 1;
    return { v, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function matchCurated(query, lang, max) {
  const scored = scoreCurated(query, lang);
  if (scored.length === 0) return [];
  return scored.slice(0, max).map((x) => x.v.id);
}

async function verify(id) {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl(id))}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.title) return null;
    return {
      id,
      title: String(data.title),
      url: videoUrl(id),
      channel: data.author_name || "",
    };
  } catch {
    return null;
  }
}

async function youtubeSearch(params, key) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("regionCode", "IN");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }

  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) {
    const err = await resp.text().catch(() => "");
    console.error("YouTube search API error:", resp.status, err.slice(0, 200));
    return [];
  }
  const data = await resp.json();
  return (data.items || [])
    .map((item) => ({
      id: item?.id?.videoId,
      title: item?.snippet?.title || "",
      description: item?.snippet?.description || "",
      channel: item?.snippet?.channelTitle || "",
    }))
    .filter((x) => typeof x.id === "string");
}

function rankResults(items, topics, englishQuery) {
  const qTokens = `${englishQuery} ${topics.join(" ")}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const dairyTokens = ["dairy", "cattle", "cow", "buffalo", "milk", "farm", "nddb", "livestock", "vet", "pashu"];

  return items
    .map((item) => {
      const blob = `${item.title} ${item.description} ${item.channel}`.toLowerCase();
      let score = 0;
      for (const t of qTokens) {
        if (blob.includes(t)) score += 2;
      }
      for (const t of topics) {
        if (blob.includes(t)) score += 4;
      }
      for (const t of dairyTokens) {
        if (blob.includes(t)) score += 1;
      }
      if (/nddb|national dairy|kisan|extension|icar|veterinary|cooperative|amul/i.test(blob)) score += 3;
      if (/song|movie|trailer|gaming|cricket|news debate/i.test(blob)) score -= 8;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);
}

async function searchApi(query, lang, max, key) {
  const { englishQuery, topics } = extractTopics(query);
  const langHint = LANG_HINT[lang] || "hindi";
  const channelId = process.env.YOUTUBE_NDDB_CHANNEL_ID || "";

  const searchPlans = [];
  if (channelId) {
    searchPlans.push({ q: englishQuery, channelId, maxResults: max + 4, relevanceLanguage: lang === "en" ? "en" : "hi" });
  }
  searchPlans.push(
    { q: `${englishQuery} ${langHint}`, maxResults: max + 6, relevanceLanguage: lang === "en" ? "en" : "hi" },
    { q: `${englishQuery} NDDB dairy`, maxResults: max + 6, relevanceLanguage: "en" },
    { q: englishQuery, maxResults: max + 6, relevanceLanguage: lang === "en" ? "en" : "hi" },
  );

  const seen = new Set();
  const pooled = [];

  for (const plan of searchPlans) {
    const batch = await youtubeSearch(plan, key);
    for (const item of batch) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      pooled.push(item);
    }
    if (pooled.length >= max + 8) break;
  }

  if (pooled.length === 0) return [];
  return rankResults(pooled, topics, englishQuery)
    .filter((x) => x.score > 0)
    .slice(0, max + 3)
    .map((x) => x.id);
}

async function searchScrape(query, lang, max) {
  const { englishQuery } = extractTopics(query);
  const langHint = LANG_HINT[lang] || "hindi";
  const q = `${englishQuery} ${langHint} NDDB`;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": lang === "en" ? "en-US,en" : "hi-IN,hi,en",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) return [];
  const html = await resp.text();
  const seen = new Set();
  const ids = [];
  for (const m of html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)) {
    const id = m[1];
    if (seen.has(id) || id === "undefined") continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= max + 5) break;
  }
  return ids;
}

async function verifyIds(ids, max) {
  const out = [];
  for (const id of ids) {
    const v = await verify(id);
    if (v) out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

function mergeVideos(primary, secondary, max) {
  const seen = new Set(primary.map((v) => v.id));
  const out = [...primary];
  for (const v of secondary) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
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
    const apiKey = process.env.YOUTUBE_API_KEY;
    const q = String(query);
    const l = String(lang);

    const { englishQuery } = extractTopics(q);
    let source = "curated";
    let videos = [];

    // 1. Curated NDDB/extension videos when topic matches strongly
    const curatedIds = matchCurated(q, l, limit);
    if (curatedIds.length > 0) {
      videos = await verifyIds(curatedIds, limit);
    }

    // 2. YouTube Data API — ranked, topic-aware
    if (apiKey && videos.length < limit) {
      const apiIds = await searchApi(q, l, limit, apiKey);
      if (apiIds.length > 0) {
        const apiVideos = await verifyIds(apiIds, limit);
        videos = mergeVideos(videos, apiVideos, limit);
        if (apiVideos.length > 0) source = videos.length === apiVideos.length && curatedIds.length === 0 ? "api" : "mixed";
      } else if (apiKey) {
        source = "api_empty";
      }
    } else if (!apiKey) {
      source = "no_api_key";
    }

    // 3. Scrape fallback
    if (videos.length < limit) {
      const scraped = await searchScrape(q, l, limit);
      const scrapedVideos = await verifyIds(scraped, limit);
      videos = mergeVideos(videos, scrapedVideos, limit);
      if (scrapedVideos.length > 0 && source === "curated" && curatedIds.length === 0) source = "scrape";
    }

    // 4. Last resort — top curated dairy videos
    if (videos.length === 0) {
      videos = await verifyIds(CURATED.map((c) => c.id), limit);
      source = "fallback";
    }

    return new Response(
      JSON.stringify({
        videos,
        query: q,
        searchTerms: englishQuery,
        source,
        hasApiKey: Boolean(apiKey),
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
    const fallback = await verifyIds(CURATED.slice(0, 3).map((c) => c.id), 3);
    return new Response(
      JSON.stringify({ videos: fallback, query: "dairy farming", fallback: true, source: "error" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  }
}
