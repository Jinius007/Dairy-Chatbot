import { splitLangHeader } from "@/lib/chat-response";

const SENTENCE_END = /[.!?।…)\]"'»]\s*$/u;

/** True when a reply likely stopped mid-sentence (stream cut or token limit). */
export function looksIncompleteReply(text: string): boolean {
  const body = splitLangHeader(text).body.trim();
  if (!body) return true;
  if (SENTENCE_END.test(body)) return false;

  // Tiny tail after sentence punctuation — e.g. "… हैं। दू"
  const segments = body.split(/[.!?।…]/u);
  if (segments.length > 1) {
    const tail = segments[segments.length - 1]?.trim() ?? "";
    if (tail.length > 0 && tail.length <= 8) return true;
  }

  return false;
}

export function continuationUserMessage(lang: string | null | undefined): string {
  const code = lang && /^[a-z]{2}$/.test(lang) ? lang : "hi";
  const prompts: Record<string, string> = {
    hi: "Tumhara pichla jawab adhura ruk gaya tha. Bilkul wahi se aage likho — pehle wala mat dohrana. Poora jawab complete karo.",
    bn: "Tomar ager uttor adhura chhere giyechilo. Shei jaygay theke likhte thako — abar korona. Puro uttor complete koro.",
    ta: "Ungaloda munnadi uttaru adhaiyil nindruchu. Anga irundhu thodarungal — mudhalai maatunga. Muthu uttarai mudiyungal.",
    te: "Mee mundu javabu apurnamga aagipoyindi. Akkade nundi koodaa raayandi — malle cheppakandi. Purna javabu ivvandi.",
    en: "Your previous answer was cut off. Continue exactly from where you stopped — do not repeat earlier text. Finish the complete answer.",
  };
  return prompts[code] || prompts.hi;
}

export async function fetchChatContinuation(options: {
  history: { role: string; content: string }[];
  partialAssistant: string;
  userLang: string;
  signal?: AbortSignal;
  url: string;
  headers?: Record<string, string>;
}): Promise<string> {
  const { history, partialAssistant, userLang, signal, url, headers = { "Content-Type": "application/json" } } = options;
  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: [
        ...history,
        { role: "assistant", content: partialAssistant },
        { role: "user", content: continuationUserMessage(userLang) },
      ],
      stream: false,
      forceLanguage: userLang,
    }),
    signal,
  });
  if (!resp.ok) return "";
  const data = await resp.json().catch(() => ({})) as { text?: string };
  const raw = typeof data.text === "string" ? data.text : "";
  return splitLangHeader(raw).body.trim();
}
