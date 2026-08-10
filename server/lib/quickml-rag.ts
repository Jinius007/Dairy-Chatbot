/**
 * Optional Catalyst QuickML RAG semantic retrieval.
 * Configure in Catalyst Console → QuickML → RAG → View API, then set env vars on pashumitra_api.
 *
 * When configured, supplements bundled keyword RAG with QuickML knowledge-base search.
 * Sarvam still generates the farmer-facing answer (multilingual).
 */
function env(key: string): string | undefined {
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key];
  return undefined;
}

function extractQuickMlText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  for (const key of ["text", "answer", "response", "output", "content", "message"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  const choices = o.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const msg = (choices[0] as Record<string, unknown>).message;
    if (msg && typeof msg === "object") {
      const content = (msg as Record<string, unknown>).content;
      if (typeof content === "string" && content.trim()) return content.trim();
    }
  }

  const citations = o.citations ?? o.retrieved_documents ?? o.documents;
  if (Array.isArray(citations) && citations.length) {
    const parts = citations
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object") {
          const item = c as Record<string, unknown>;
          const text = item.text ?? item.content ?? item.snippet ?? item.passage;
          const source = item.source ?? item.document_name ?? item.name ?? item.id;
          if (typeof text === "string" && text.trim()) {
            return source ? `[${source}] ${text.trim()}` : text.trim();
          }
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join("\n\n");
  }

  return null;
}

/** Returns semantic context from QuickML RAG, or null when not configured / on failure. */
export async function retrieveQuickMlRagContext(query: string): Promise<string | null> {
  const url = env("QUICKML_RAG_URL");
  const oauthToken = env("QUICKML_OAUTH_TOKEN");
  if (!url || !oauthToken || !query.trim()) return null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Zoho-oauthtoken ${oauthToken}`,
  };

  const orgId = env("CATALYST_ORG_ID");
  const endpointKey = env("QUICKML_ENDPOINT_KEY");
  const environment = env("QUICKML_ENVIRONMENT");
  if (orgId) headers["CATALYST-ORG"] = orgId;
  if (endpointKey) headers["X-QUICKML-ENDPOINT-KEY"] = endpointKey;
  if (environment) headers.Environment = environment;

  const documentIds = env("QUICKML_RAG_DOCUMENT_IDS");
  const body: Record<string, unknown> = {
    query: query.trim(),
    prompt: query.trim(),
  };
  if (documentIds) {
    body.document_ids = documentIds.split(",").map((s) => s.trim()).filter(Boolean);
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
    if (!resp.ok) {
      console.warn("QuickML RAG HTTP", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const data = await resp.json();
    return extractQuickMlText(data);
  } catch (e) {
    console.warn("QuickML RAG error:", e instanceof Error ? e.message : e);
    return null;
  }
}
