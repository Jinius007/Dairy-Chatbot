/** Detect livestock disease / health queries for vet consult offer. */

/** STT often writes "Dr." instead of "doctor" — normalize before pattern matching. */
export function normalizeVetQueryText(text: string): string {
  return (text || "")
    .replace(/\bdr\.(?=\s|$|[?!,;:])/gi, "doctor ")
    .replace(/\bdr\b(?=\s|$|[?!,;:])/gi, "doctor");
}

const DISEASE_PATTERNS =
  /mastitis|fever|bimar|bimari|rogi|marij|disease|diseas|symptom|lakshan|chhale|chale|blister|vesicle|diarr|dast|loose motion|khoon|blood|lumpy|lsd|fmd|muh|mouth|foot|khur|lameness|langda|bloat|afara|dudh|milk clot|udder|than|calv|bacha|abort|heat|garmi|vaccin|tika|dawai|medicine|ilaj|treatment|infection|swell|suuj|weak|kamzor|khana nahi|not eating|khansi|cough|saans|breath|anthrax|galghotu|hs |septicaemia|brucellosis|repeat breed|bar bar|pregnant|garbh|placenta|बीमार|रोग|লক্ষণ|நோய/i;

const VET_ROLE =
  /(?:\bvet\b|paravet|veterinar|veterinary|vaid|daktar|doctor|\bdr\.?\b|chikitsak|chikits|pashu\s*chikits|veterin|vaidya|marut|pashu\s*doctor|animal\s*doctor|livestock\s*doctor|पशु\s*चिकित्स|चिकित्सक|डॉक्ट|डाक्ट|वैद|पैरावेट|পশু\s*চিকিৎস|চিকিৎসক|ডাক্তার|ভেট|மருத்துவ|வைத்திய|వెట్|పశు\s*వైద|પશુ\s*ડોક્ટ|पशुवैद|जनावर\s*डॉक|ಪಶು\s*ವೈದ|പശു\s*ഡോക്ട|ਜਾਨਵਰ\s*ਡਾਕਟ|ପଶୁ\s*ଡାକ୍ତ|پشو\s*ڈاکٹر|ویٹ)/i;

const CONTACT_INTENT =
  /(?:contact|sampark|sanpark|number|phone|mobile|whatsapp|watsapp|call|video|nearby|najdeek|paas|connect|share|list|details|dial|reach|bhej|dikhao|de\s*do|number\s*do|ka\s*number|vet\s*ka|doctor\s*ka|give\s*me|send|show|find|kahan|kaha|kaun|idhar|yahan|chahiye|chahie|batao|bataye|bhejiye|bhejo|dijiye|dijie|mila|milao|jod|link|संपर्क|सम्पर्क|नंबर|नम्बर|मोबाइल|फोन|भेज|दो|दें|दीज|दिख|पास|नजदीक|चाहिए|बताओ|बताइ|कॉल|व्हाट्स|वीडियो|যোগাযোগ|নম্বর|ফোন|মোবাইল|দাও|পাঠাও|দেখাও|কাছে|নিকট|লাগবে|চাই|দরকার|தொடர்ப|எண்|போன|அழை|அனுப்ப|கொடு|காட்ட|அருக|வேணும்|வேண்டும்|సంప్రద|నంబర|ఫోన|పంప|ఇవ్వ|చూప|దగ్గర|కావాల|સંપર્ક|નંબર|ફોન|મોકલ|આપ|જોઈ|નજી|संपर्क|नंबर|फोन|पाठव|जवळ|हव|ಸಂಪರ್ಕ|ನಂಬರ|ಫೋನ|ಕಳುಹಿಸ|ಬೇಕ|ബന്ധ|നമ്പ|ഫോ|അയയ|വേണ|ਸੰਪਰਕ|ਨੰਬਰ|ਫੋਨ|ਭੇਜ|ਦੇ|ਨੇੜ|ସମ୍ପର୍କ|ନମ୍ବର|ଫୋନ|যোগাযোগ|নম্বৰ|ফোন|رابطہ|نمبر|فون|بھیج|دو|قریب|چاہی)/iu;

const REQUEST_INTENT =
  /(?:please|plz|need|want|help|where|how\s*to|can\s*you|could\s*you|will\s*you|get\s*me|arrange|lagbe|dorkar|darkar|venum|venaam|venam|kavali|joiye|pahije|chahiye|chahie|zaroor|zarurat|mujhe|mala|enakku|naku|nanage|nange|mujko|\?)/iu;

