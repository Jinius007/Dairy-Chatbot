export type VetProfessionalType = "vet" | "paravet";

export interface VetProfessional {
  id: string;
  type: VetProfessionalType;
  name: string;
  phone: string;
  email: string;
  qualification: string;
  college: string;
  licenseBody: string;
  registrationNumber: string;
  village: string | null;
  city: string;
  district: string;
  state: string;
  stateCode: string;
  lat: number;
  lng: number;
  yearsExperience: number;
  languages: string[];
  available?: boolean;
  distanceKm?: number;
}

export interface VetRegistrationInput {
  type: VetProfessionalType;
  name: string;
  phone: string;
  email: string;
  qualification: string;
  college: string;
  licenseBody: string;
  registrationNumber: string;
  village?: string;
  city: string;
  district: string;
  state: string;
  stateCode: string;
  lat: number;
  lng: number;
  yearsExperience: number;
}

/** Normalize Indian mobile to digits only (91XXXXXXXXXX). */
export function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  return d;
}

export function formatPhoneDisplay(phone: string): string {
  const p = normalizePhone(phone);
  if (p.length === 12) return `+${p.slice(0, 2)} ${p.slice(2, 7)} ${p.slice(7)}`;
  return phone;
}

export function locationLabel(v: Pick<VetProfessional, "village" | "city" | "district" | "state">): string {
  return [v.village, v.city, v.district, v.state].filter(Boolean).join(", ");
}

export function whatsAppUrl(phone: string, text?: string): string {
  const p = normalizePhone(phone);
  const base = `https://wa.me/${p}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function telUrl(phone: string): string {
  return `tel:+${normalizePhone(phone)}`;
}
