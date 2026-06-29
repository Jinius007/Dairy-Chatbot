/** Backend: detect livestock disease / vet contact queries for consult offer. */
const DISEASE_PATTERNS =
  /mastitis|fever|bimar|bimari|rogi|disease|symptom|lakshan|chhale|chale|blister|diarr|dast|lumpy|lsd|fmd|lameness|langda|bloat|afara|udder|than|vaccin|tika|ilaj|treatment|infection|anthrax|galghotu|brucellosis|repeat breed|pashu.*(bimar|problem)|gaay.*(bimar|problem)|bhains.*(bimar|problem)/i;

const VET_CONTACT_PATTERNS =
  /vet|veterinar|doctor|daktar|pashu\s*chikits|chikitsak|paravet|vaid|consult|contact|sampark|sanpark|number|phone|mobile|call|video|whatsapp|nearby|najdeek|paas|ka\s*number|number\s*do|de\s*do|bhej|dikhao|connect|doctor\s*ka|vet\s*ka|give\s*me|share|list|details/i;

export const VET_CONSULT_MARKER = "[[VET_CONSULT_OFFER]]";

export function isDiseaseRelatedQuery(text: string): boolean {
  return DISEASE_PATTERNS.test(text);
}

export function isVetContactRequest(text: string): boolean {
  return VET_CONTACT_PATTERNS.test(text);
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

/** Static reply for direct vet-contact requests — bypasses LLM so DCS redirect never triggers. */
export function getVetContactDirectReply(lang: string | null | undefined): string {
  if (lang && VET_CONTACT_REPLIES[lang]) return VET_CONTACT_REPLIES[lang];
  return VET_CONTACT_REPLIES.hi;
}
