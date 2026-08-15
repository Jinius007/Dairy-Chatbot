/** Backend: detect feed/ration questions in main chat for Ration Advisory offer. */

const FEED_RATION_QUERY =
  /(?:what\s+(?:to\s+)?feed|feed\s+plan|balanced\s+ration|least\s*cost|lcf\b|ration\s+balanc|poshan|fodder|concentrate|compound\s+feed|mineral\s+mix|berseem|bajra|straw|silage|bhusa|chara|chare|ghaas|green\s+fodder|dry\s+fodder|dan(?:a)?|mittha|tdn\b|kya\s+khil|kya\s+khila|kya\s+de(?:n|na)|kya\s+doo?n|khana\s+kya|chara\s+kya|aahar|aahara|rasan|rashan|खुराक|चारा|भोजन|आहार|क्या\s+खिल|दाना|भूसा|हरा\s+चार|सूखा\s+चार|संतुलित|राशन|রেশন|খাদ্য|খাবার|কী\s+খ|চারা|தீவன|என்ன\s+க|ఆహార|దాణా|ఏ\s+ప|మేత|आहार|આહાર|શું\s+ખ|ಆಹಾರ|ಮೇವು|ആഹാര|തീറ്റ|ਖੁਰਾਕ|ਖਾਣ|ଆହାର|ଖାଦ୍ୟ|আহাৰ|খুৱ|خوراک|کھل)/i;

const EXCLUDE_PATTERNS =
  /(?:human|people|worker|labour|staff|scheme|yojana|loan|insurance|subsidy|market\s+price|milk\s+rate|sell\s+milk|buy\s+cow|purchase\s+cattle|manure\s+compost|biogas|vaccin|disease|fever|mastitis|doctor|vet\b|paravet)/i;

export const RATION_ADVISORY_OFFER_MARKER = "[[RATION_ADVISORY_OFFER]]";

export function isFeedRationQuery(text: string): boolean {
  const t = (text || "").trim();
  if (!t || t.length < 4) return false;
  if (EXCLUDE_PATTERNS.test(t) && !FEED_RATION_QUERY.test(t)) return false;
  return FEED_RATION_QUERY.test(t);
}

export function stripRationAdvisoryOfferMarker(text: string): string {
  return text.replace(/\[\[RATION_ADVISORY_OFFER\]\]/g, "").trim();
}
