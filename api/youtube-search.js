/** Search YouTube and return oembed-verified video links only */
export const config = { runtime: "edge" };

const CURATED = [
  { id: "4TCt7b1q5aQ", topics: ["ration", "feed", "balanced", "poshan", "aahar", "lcf"] },
  { id: "LZnqdJjCJiE", topics: ["clean", "milk", "cooperative", "dcs", "quality", "hygiene"] },
  { id: "-LowRTqYC-c", topics: ["clean", "milk", "milking", "hygiene"] },
  { id: "0HpzXhAz09E", topics: ["cooperative", "amul", "sell", "procurement"] },
  { id: "0sODT0C8quA", topics: ["ai", "insemination", "breeding", "heat"] },
  { id: "rs-cGqA7yyM", topics: ["mastitis", "udder", "thanela", "infection"] },
  { id: "XG0_XaMKT_w", topics: ["nddb", "cooperative", "dairy"] },
];

const LANG_HINT = {
  hi: "hindi", bn: "bengali", ta: "tamil", te: "telugu", mr: "marathi",
  gu: "gujarati", kn: "kannada", ml: "malayalam", pa: "punjabi", or: "odia",
  as: "assamese", ur: "urdu", en: "english",
};

function videoUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
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

async function searchApi(query, lang, max, key) {
  const q = `${query} dairy farming ${LANG_HINT[lang] || "hindi"} india`.trim();
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(max + 3));
  url.searchParams.set("q", q);
  url.searchParams.set("relevanceLanguage", lang === "en" ? "en" : "hi");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("key", key);

  const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) return [];
  const data = await resp.json();
  const ids = (data.items || [])
    .map((item) => item?.id?.videoId)
    .filter((id) => typeof id === "string");
  return ids;
}

async function searchScrape(query, lang, max) {
  const q = `${query} dairy ${LANG_HINT[lang] || "hindi"} india`;
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

function matchCurated(query, max) {
  const q = query.toLowerCase();
  const scored = CURATED.map((v) => {
    let score = 0;
    for (const t of v.topics) {
      if (q.includes(t)) score += 2;
    }
    return { id: v.id, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
  if (scored.length) return scored.map((x) => x.id);
  return CURATED.slice(0, max).map((x) => x.id);
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

    let ids = [];
    if (apiKey) {
      ids = await searchApi(String(query), String(lang), limit, apiKey);
    }
    if (ids.length === 0) {
      ids = await searchScrape(String(query), String(lang), limit);
    }
    if (ids.length === 0) {
      ids = matchCurated(String(query), limit);
    }

    let videos = await verifyIds(ids, limit);

    if (videos.length === 0) {
      videos = await verifyIds(CURATED.map((c) => c.id), limit);
    }

    return new Response(JSON.stringify({ videos, query }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    const fallback = await verifyIds(CURATED.slice(0, 3).map((c) => c.id), 3);
    return new Response(
      JSON.stringify({ videos: fallback, query: "dairy farming", fallback: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  }
}
