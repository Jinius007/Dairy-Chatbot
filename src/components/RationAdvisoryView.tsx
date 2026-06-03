import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ArrowLeft, Send, Volume2, Pause, Play, Square, Wheat } from "lucide-react";
import { toast } from "sonner";
import { LANG_NAMES } from "@/lib/languages";
import { speakText, stopSpeech, unlockAudioPlayback } from "@/lib/speech";
import { getSessionId } from "@/lib/session";
import { logConversationTurn } from "@/lib/log-turn";
import {
  abuseRefusalMessage,
  containsAbusiveLanguage,
  detectLangForRefusal,
  filterAbusiveLanguage,
} from "@/lib/content-safety";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: string | null;
  is_voice?: boolean;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "pashumitra_ration_advisory_v1";
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const WELCOME_HI =
  "🌾 Ration Advisory\n\nMain aapke har pashu ka sahi balanced chara tayyar karunga.\n\nPehle batayein — aapke paas kitni gaay ya bhains hain? Aur kaun se area/rajya mein farm hai?";

function splitLangHeader(text: string): { lang: string | null; body: string } {
  const re = /\[?\[?\s*LANG\s*:\s*([a-zA-Z]{2})\s*\]?\]?/i;
  const m = text.match(re);
  if (!m) return { lang: null, body: text };
  const idx = m.index ?? 0;
  const body = (text.slice(0, idx) + text.slice(idx + m[0].length)).replace(/^\s+/, "");
  return { lang: m[1].toLowerCase(), body };
}

