import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface VetProfessional {
  id: string;
  type: "vet" | "paravet";
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
  type: "vet" | "paravet";
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

const STATE_CODES = [
  "PB", "HR", "UP", "UK", "DL", "RJ", "GJ", "MP", "MH", "CG",
  "KA", "AP", "TS", "TN", "KL", "WB", "BR", "OR", "AS", "JH",
];

const cache = new Map<string, VetProfessional[]>();
let registrationsCache: VetProfessional[] | null = null;

function dataDir(): string {
  // Bundled into index.js — data lives beside the function entry.
  const root =
    typeof __dirname !== "undefined"
      ? __dirname
      : path.dirname(fileURLToPath(import.meta.url));
  return path.join(root, "data", "vets");
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadState(code: string): VetProfessional[] {
  if (cache.has(code)) return cache.get(code)!;
  const fp = path.join(dataDir(), `${code}.json`);
  if (!fs.existsSync(fp)) {
    cache.set(code, []);
    return [];
  }
  try {
    const rows = JSON.parse(fs.readFileSync(fp, "utf8")) as VetProfessional[];
    cache.set(code, rows);
    return rows;
  } catch {
    cache.set(code, []);
    return [];
  }
}

function loadRegistrations(): VetProfessional[] {
  if (registrationsCache) return registrationsCache;
  const fp = path.join(dataDir(), "registrations.json");
  if (!fs.existsSync(fp)) {
    registrationsCache = [];
    return [];
  }
  try {
    registrationsCache = JSON.parse(fs.readFileSync(fp, "utf8")) as VetProfessional[];
    return registrationsCache;
  } catch {
    registrationsCache = [];
    return [];
  }
}

function saveRegistrations(rows: VetProfessional[]): void {
  registrationsCache = rows;
  const fp = path.join(dataDir(), "registrations.json");
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(rows, null, 2), "utf8");
}

function nearestStateCodes(lat: number, lng: number, limit = 4): string[] {
  const centroids: Record<string, { lat: number; lng: number }> = {
    PB: { lat: 31.15, lng: 75.78 }, HR: { lat: 29.06, lng: 76.08 }, UP: { lat: 26.85, lng: 80.95 },
    UK: { lat: 30.07, lng: 79.02 }, DL: { lat: 28.61, lng: 77.21 }, RJ: { lat: 26.91, lng: 75.79 },
    GJ: { lat: 22.26, lng: 71.19 }, MP: { lat: 23.26, lng: 77.41 }, MH: { lat: 19.08, lng: 72.88 },
    CG: { lat: 21.25, lng: 81.63 }, KA: { lat: 12.97, lng: 77.59 }, AP: { lat: 15.91, lng: 79.74 },
    TS: { lat: 17.39, lng: 78.49 }, TN: { lat: 13.08, lng: 80.27 }, KL: { lat: 10.85, lng: 76.27 },
    WB: { lat: 22.57, lng: 88.36 }, BR: { lat: 25.59, lng: 85.13 }, OR: { lat: 20.3, lng: 85.82 },
    AS: { lat: 26.14, lng: 91.79 }, JH: { lat: 23.61, lng: 85.28 },
  };
  return STATE_CODES.map((code) => ({
    code,
    d: haversineKm(lat, lng, centroids[code].lat, centroids[code].lng),
  }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit)
    .map((x) => x.code);
}

export function findNearbyVets(opts: {
  lat: number;
  lng: number;
  type?: "vet" | "paravet" | "all";
  limit?: number;
  extra?: VetProfessional[];
}): VetProfessional[] {
  const { lat, lng, type = "all", limit = 5, extra = [] } = opts;
  const stateCodes = nearestStateCodes(lat, lng, 5);
  const pool: VetProfessional[] = [...extra];

  for (const code of stateCodes) {
    pool.push(...loadState(code));
  }
  pool.push(...loadRegistrations());

  const filtered = pool.filter((v) => {
    if (v.available === false) return false;
    if (type !== "all" && v.type !== type) return false;
    return Number.isFinite(v.lat) && Number.isFinite(v.lng);
  });

  const scored = filtered.map((v) => ({
    v,
    d: haversineKm(lat, lng, v.lat, v.lng),
  }));

  const seen = new Set<string>();
  const unique: typeof scored = [];
  for (const row of scored.sort((a, b) => a.d - b.d)) {
    const key = row.v.phone;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
    if (unique.length >= limit) break;
  }

  return unique.map(({ v, d }) => ({
    ...v,
    distanceKm: Math.round(d * 10) / 10,
  }));
}

export function registerVet(input: VetRegistrationInput): VetProfessional {
  const phone = input.phone.replace(/\D/g, "");
  const normalized = phone.length === 10 ? `91${phone}` : phone;
  const record: VetProfessional = {
    id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    name: input.name.trim(),
    phone: normalized,
    email: input.email.trim(),
    qualification: input.qualification.trim(),
    college: input.college.trim(),
    licenseBody: input.licenseBody.trim(),
    registrationNumber: input.registrationNumber.trim(),
    village: input.village?.trim() || null,
    city: input.city.trim(),
    district: input.district.trim(),
    state: input.state.trim(),
    stateCode: input.stateCode,
    lat: input.lat,
    lng: input.lng,
    yearsExperience: input.yearsExperience,
    languages: ["hi", "en"],
    available: true,
  };

  const existing = loadRegistrations();
  const dup = existing.some((r) => r.phone === record.phone || r.registrationNumber === record.registrationNumber);
  if (dup) throw new Error("Phone or registration number already registered");

  existing.push(record);
  try {
    saveRegistrations(existing);
  } catch (e) {
    console.warn("Could not persist vet registration to disk:", e);
  }
  return record;
}

export function getVetStats(): { total: number; vets: number; paravets: number; registered: number } {
  let total = 0;
  let vets = 0;
  let paravets = 0;
  for (const code of STATE_CODES) {
    for (const v of loadState(code)) {
      total++;
      if (v.type === "vet") vets++;
      else paravets++;
    }
  }
  const reg = loadRegistrations().length;
  return { total, vets, paravets, registered: reg };
}
