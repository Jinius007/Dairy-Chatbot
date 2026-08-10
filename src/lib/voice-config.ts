import { isBrowserSttSupported } from "@/lib/browserStt";

/** Use built-in browser speech APIs (no Sarvam / API keys). Set VITE_USE_BROWSER_VOICE=false to disable. */
export function useBrowserVoiceFirst(): boolean {
  return import.meta.env.VITE_USE_BROWSER_VOICE !== "false";
}

export function preferBrowserStt(): boolean {
  return useBrowserVoiceFirst() && isBrowserSttSupported();
}

export function preferBrowserTts(): boolean {
  return (
    useBrowserVoiceFirst() &&
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  );
}
