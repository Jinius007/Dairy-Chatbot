/** Backend: detect livestock disease / vet contact queries for consult offer. */
const DISEASE_PATTERNS =
  /mastitis|fever|bimar|bimari|rogi|disease|symptom|lakshan|chhale|chale|blister|diarr|dast|lumpy|lsd|fmd|lameness|langda|bloat|afara|udder|than|vaccin|tika|ilaj|treatment|infection|anthrax|galghotu|brucellosis|repeat breed|pashu.*(bimar|problem)|gaay.*(bimar|problem)|bhains.*(bimar|problem)/i;

const VET_CONTACT_PATTERNS =
  /vet|veterinar|doctor|daktar|pashu\s*chikits|paravet|vaid|consult|contact|number|phone|call|video|whatsapp|nearby|najdeek|paas|ka\s*number|dua|de\s*do|bhej|dikhao|connect|doctor\s*ka/i;

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
