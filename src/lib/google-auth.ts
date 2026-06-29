/** Google sign-in session for vet portal (Gmail). */

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

const STORAGE_KEY = "pashumitra_vet_google_user_v1";

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function isGoogleAuthConfigured(): boolean {
  return getGoogleClientId().length > 10;
}

export function loadGoogleUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GoogleUser;
  } catch {
    return null;
  }
}

export function saveGoogleUser(user: GoogleUser): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearGoogleUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function parseGoogleJwt(credential: string): GoogleUser | null {
  try {
    const payload = credential.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json) as { email?: string; name?: string; picture?: string; sub?: string };
    if (!data.email || !data.sub) return null;
    return {
      email: data.email,
      name: data.name || data.email.split("@")[0],
      picture: data.picture,
      sub: data.sub,
    };
  } catch {
    return null;
  }
}
