/** Vobiz PSTN line shown on the local-call deployment (optional). */
export function getVobizPhoneNumber(): string | null {
  const raw = import.meta.env.VITE_VOBIZ_PHONE_NUMBER?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return raw;
}

export function formatVobizPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `0${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (d.length === 11 && d.startsWith("0")) return `${d.slice(0, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return phone;
}

export function vobizTelUrl(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `tel:+91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `tel:+91${d.slice(1)}`;
  if (d.length === 12 && d.startsWith("91")) return `tel:+${d}`;
  return `tel:${phone}`;
}
