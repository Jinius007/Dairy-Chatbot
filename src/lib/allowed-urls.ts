/** Strip URLs not from curated knowledge-base domains (mirrors backend). */

const ALLOWED_HOSTS = new Set([
  "dahd.gov.in",
  "nddb.coop",
  "dairyknowledge.in",
  "bharatpashudhan.ndlm.co.in",
  "icar.org.in",
  "ivri.nic.in",
  "nivedi.res.in",
  "bis.gov.in",
  "pib.gov.in",
]);

function hostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  for (const allowed of ALLOWED_HOSTS) {
    if (h === allowed || h.endsWith(`.${allowed}`)) return true;
  }
  return false;
}

function isAllowedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return hostAllowed(u.hostname);
  } catch {
    return false;
  }
}

export function filterToAllowedUrls(text: string): string {
  if (!text?.trim()) return text;
  return text.replace(/https?:\/\/[^\s)\]"'<>]+/gi, (url) => {
    const cleaned = url.replace(/[.,;:!?)]+$/, "");
    const trailing = url.slice(cleaned.length);
    return isAllowedUrl(cleaned) ? cleaned + trailing : "";
  }).replace(/\s{2,}/g, " ").replace(/ +\n/g, "\n").trim();
}
