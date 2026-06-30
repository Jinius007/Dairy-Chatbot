/** Block abusive language in transcripts, chat input/output (all supported languages). */

export const CONTENT_SAFETY_RULES =
  "CONTENT SAFETY (NON-NEGOTIABLE): Never use profanity, slurs, sexual abuse, hate speech, or insults in ANY language (Hindi, English, Hinglish, Gujarati, etc.). " +
  "If the farmer uses abusive words, respond calmly in their language: ask them to rephrase politely and say Bharat Pashudhan AI helps with dairy and livestock only. " +
  "Do NOT repeat, quote, or spell out abusive words. Do NOT transcribe abusive speech verbatim.";

export { detectLangForRefusal } from "./languages.ts";

const DEVANAGARI_DIGITS = "०१२३४५६७८९";

/** Severe terms only — romanized + Devanagari common forms. Word-boundary where possible. */
const ABUSE_PATTERNS: RegExp[] = [
  /\bm(?:adarchod|aderchod|c)\b/i,
  /\bb(?:henchod|hen(?:c|k)(?:hod|d))\b/i,
  /\bchutiy(?:a|e|i)\b/i,
  /\bgaand(?:u|)\b/i,
  /\bl(?:und|oda)\b/i,
  /\b(?:f+u+c+k+|fuk)\b/i,
  /\b(?:s+h+i+t+)\b/i,
  /\b(?:b+i+t+c+h+)\b/i,
  /\b(?:a+s+s+h+o+l+e)\b/i,
  /\b(?:c+u+n+t+)\b/i,
  /\b(?:d+i+c+k+|dickhead)\b/i,
  /\b(?:p+i+s+s+)\b/i,
  /\b(?:b+s+d+k+|bsdk)\b/i,
  /\b(?:mc|bc)\b/i,
  /म(?:ादर|ader)चोद/u,
  /बह(?:ेन|en)चोद/u,
  /चूत(?:िया|िये)/u,
  /ग(?:ां|ा)ड/u,
  /ल(?:ौ|ो)ड(?:ा|े)/u,
  /हराम(?:ी|ि)/u,
  /क(?:ा|ा)म(?:ी|िन)/u,
  /स(?:ा|ा)ल(?:ा|े)/u,
  /भ(?:ो|o)s(?:ड|d)(?:ी|i|u)/u,
  /ભ(?:ો|o)s(?:ડ|d)(?:ી|i)/u,
  /ચૂત(?:િય|iy)/u,
  /বেশ(?:্য|ya)/u,
  /ப(?:்|)த(?:ி|i)க(?:ா|a)ர/u,
];

export function normalizeForSafety(text: string): string {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[०-९]/g, (ch) => String(DEVANAGARI_DIGITS.indexOf(ch)))
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/\s+/g, " ")
    .trim();
}

export function containsAbusiveLanguage(text: string): boolean {
  if (!text?.trim()) return false;
  const normalized = normalizeForSafety(text);
  return ABUSE_PATTERNS.some((re) => re.test(normalized) || re.test(text));
}

export function filterAbusiveLanguage(text: string): string {
  if (!text?.trim()) return text;
  let out = text;
  for (const re of ABUSE_PATTERNS) {
    out = out.replace(re, "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function abuseRefusalMessage(lang = "hi"): string {
  const messages: Record<string, string> = {
    hi: "[[LANG:hi]]\nकृपया शालीन भाषा में पूछें। Bharat Pashudhan AI डेयरी और पशुपालन में मदद के लिए है। आपका सवाल दोबारा लिखें या बोलें।",
    gu: "[[LANG:gu]]\nકૃપા કરીને સભ્ય ભાષામાં પૂછો. Bharat Pashudhan AI ડેરી અને પશુપાલન માટે છે. તમારો પ્રશ્ન ફરી લખો અથવા બોલો.",
    mr: "[[LANG:mr]]\nकृपया शिस्त भाषेत विचारा. Bharat Pashudhan AI डेअरी व पशुपालनासाठी आहे.",
    bn: "[[LANG:bn]]\nদয়া করে ভদ্র ভাষায় জিজ্ঞাসা করুন। Bharat Pashudhan AI দুগ্ধ ও পশুপালনে সাহায্য করে।",
    ta: "[[LANG:ta]]\nதயவுசெய்து மரியாதையான மொழியில் கேளுங்கள். Bharat Pashudhan AI பண்ணை வளர்ப்புக்கு உதவுகிறது.",
    te: "[[LANG:te]]\nదయచేసి మర్యాదగా అడగండి. Bharat Pashudhan AI పాల పశు సహాయకుడు.",
    en: "[[LANG:en]]\nPlease use respectful language. Bharat Pashudhan AI helps with dairy and livestock — ask your question again politely.",
  };
  return messages[lang] || messages.hi;
}
