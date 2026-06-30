/** Backend: detect livestock disease / vet contact queries for consult offer. */

/** STT often writes "Dr." instead of "doctor" — normalize before pattern matching. */
export function normalizeVetQueryText(text: string): string {
  return (text || "")
    .replace(/\bdr\.(?=\s|$|[?!,;:])/gi, "doctor ")
    .replace(/\bdr\b(?=\s|$|[?!,;:])/gi, "doctor");
}

const DISEASE_PATTERNS =
  /mastitis|fever|bimar|bimari|rogi|disease|symptom|lakshan|chhale|chale|blister|diarr|dast|lumpy|lsd|fmd|lameness|langda|bloat|afara|udder|than|vaccin|tika|ilaj|treatment|infection|anthrax|galghotu|brucellosis|repeat breed|pashu.*(bimar|problem)|gaay.*(bimar|problem)|bhains.*(bimar|problem)|बीमार|रोग|लक्षण|इलाज|बुखार|दस्त|রোগ|জ্বর|நோய|مرض/i;

/** Loanwords used across India + native “animal doctor” in major scripts. */
const VET_ROLE =
  /(?:\bvet\b|paravet|veterinar|veterinary|vaid|daktar|doctor|\bdr\.?\b|chikitsak|chikits|pashu\s*chikits|veterin|vaidya|marut|pashu\s*doctor|animal\s*doctor|livestock\s*doctor|पशु\s*चिकित्स|चिकित्सक|डॉक्ट|डाक्ट|वैद|पैरावेट|पशु\s*डॉक्ट|পশু\s*চিকিৎস|চিকিৎসক|ডাক্তার|ভেট|மருத்துவ|வைத்திய|వెట్|పశు\s*వైద|પશુ\s*ડોક્ટ|पशुवैद|जनावर\s*डॉक|ಪಶು\s*ವೈದ|പശു\s*ഡോക്ട|ਜਾਨਵਰ\s*ਡਾਕਟ|ପଶୁ\s*ଡାକ୍ତ|পশু\s*চিকিৎস|پشو\s*ڈاکٹر|ویٹ)/i;

/**
 * Contact / send / show / call intent — Latin roman + all major Indic scripts.
 * Farmers often say “vet/paravet” in English and the rest in their language.
 */
const CONTACT_INTENT =
  /(?:contact|sampark|sanpark|number|phone|mobile|whatsapp|watsapp|call|video|nearby|najdeek|paas|connect|share|list|details|dial|reach|bhej|dikhao|de\s*do|number\s*do|ka\s*number|vet\s*ka|doctor\s*ka|give\s*me|send|show|find|kahan|kaha|kaun|idhar|yahan|chahiye|chahie|batao|bataye|bhejiye|bhejo|dijiye|dijie|mila|milao|jod|link|संपर्क|सम्पर्क|नंबर|नम्बर|मोबाइल|फोन|भेज|दो|दें|दीज|दिख|पास|नजदीक|चाहिए|बताओ|बताइ|कॉल|व्हाट्स|वीडियो|যোগাযোগ|নম্বর|ফোন|মোবাইল|দাও|পাঠাও|দেখাও|কাছে|নিকট|লাগবে|চাই|দরকার|தொடர்ப|எண்|போன|அழை|அனுப்ப|கொடு|காட்ட|அருக|வேணும்|வேண்டும்|సంప్రద|నంబర|ఫోન|పంప|ఇవ్వ|చూప|దగ్గర|కావాల|અંબર|સંપર્ક|નંબર|ફોન|મોકલ|આપ|જોઈ|નજી|संपर्क|नंबर|फोन|पाठव|जवळ|हव|सांग|ಸಂಪರ್ಕ|ನಂಬರ|ಫೋನ|ಕಳುಹಿಸ|ಕೊ|ಹತ್ತಿರ|ಬೇಕ|ബന്ധ|നമ്പ|ഫോ|അയയ|താ|അടുത്ത|വേണ|ਸੰਪਰਕ|ਨੰਬਰ|ਫੋਨ|ਭੇਜ|ਦੇ|ਨੇੜ|ਚਾਹੀ|ସମ୍ପର୍କ|ନମ୍ବର|ଫୋନ|ଦିଅ|ପାଠ|ନିକଟ|যোগাযোগ|নম্বৰ|ফোন|পঠ|নিকট|رابطہ|نمبر|فون|بھیج|دو|قریب|چاہی)/iu;

/** General request intent when paired with vet/paravet (any language). */
const REQUEST_INTENT =
  /(?:please|plz|need|want|help|where|how\s*to|can\s*you|could\s*you|will\s*you|get\s*me|arrange|lagbe|dorkar|darkar|venum|venaam|venam|kavali|kavali|buddhi|joiye|pahije|chahiye|chahie|chahida|chahida|zaroor|zarurat|mujhe|mala|enakku|naku|nanage|nange|mujko|\?)/iu;

/** Universal loanwords — if present, show contacts unless clearly past-tense vet advice only. */
const UNIVERSAL_VET = /\b(?:vet|paravet|veterinar|veterinary)\b/i;

