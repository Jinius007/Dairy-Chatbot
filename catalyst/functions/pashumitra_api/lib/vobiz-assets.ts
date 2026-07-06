import fs from "fs";
import path from "path";

/** Works in dev (lib/…) and production bundle (index.js next to assets/). */
export function vobizAssetsDir(): string {
  const candidates = [
    path.join(__dirname, "assets"),
    path.join(__dirname, "..", "assets"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return path.join(__dirname, "assets");
}

export function staticPhrasePath(name: string): string {
  const safe = name.replace(/[^a-z0-9-]/gi, "");
  return path.join(vobizAssetsDir(), `vobiz-${safe}.mp3`);
}

export function readStaticPhrase(name: string): Buffer | null {
  try {
    const p = staticPhrasePath(name);
    if (fs.existsSync(p) && fs.statSync(p).size > 500) return fs.readFileSync(p);
  } catch {
    /* ignore */
  }
  return null;
}
