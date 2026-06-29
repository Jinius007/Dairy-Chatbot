/** Backend: detect livestock disease queries for vet consult offer. */
const DISEASE_PATTERNS =
  /mastitis|fever|bimar|bimari|rogi|disease|symptom|lakshan|chhale|chale|blister|diarr|dast|lumpy|lsd|fmd|lameness|langda|bloat|afara|udder|than|vaccin|tika|ilaj|treatment|infection|anthrax|galghotu|brucellosis|repeat breed|pashu.*(bimar|problem)|gaay.*(bimar|problem)|bhains.*(bimar|problem)/i;

export const VET_CONSULT_MARKER = "[[VET_CONSULT_OFFER]]";

export function isDiseaseRelatedQuery(text: string): boolean {
  return DISEASE_PATTERNS.test(text);
}

export function stripVetConsultMarker(text: string): string {
  return text.replace(/\[\[VET_CONSULT_OFFER\]\]/g, "").trim();
}
