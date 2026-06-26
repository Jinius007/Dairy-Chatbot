import { getTranscribeHeaders, getTranscribeUrl } from "@/lib/backend-config";

export interface TranscribeResult {
  transcript: string;
  blocked?: boolean;
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  language?: string,
  step?: string,
): Promise<TranscribeResult> {
  const res = await fetch(getTranscribeUrl(), {
    method: "POST",
    headers: getTranscribeHeaders(),
    body: JSON.stringify({ audioBase64, mimeType, language, step }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Transcription failed");
  }
  const data = await res.json() as TranscribeResult;
  return data;
}
