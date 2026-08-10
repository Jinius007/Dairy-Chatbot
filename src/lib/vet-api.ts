import type { VetProfessional, VetProfessionalType, VetRegistrationInput } from "./vet-types";
import { getApiBaseUrl, getChatRequestHeaders, isBackendConfigured } from "./backend-config";

export function getVetsNearbyUrl(lat: number, lng: number, type: "all" | VetProfessionalType = "all", limit = 5): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    type,
    limit: String(limit),
  });
  return `${getApiBaseUrl()}/vets/nearby?${params}`;
}

export function getVetsRegisterUrl(): string {
  return `${getApiBaseUrl()}/vets/register`;
}

export function getVetsStatsUrl(): string {
  return `${getApiBaseUrl()}/vets/stats`;
}

const LOCAL_VETS_KEY = "pashumitra_registered_vets_v1";

export function loadLocalRegisteredVets(): VetProfessional[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_VETS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLocalRegisteredVet(vet: VetProfessional): void {
  const list = loadLocalRegisteredVets().filter((v) => v.phone !== vet.phone);
  list.unshift(vet);
  localStorage.setItem(LOCAL_VETS_KEY, JSON.stringify(list.slice(0, 50)));
}

export async function fetchNearbyVets(
  lat: number,
  lng: number,
  type: "all" | VetProfessionalType = "all",
  limit = 5,
): Promise<VetProfessional[]> {
  if (!isBackendConfigured()) throw new Error("Backend not configured");
  const extra = loadLocalRegisteredVets();
  const resp = await fetch(getVetsNearbyUrl(lat, lng, type, limit), {
    method: "POST",
    headers: getChatRequestHeaders(),
    body: JSON.stringify({ extra }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch vets (${resp.status})`);
  }
  const data = await resp.json();
  return data.results as VetProfessional[];
}

export async function registerVetProfessional(input: VetRegistrationInput): Promise<VetProfessional> {
  if (!isBackendConfigured()) throw new Error("Backend not configured");
  const resp = await fetch(getVetsRegisterUrl(), {
    method: "POST",
    headers: getChatRequestHeaders(),
    body: JSON.stringify(input),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || "Registration failed");
  const vet = data.vet as VetProfessional;
  saveLocalRegisteredVet(vet);
  return vet;
}

export async function fetchVetStats(): Promise<{ total: number; vets: number; paravets: number; registered: number }> {
  if (!isBackendConfigured()) return { total: 0, vets: 0, paravets: 0, registered: 0 };
  const resp = await fetch(getVetsStatsUrl());
  if (!resp.ok) return { total: 0, vets: 0, paravets: 0, registered: 0 };
  return resp.json();
}