/** “The vet said/prescribed…” — not asking for contact now. */
const VET_NARRATIVE =
  /(?:\bvet\b|paravet|veterinar).{0,35}(?:said|told|recommended|prescribed|advised|gave|visited|checked|diagnosed|ne\s+(?:kaha|bola|diya|di)|कह[ाी]|बोल[ाी]|द(?:िया|ी)|prescribed|treatment\s+from)/iu;

const STRONG_VET_CONTACT =
  /(?:vet|veterinar|doctor|\bdr\.?\b|daktar|chikitsak|paravet|पशु\s*चिकित्स|ডাক্তার|மருத்துவ|వైద|ડોક્ટ|डॉक्ट|वैद).{0,48}(?:contact|sampark|sanpark|number|phone|mobile|whatsapp|bhej|dikhao|de\s*do|chahiye|venum|lagbe|যোগাযোগ|নম্বর|தொடர்ப|எண்|సంప్రద|નંબર|संपर्क|नंबर|phone|call|send|show|give\s*me|dijie|दो|भेज|চাই|कॉल)|(?:contact|sampark|sanpark|number|phone|give\s*me|some|যোগাযোগ|নম্বর|தொடர்ப|எண்|సంప్రద|નંબર|संपर्क|नंबर|رابطہ|نمبر).{0,48}(?:vet|veterinar|doctor|\bdr\.?\b|daktar|chikitsak|paravet|पशु\s*चिकित्स|ডাক্তার|மருத்துவ|వైద)/iu;

export const VET_CONSULT_MARKER = "[[VET_CONSULT_OFFER]]";

export function isDiseaseRelatedQuery(text: string): boolean {
  return DISEASE_PATTERNS.test(text);
}

function isVetNarrativeOnly(text: string): boolean {
  return VET_NARRATIVE.test(text) && !CONTACT_INTENT.test(text) && !REQUEST_INTENT.test(text);
}

export function isVetContactRequest(text: string): boolean {
  const t = normalizeVetQueryText((text || "").trim());
  if (!t) return false;
  if (STRONG_VET_CONTACT.test(t)) return true;
  if (VET_ROLE.test(t) && (CONTACT_INTENT.test(t) || REQUEST_INTENT.test(t))) return true;
  // vet / paravet are universal — rest of sentence can be any language
  if (UNIVERSAL_VET.test(t) && !isVetNarrativeOnly(t)) return true;
  return false;
}

export function isVetConsultQuery(text: string): boolean {
  return isDiseaseRelatedQuery(text) || isVetContactRequest(text);
}

export function stripVetConsultMarker(text: string): string {
  return text.replace(/\[\[VET_CONSULT_OFFER\]\]/g, "").trim();
}

const VET_CONTACT_REPLIES: Record<string, string> = {
  hi: `[[LANG:hi]]\nयहाँ आपके पास के पशु चिकित्सक / पैरावेट की सूची है (WhatsApp कॉल और वीडियो कॉल नीचे)।\n${VET_CONSULT_MARKER}`,
  bn: `[[LANG:bn]]\nআপনার কাছের পশু চিকিৎসক / প্যারাভেটের তালিকা নিচে দেওয়া হল (WhatsApp কল ও ভিডিও কল)।\n${VET_CONSULT_MARKER}`,
  ta: `[[LANG:ta]]\nஉங்களுக்கு அருகிலுள்ள veterinarians / paravets பட்டியல் கீழே (WhatsApp call & video)।\n${VET_CONSULT_MARKER}`,
  te: `[[LANG:te]]\nమీ దగ్గరlo vet / paravet contacts క్రింద ఉన్నాయి (WhatsApp call & video)।\n${VET_CONSULT_MARKER}`,
  mr: `[[LANG:mr]]\nजवळचे पशuvaidyak / paravet खाली दिले आहेत (WhatsApp call & video)।\n${VET_CONSULT_MARKER}`,
  gu: `[[LANG:gu]]\nનજીકના vet / paravet નીચે છે (WhatsApp call & video)।\n${VET_CONSULT_MARKER}`,
  en: `[[LANG:en]]\nHere are nearby veterinarians and paravets — use WhatsApp call or video below.\n${VET_CONSULT_MARKER}`,
};

const VET_CONTACT_CALL_REPLIES: Record<string, string> = {
  hi: "[[LANG:hi]]\nनजदीकी पशु चिकित्सक की सूची ऐpp की चैट में WhatsApp कॉल और वीडियो के साथ दिखेगी — कृपया कॉल के बाद चैट खोलें।",
  en: "[[LANG:en]]\nNearby vet contacts with WhatsApp call and video are in the app chat — please open chat after this call.",
};

/** Static reply for direct vet-contact requests — bypasses LLM so DCS redirect never triggers. */
export function getVetContactDirectReply(lang: string | null | undefined, mode: "chat" | "call" = "chat"): string {
  if (mode === "call") {
    if (lang && VET_CONTACT_CALL_REPLIES[lang]) return VET_CONTACT_CALL_REPLIES[lang];
    return VET_CONTACT_CALL_REPLIES.hi;
  }
  if (lang && VET_CONTACT_REPLIES[lang]) return VET_CONTACT_REPLIES[lang];
  return VET_CONTACT_REPLIES.hi;
}
