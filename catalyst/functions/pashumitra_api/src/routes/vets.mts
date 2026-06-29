import { findNearbyVets, getVetStats, registerVet, type VetRegistrationInput } from "../../lib/vets/directory.ts";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export async function handleVetsNearby(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  try {
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const type = (url.searchParams.get("type") || "all") as "vet" | "paravet" | "all";
    const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit") || "5")));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: "lat and lng required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    let extra = [];
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.extra)) extra = body.extra;
    }

    const results = findNearbyVets({ lat, lng, type, limit, extra });
    return new Response(JSON.stringify({ results, count: results.length }), { headers: jsonHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Server error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
}

export async function handleVetsRegister(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: jsonHeaders });
  }

  try {
    const body = (await req.json()) as VetRegistrationInput;
    const required = [
      "type", "name", "phone", "email", "qualification", "college",
      "licenseBody", "registrationNumber", "city", "district", "state", "stateCode",
    ] as const;
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === "") {
        return new Response(JSON.stringify({ error: `Missing field: ${k}` }), {
          status: 400,
          headers: jsonHeaders,
        });
      }
    }
    if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
      return new Response(JSON.stringify({ error: "GPS location (lat/lng) required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const record = registerVet({
      ...body,
      yearsExperience: Number(body.yearsExperience) || 1,
    });
    return new Response(JSON.stringify({ ok: true, vet: record }), { headers: jsonHeaders });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
}

export async function handleVetsStats(_req: Request): Promise<Response> {
  return new Response(JSON.stringify(getVetStats()), { headers: jsonHeaders });
}
