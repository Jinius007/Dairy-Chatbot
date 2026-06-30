import { KNOWLEDGE_BASE } from "./knowledge/knowledge.ts";

interface KnowledgeChunk {
  id: string;
  title: string;
  text: string;
}

let cachedChunks: KnowledgeChunk[] | null = null;

function buildChunks(): KnowledgeChunk[] {
  if (cachedChunks) return cachedChunks;

  const sections = KNOWLEDGE_BASE.split(/\n(?=## )/).map((s) => s.trim()).filter(Boolean);
  cachedChunks = sections.map((text, i) => {
    const titleMatch = text.match(/^## ([^\n]+)/);
    const title = titleMatch?.[1]?.trim() || `Section ${i + 1}`;
    return { id: `kb-${i}`, title, text };
  });
  return cachedChunks;
}

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  return new Set(tokens);
}

function scoreChunk(queryTokens: Set<string>, chunk: KnowledgeChunk): number {
  const titleTokens = tokenize(chunk.title);
  const bodyTokens = tokenize(chunk.text);
  let score = 0;
  for (const t of queryTokens) {
    if (titleTokens.has(t)) score += 6;
    if (bodyTokens.has(t)) score += 2;
  }
  return score;
}

function formatChunks(chunks: KnowledgeChunk[]): string {
  return chunks.map((c) => c.text).join("\n\n");
}

function pickByTitle(chunks: KnowledgeChunk[], pattern: RegExp, limit: number): KnowledgeChunk[] {
  return chunks.filter((c) => pattern.test(c.title) || pattern.test(c.text)).slice(0, limit);
}

function mergeUnique(primary: KnowledgeChunk[], extra: KnowledgeChunk[]): KnowledgeChunk[] {
  const seen = new Set(primary.map((c) => c.id));
  const out = [...primary];
  for (const c of extra) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

/**
 * Keyword RAG over the Catalyst-hosted NDDB knowledge repo (Sarvam RAG corpus).
 * No vector DB — section retrieval over bundled knowledge, context injected into Sarvam chat.
 */
export function retrieveKeywordRagContext(query: string, topK = 7): string {
  const chunks = buildChunks();
  const queryTokens = tokenize(query);

  if (queryTokens.size === 0) {
    return formatChunks(pickByTitle(chunks, /NUTRITION|HEALTH|GOVERNMENT|RATION|COOPERATIVE/i, 4));
  }

  const scored = chunks
    .map((c) => ({ c, score: scoreChunk(queryTokens, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  let selected = scored.slice(0, topK).map((x) => x.c);

  if (/ration|feed|fodder|concentrate|poshan|chara|aahar|tdn|lcf|berseem|bajra|silage/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /NUTRITION|RATION|FODDER|BALANCED/i, 3));
  }
  if (/milk|sell|pour|cooperative|dcs|union|marketing|dudh|doodh|dugh|milk\s*buyer|dealer|hotel|middleman|dalal|bech|bechna|दूध|बेच|डाल|होटल|दलाल|sahakari/i.test(query) && !/buy.*(cow|cattle|gaay|bhains|goru|pashu|buffalo)|where.*buy.*(cow|cattle|animal)/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /COOPERATIVE|MILK MARKETING|ECONOMICS/i, 2));
  }
  if (/buy|purchase|kharid|where.*(buy|get).*cow|cow.*market|gaay.*kharid|goru.*kothay|sell.*animal|buy.*cattle|buy.*buffalo/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /BUYING|SELLING LIVE CATTLE|CATTLE PURCHASE|1962|GOKUL|NLM/i, 3));
  }
  if (/scheme|subsidy|loan|kcc|ahidf|rgm|npdd|nlm|government|yojana|dahd|gokul|livestock mission/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /GOVERNMENT|SCHEME|DAHD|AHIDF|GOKUL|NPDD|NLM/i, 3));
  }
  if (/extension|pamphlet|booklet|poster|nddb|dairy knowledge|youtube|trifold|pashupalan|nirdeshika/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /EXTENSION|NDDB|Pamphlet|Booklet|Poster|YouTube|Dairy Knowledge/i, 3));
  }
  if (/mastitis|fever|disease|vaccin|evm|ethno|breed|heat|calv|pregnan|fmd|hs |black quarter|blackleg|anthrax|lumpy|brucellosis|bloat|tympany|milk fever|hypocal|diarr|scour|lameness|foot and mouth|galghotu/i.test(query)) {
    selected = mergeUnique(selected, pickByTitle(chunks, /HEALTH|EVM|BREEDING|BOVINE|ICAR|DAHD|SVTG|Central Health|CaDDES|Mastitis|FMD|HS |Vaccin/i, 4));
  }

  if (selected.length === 0) {
    selected = chunks.slice(0, Math.min(5, chunks.length));
  }

  return formatChunks(selected.slice(0, topK + 2));
}