const UNIVERSAL_VET = /\b(?:vet|paravet|veterinar|veterinary)\b/i;

const VET_NARRATIVE =
  /(?:\bvet\b|paravet|veterinar).{0,35}(?:said|told|recommended|prescribed|advised|gave|visited|checked|diagnosed|ne\s+(?:kaha|bola|diya|di)|कह[ाी]|बोल[ाी]|द(?:िया|ी)|prescribed|treatment\s+from)/iu;

const STRONG_VET_CONTACT =
  /(?:vet|veterinar|doctor|\bdr\.?\b|daktar|chikitsak|paravet|पशु\s*चिकित्स|ডাক্তার|மருத்துவ|వైద|ડોક્ટ|डॉक्ट|वैद).{0,48}(?:contact|sampark|sanpark|number|phone|mobile|whatsapp|bhej|dikhao|de\s*do|chahiye|venum|lagbe|যোগাযোগ|নম্বর|தொடர்ப|எண்|సంప్రద|નંબર|संपर्क|नंबर|phone|call|send|show|give\s*me|दो|भेज|চাই|कॉल)|(?:contact|sampark|sanpark|number|phone|give\s*me|some|যোগাযোগ|নম্বর|தொடர்ப|எண்|సంప్రద|નંબર|संपर्क|नंबर|رابطہ|نمبر).{0,48}(?:vet|veterinar|doctor|\bdr\.?\b|daktar|chikitsak|paravet|पशु\s*चिकित्स|ডাক্তার|மருத்துவ|వైద)/iu;

function isVetNarrativeOnly(text: string): boolean {
  return VET_NARRATIVE.test(text) && !CONTACT_INTENT.test(text) && !REQUEST_INTENT.test(text);
}

export function isDiseaseRelatedQuery(text: string): boolean {
  return DISEASE_PATTERNS.test(text);
}

export function isAffirmativeConsultReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(haan|han|ha|yes|y|ok|okay|ji|please|consult|connect|call|video|vet|doctor|daktar|chahiye|chahie|bhej|dikhao|show|nearby|paas|najdeek|venum|lagbe)\b/i.test(t)
    || /\b(haan|yes|ji haan|consult karo|vet chahiye|doctor chahiye|dikhado|bhejo|संपर्क|नंबर|भेज|venum|lagbe|চাই)\b/i.test(t);
}

export function isVetContactRequest(text: string): boolean {
  const t = normalizeVetQueryText((text || "").trim());
  if (!t) return false;
  if (STRONG_VET_CONTACT.test(t)) return true;
  if (VET_ROLE.test(t) && (CONTACT_INTENT.test(t) || REQUEST_INTENT.test(t))) return true;
  if (UNIVERSAL_VET.test(t) && !isVetNarrativeOnly(t)) return true;
  return false;
}

/** Client-side fallback when backend has not deployed vet short-circuit yet. */
export function vetContactFallbackReply(lang: string): string {
  const replies: Record<string, string> = {
    hi: "[[LANG:hi]]\nयहाँ आपके पास के पशु चिकित्सक / पैरावेट की सूची है (WhatsApp कॉल और वीडियो नीचे)।\n[[VET_CONSULT_OFFER]]",
    en: "[[LANG:en]]\nHere are nearby veterinarians and paravets — WhatsApp call and video below.\n[[VET_CONSULT_OFFER]]",
  };
  return replies[lang] || replies.hi;
}

export function isVetConsultQuery(text: string): boolean {
  return isDiseaseRelatedQuery(text) || isVetContactRequest(text);
}

export function isNegativeConsultReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(nahi|nahin|no|n|mat|cancel|skip|baad mein|later)\b/i.test(t)
    || /\b(nahi chahiye|no thanks|not now)\b/i.test(t);
}

export const VET_CONSULT_MARKER = "[[VET_CONSULT_OFFER]]";

export function stripVetConsultMarker(text: string): string {
  return text.replace(/\[\[VET_CONSULT_OFFER\]\]/g, "").trim();
}

export function hasVetConsultMarker(text: string): boolean {
  return text.includes(VET_CONSULT_MARKER);
}
