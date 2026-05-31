/**
 * Official Indian dairy cooperative / NDDB YouTube channels only.
 * Videos from any other channel are rejected.
 */

/** Resolve via YouTube Data API (forHandle / forUsername) */
export const OFFICIAL_CHANNEL_SOURCES = [
  { key: "nddb", handle: "NationalDairyDevelopmentBoard" },
  { key: "nddb_official", handle: "NDDBOfficial" },
  { key: "nddb_dairy_services", handle: "NDDBDairyServices" },
  { key: "amul", username: "amultv" },
  { key: "banas", handle: "BanasDairyOfficial" },
  { key: "banas_alt", handle: "banasdairy" },
  { key: "nandini", handle: "KMFNANDINI" },
  { key: "mother_dairy", handle: "MotherDairyFruitVegetable" },
  { key: "mother_dairy_alt", handle: "MotherDairyIndia" },
  { key: "saras", handle: "SarasDairyRajasthan" },
  { key: "verka", handle: "VerkaMilkPlant" },
  { key: "aavin", handle: "AavinOfficial" },
  { key: "sudha", handle: "SudhaDairyOfficial" },
  { key: "gokul", handle: "GokulMilk" },
  { key: "parag", handle: "ParagMilkFoods" },
  { key: "dudhsagar", handle: "DudhsagarDairy" },
  { key: "milma", handle: "MilmaCooperative" },
  { key: "aarey", handle: "AareyMilk" },
  { key: "warana", handle: "WaranaDairy" },
  { key: "wamul", handle: "WAMULOfficial" },
  { key: "kwality", handle: "KwalityDairyIndia" },
  { key: "omfed", handle: "OMFEDOfficial" },
  { key: "vijaya", handle: "VijayaDairyAP" },
  { key: "nandini_alt", handle: "NandiniMilk" },
];

/** Match oembed author_name (channel title) */
export const OFFICIAL_CHANNEL_NAME_PATTERNS = [
  /national dairy development board/i,
  /\bnddb\b/i,
  /nddb dairy services/i,
  /^amul\b/i,
  /\bamul tv\b/i,
  /\bgcmmf\b/i,
  /gujarat cooperative milk/i,
  /banas dairy/i,
  /banaskantha district cooperative/i,
  /karnataka milk federation/i,
  /\bnandini\b/i,
  /mother dairy/i,
  /\bsaras\b/i,
  /rajasthan cooperative dairy/i,
  /\bverka\b/i,
  /punjab state cooperative milk/i,
  /milkfed punjab/i,
  /\baavin\b/i,
  /tamil nadu cooperative milk/i,
  /\bsudha\b/i,
  /bihar state cooperative.*milk/i,
  /\bcomfed\b/i,
  /gokul milk/i,
  /kolhapur milk/i,
  /\bparag milk/i,
  /pradeshik cooperative dairy/i,
  /dudhsagar dairy/i,
  /mehsana district cooperative/i,
  /\bmilma\b/i,
  /kerala cooperative milk/i,
  /aarey milk/i,
  /maharashtra rajya dairy/i,
  /warana dairy/i,
  /\bwamul\b/i,
  /west assam milk/i,
  /\bomfed\b/i,
  /odisha state cooperative milk/i,
  /\bvijaya\b.*dairy/i,
  /andhra Pradesh.*dairy/i,
  /district cooperative milk producers/i,
  /district milk union/i,
  /milk producers union/i,
  /milk producers'? cooperative/i,
  /state cooperative.*milk/i,
  /cooperative milk producers union/i,
  /milk federation/i,
  /kwality.*dairy/i,
];

/** Match oembed author_url handle segment */
export const OFFICIAL_CHANNEL_HANDLE_PATTERNS = [
  /nationaldairydevelopmentboard/i,
  /nddbofficial/i,
  /nddbdairyservices/i,
  /amultv/i,
  /banasdairy/i,
  /kmfnandini/i,
  /nandini/i,
  /motherdairy/i,
  /sarasdairy/i,
  /verka/i,
  /aavin/i,
  /sudha/i,
  /gokulmilk/i,
  /parag/i,
  /dudhsagar/i,
  /milma/i,
  /aarey/i,
  /warana/i,
  /wamul/i,
  /kwality/i,
  /omfed/i,
  /vijaya/i,
];

export function isOfficialChannelMeta(authorName, authorUrl) {
  const name = String(authorName || "");
  const url = String(authorUrl || "").toLowerCase();
  if (OFFICIAL_CHANNEL_NAME_PATTERNS.some((re) => re.test(name))) return true;
  if (OFFICIAL_CHANNEL_HANDLE_PATTERNS.some((re) => re.test(url))) return true;
  return false;
}

let resolvedIdsCache = null;

export async function resolveOfficialChannelIds(apiKey) {
  if (resolvedIdsCache) return resolvedIdsCache;

  const ids = new Set();
  const extra = process.env.YOUTUBE_ALLOWED_CHANNEL_IDS || "";
  for (const part of extra.split(",")) {
    const id = part.trim();
    if (id.startsWith("UC")) ids.add(id);
  }

  if (!apiKey) {
    resolvedIdsCache = ids;
    return ids;
  }

  for (const src of OFFICIAL_CHANNEL_SOURCES) {
    try {
      let url;
      if (src.handle) {
        url = new URL("https://www.googleapis.com/youtube/v3/channels");
        url.searchParams.set("part", "id");
        url.searchParams.set("forHandle", src.handle.replace(/^@/, ""));
        url.searchParams.set("key", apiKey);
      } else if (src.username) {
        url = new URL("https://www.googleapis.com/youtube/v3/channels");
        url.searchParams.set("part", "id");
        url.searchParams.set("forUsername", src.username);
        url.searchParams.set("key", apiKey);
      } else continue;

      const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      const id = data?.items?.[0]?.id;
      if (typeof id === "string" && id.startsWith("UC")) ids.add(id);
    } catch {
      // skip unresolved handle
    }
  }

  resolvedIdsCache = ids;
  return ids;
}

export async function getVideoChannelId(videoId, apiKey) {
  if (!apiKey || !videoId) return null;
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("id", videoId);
    url.searchParams.set("key", apiKey);
    const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.items?.[0]?.snippet?.channelId || null;
  } catch {
    return null;
  }
}

export async function isOfficialVideo(videoId, oembed, apiKey, allowedChannelIds) {
  const authorName = oembed?.author_name || oembed?.channel || "";
  const authorUrl = oembed?.author_url || "";
  if (isOfficialChannelMeta(authorName, authorUrl)) return true;

  if (apiKey && allowedChannelIds?.size) {
    const channelId = await getVideoChannelId(videoId, apiKey);
    if (channelId && allowedChannelIds.has(channelId)) return true;
  }

  return false;
}
