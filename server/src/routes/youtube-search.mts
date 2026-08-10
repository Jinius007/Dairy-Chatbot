import type { Request, Response } from "express";
import { findYoutubeVideos } from "../../lib/youtube-search.ts";

export async function handleYoutubeSearch(req: Request, res: Response): Promise<void> {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { query = "dairy farming", lang = "hi", max = 3 } = req.body ?? {};
    const limit = Math.min(Math.max(Number(max) || 3, 1), 5);
    const q = String(query);
    const videos = await findYoutubeVideos(q, String(lang), limit);

    res.status(200).json({
      videos,
      query: q,
      source: videos.length > 0 ? "official_channels" : "none",
      policy: "official_cooperative_channels_only",
    });
  } catch (e) {
    console.error("youtube-search error:", e);
    res.status(200).json({
      videos: [],
      query: "dairy farming",
      fallback: true,
      source: "error",
      policy: "official_cooperative_channels_only",
    });
  }
}