function loadMessages(): Message[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveMessages(msgs: Message[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
}

export function RationAdvisoryView({ open, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    if (!open) return;
    const stored = loadMessages();
    messagesRef.current = stored;
    setMessages(stored);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const stopSpeak = useCallback(() => {
    stopSpeech();
    setSpeakingId(null);
    setPaused(false);
  }, []);

  const speak = useCallback(async (text: string, lang?: string | null, id?: string) => {
    if (!text.trim()) return;
    setSpeakingId(id ?? null);
    setPaused(false);
    try {
      await unlockAudioPlayback();
      await speakText(text, { lang });
    } finally {
      setSpeakingId((cur) => (cur === id ? null : cur));
      setPaused(false);
    }
  }, []);

  const togglePause = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (synth.paused) { synth.resume(); setPaused(false); }
    else if (synth.speaking) { synth.pause(); setPaused(true); }
  }, []);

  const streamReply = async (history: Message[], assistantId: string, latestUserText: string, isVoice = false, startedAt?: number) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured on this deployment.");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        mode: "ration_advisory",
      }),
      signal: ctrl.signal,
    });

    if (resp.status === 429) throw new Error("Too many requests, please wait a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    if (!resp.ok || !resp.body) throw new Error("Failed to get reply.");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let done = false;

    while (!done) {
      const { done: rd, value } = await reader.read();
      if (rd) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") { done = true; break; }
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (delta) {
            full += delta;
            const { lang, body } = splitLangHeader(full);
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.id === assistantId ? { ...m, content: body, language: lang ?? m.language } : m
              );
              messagesRef.current = updated;
              return updated;
            });
          }
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    let { lang, body } = splitLangHeader(full);
    body = filterAbusiveLanguage(body);
    const updated = messagesRef.current.map((m) =>
      m.id === assistantId ? { ...m, content: body, language: lang ?? m.language ?? null } : m
    );
    messagesRef.current = updated;
    setMessages(updated);
    saveMessages(updated);
    void logConversationTurn({
      session_id: getSessionId(),
      conversation_id: "ration_advisory",
      question: latestUserText,
      answer: body,
      duration_ms: startedAt != null ? Date.now() - startedAt : null,
      language: lang,
      is_voice: isVoice,
      mode: "ration_advisory",
    });
    return { text: body, lang };
  };

  const send = async (text: string, isVoice = false, voiceStartedAt?: number) => {
    if (!text.trim() || sending) return;
    if (containsAbusiveLanguage(text)) {
      const refusal = abuseRefusalMessage(detectLangForRefusal(text));
      const { lang, body } = splitLangHeader(refusal);
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: filterAbusiveLanguage(text), is_voice: isVoice, created_at: new Date().toISOString() };
      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: body, language: lang, created_at: new Date().toISOString() };
      const updated = [...messagesRef.current, userMsg, assistantMsg];
      messagesRef.current = updated;
      setMessages(updated);
      saveMessages(updated);
      return;
    }
    setSending(true);
    setInput("");
    const startedAt = voiceStartedAt ?? Date.now();
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, is_voice: isVoice, created_at: new Date().toISOString() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", created_at: new Date().toISOString() };
    const nextHistory = [...messagesRef.current, userMsg];
    const visibleMessages = [...nextHistory, assistantMsg];
    messagesRef.current = visibleMessages;
    setMessages(visibleMessages);

    try {
      const { text: reply, lang } = await streamReply(nextHistory, assistantMsg.id, text, isVoice, startedAt);
      if (isVoice && reply) void speak(reply, lang, assistantMsg.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to get reply");
      setMessages((m) => m.filter((x) => x.id !== assistantMsg.id));
      messagesRef.current = messagesRef.current.filter((x) => x.id !== assistantMsg.id);
    } finally {
      setSending(false);
    }
  };

  const handleVoice = async (b64: string, mime: string) => {
    if (!supabase) {
      toast.error("Supabase is not configured on this deployment.");
      return;
    }
    setTranscribing(true);
    const startedAt = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke("transcribe", {
        body: { audioBase64: b64, mimeType: mime },
      });
      if (error) throw error;
      if ((data as any)?.blocked) {
        toast.message("Please use respectful language.");
        return;
      }
      const txt = filterAbusiveLanguage((data as any)?.transcript || "");
      if (txt) await send(txt, true, startedAt);
      else toast.error("Could not transcribe audio");
    } catch (e: any) {
      toast.error(e.message || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const clearSession = () => {
    stopSpeak();
    messagesRef.current = [];
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.message("Ration advisory reset — start fresh");
  };

  if (!open) return null;

  const showWelcome = messages.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden bg-background">
      <div className="bg-emerald-800 text-white px-3 py-2.5 flex items-center gap-3 shadow shrink-0">
        <button onClick={() => { stopSpeak(); onClose(); }} className="p-1" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
          <Wheat className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">Ration Advisory</div>
          <div className="text-xs opacity-80">Detailed balanced feed plan for your herd</div>
        </div>
        <button onClick={clearSession} className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20" title="Start over">
          Reset
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto chat-bg px-3 py-4">
        {showWelcome && (
          <div className="flex justify-start mb-3">
            <div className="max-w-[85%] px-3 py-2 rounded-lg bg-bubble-in text-bubble-in-foreground rounded-tl-none shadow-sm">
              <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{WELCOME_HI}</div>
            </div>
          </div>
        )}
        {messages.map((m) => {
          const out = m.role === "user";
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"} mb-2`}>
              <div className={`relative max-w-[78%] md:max-w-[65%] px-3 py-2 rounded-lg shadow-sm ${
                out ? "bg-bubble-out text-bubble-out-foreground rounded-tr-none bubble-tail-out" : "bg-bubble-in text-bubble-in-foreground rounded-tl-none bubble-tail-in"
              }`}>
                {!out && m.language && <div className="text-[10px] uppercase tracking-wide text-primary mb-0.5">{LANG_NAMES[m.language] || m.language}</div>}
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.content || (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </div>
                <div className={`flex items-center gap-1 mt-1 ${out ? "justify-end" : "justify-start"}`}>
                  {!out && m.content && (
                    speakingId === m.id ? (
                      <>
                        <button onClick={togglePause} className="text-muted-foreground hover:text-primary" title={paused ? "Resume" : "Pause"}>
                          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={stopSpeak} className="text-muted-foreground hover:text-primary mr-1" title="Stop">
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => speak(m.content, m.language, m.id)} className="text-muted-foreground hover:text-primary mr-1" title="Play audio">
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                  <span className="text-[10px] text-muted-foreground">{time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-muted px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-end gap-2 shrink-0">
        <div className="flex-1 bg-card rounded-full px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={transcribing ? "Transcribing voice…" : "e.g. 5 bhains, Murrah, 8 litre dudh…"}
            disabled={sending || transcribing}
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
        {input.trim() ? (
          <button onClick={() => send(input)} disabled={sending} className="p-2.5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <VoiceRecorder onRecorded={handleVoice} disabled={sending || transcribing} />
        )}
      </div>
    </div>
  );
}

export function RationAdvisoryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-white/10 rounded-full transition"
      title="Ration Advisory — detailed feed plan"
      aria-label="Open Ration Advisory"
    >
      <Wheat className="w-5 h-5" />
    </button>
  );
}
