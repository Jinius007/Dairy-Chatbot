/** Strip URLs not from curated knowledge-base domains. */

const ALLOWED_HOSTS = new Set([
  "dahd.gov.in",
  "www.dahd.gov.in",
  "nddb.coop",
  "www.nddb.coop",
  "dairyknowledge.in",
  "www.dairyknowledge.in",
  "bharatpashudhan.ndlm.co.in",
  "icar.org.in",
  "www.icar.org.in",
  "icar.org.in",
  "ivri.nic.in",
  "nivedi.res.in",
  "bis.gov.in",
  "www.bis.gov.in",
  "pib.gov.in",
  "www.pib.gov.in",
]);

function hostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  for (const allowed of ALLOWED_HOSTS) {
    const base = allowed.replace(/^www\./, "");
    if (h === base || h.endsWith(`.${base}`)) return true;
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

/** Remove disallowed http(s) links from model output. Keeps allowed KB URLs only. */
export function filterToAllowedUrls(text: string): string {
  if (!text?.trim()) return text;
  return text.replace(/https?:\/\/[^\s)\]"'<>]+/gi, (url) => {
    const cleaned = url.replace(/[.,;:!?)]+$/, "");
    const trailing = url.slice(cleaned.length);
    return isAllowedUrl(cleaned) ? cleaned + trailing : "";
  }).replace(/\s{2,}/g, " ").replace(/ +\n/g, "\n").trim();
}
