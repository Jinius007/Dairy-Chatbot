/** Detect livestock disease / health queries for vet consult offer. */
const DISEASE_PATTERNS =
  /mastitis|fever|bimar|bimari|rogi|marij|disease|diseas|symptom|lakshan|chhale|chale|blister|vesicle|diarr|dast|loose motion|khoon|blood|lumpy|lsd|fmd|muh|mouth|foot|khur|lameness|langda|bloat|afara|dudh|milk clot|udder|than|calv|bacha|abort|heat|garmi|vaccin|tika|dawai|medicine|ilaj|treatment|doctor|vaid|daktar|vet|pashu chikits|infection|swell|suuj|weak|kamzor|khana nahi|not eating|khansi|cough|saans|breath|anthrax|galghotu|hs |septicaemia|brucellosis|repeat breed|bar bar|pregnant|garbh|placenta/i;

export function isDiseaseRelatedQuery(text: string): boolean {
  return DISEASE_PATTERNS.test(text);
}

export function isAffirmativeConsultReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(haan|han|ha|yes|y|ok|okay|ji|please|consult|connect|call|video|vet|doctor|daktar|chahiye|chahie|bhej|dikhao|show|nearby|paas|najdeek)\b/i.test(t)
    || /\b(haan|yes|ji haan|consult karo|vet chahiye|doctor chahiye|dikhado|bhejo)\b/i.test(t);
}

export function isVetContactRequest(text: string): boolean {
  return /vet|veterinar|doctor|daktar|pashu\s*chikits|paravet|vaid|consult|contact|number|phone|call|video|whatsapp|nearby|najdeek|paas|ka\s*number|dua|de\s*do|bhej|dikhao|connect|doctor\s*ka/i.test(text);
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
