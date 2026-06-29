import { useCallback, useEffect, useRef, useState } from "react";
import { isBackendConfigured } from "@/lib/backend-config";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Tick } from "@/components/Tick";
import { BrandAvatar } from "@/components/BrandAvatar";
import { CallButton } from "@/components/CallView";
import {
  ArrowLeft,
  CircleArrowUp,
  Languages,
  Pause,
  Play,
  Square,
  Volume2,
} from "lucide-react";
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
import {
  appendVerifiedVideoBlock,
  buildVideoQuery,
  detectLangFromText,
  fetchVerifiedVideos,
  isYoutubeRequest,
  stripUnverifiedYoutubeUrls,
} from "@/lib/youtube";
import { detectLanguageFromMessages } from "@/lib/languages";
import { getChatCompletionsUrl, getChatRequestHeaders } from "@/lib/chat-api";
import { transcribeAudio } from "@/lib/transcribe-api";
import {
  SLOW_RESPONSE_MS,
  resolveUserLang,
  waitTrafficMessage,
  waitTranscribingMessage,
} from "@/lib/wait-messages";
import { VetNearbyPanel } from "@/components/VetNearbyPanel";
import { fetchNearbyVets } from "@/lib/vet-api";
import { getGeoCoords } from "@/lib/location";
import type { VetProfessional } from "@/lib/vet-types";
import {
  hasVetConsultMarker,
  isAffirmativeConsultReply,
  stripVetConsultMarker,
} from "@/lib/vet-consult";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: string | null;
  is_voice?: boolean;
  created_at: string;
}

interface Props {
  conversationId: string;
  onBack?: () => void;
  onConversationUpdated?: () => void;
}

const msgKey = (id: string) => `pashumitra_msgs_${id}`;
const CONV_KEY = "pashumitra_convs_v1";

// Extract optional [[LANG:xx]] header from streamed text
function splitLangHeader(text: string): { lang: string | null; body: string } {
  const re = /\[?\[?\s*LANG\s*:\s*([a-zA-Z]{2})\s*\]?\]?/i;
  const m = text.match(re);
  if (!m) return { lang: null, body: text };
  const idx = m.index ?? 0;
  const body = (text.slice(0, idx) + text.slice(idx + m[0].length)).replace(/^\s+/, "");
  return { lang: m[1].toLowerCase(), body };
}

function linkifyText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all text-primary">
        {part}
      </a>
    ) : (
      part
    ),
  );
}

export function ChatView({ conversationId, onBack, onConversationUpdated }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [slowWaitByMsg, setSlowWaitByMsg] = useState<Record<string, string>>({});
  const [activeUserLang, setActiveUserLang] = useState("hi");
  const [vetOfferForMsg, setVetOfferForMsg] = useState<string | null>(null);
  const [vetResultsByMsg, setVetResultsByMsg] = useState<Record<string, VetProfessional[]>>({});
  const [loadingVetsFor, setLoadingVetsFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

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

  const persist = useCallback((msgs: Message[]) => {
    localStorage.setItem(msgKey(conversationId), JSON.stringify(msgs));
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content || "";
    const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant")?.content || "";
    const lang = [...msgs].reverse().find((m) => m.language)?.language ?? null;
    try {
      const convs = JSON.parse(localStorage.getItem(CONV_KEY) || "[]");
      const idx = convs.findIndex((c: any) => c.id === conversationId);
      if (idx !== -1) {
        convs[idx] = {
          ...convs[idx],
          last_message: lastAssistant.slice(0, 80),
          language: lang,
          title: convs[idx].title === "New chat" && lastUser ? lastUser.slice(0, 40) : convs[idx].title,
          updated_at: new Date().toISOString(),
        };
        localStorage.setItem(CONV_KEY, JSON.stringify(convs));
      }
    } catch {}
    onConversationUpdated?.();
  }, [conversationId, onConversationUpdated]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(msgKey(conversationId)) || "[]");
      messagesRef.current = stored;
      setMessages(stored);
    }
    catch {
      messagesRef.current = [];
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const loadNearbyVets = useCallback(async (anchorMsgId: string, userLang: string) => {
    if (!isBackendConfigured()) {
      toast.error("Backend not configured");
      return;
    }
    setLoadingVetsFor(anchorMsgId);
    try {
      const coords = await getGeoCoords();
      if (!coords) {
        toast.error("Allow location access to find nearby vets / paravets");
        return;
      }
      const vets = await fetchNearbyVets(coords.lat, coords.lng, "all", 5);
      setVetResultsByMsg((prev) => ({ ...prev, [anchorMsgId]: vets }));
      setVetOfferForMsg(null);
      if (!vets.length) {
        toast.message(userLang === "en" ? "No vets found nearby" : "पास में कोई डॉक्टर नहीं मिला");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load nearby vets");
    } finally {
      setLoadingVetsFor(null);
    }
  }, []);

  const streamReply = async (
    history: Message[],
    assistantId: string,
    latestUserText: string,
    isVoice = false,
    startedAt?: number,
    userLang = "hi",
  ) => {
    if (!isBackendConfigured()) throw new Error("Backend is not configured on this deployment.");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const wantsVideo = isYoutubeRequest(latestUserText);
    const recentUser = history.filter((m) => m.role === "user").slice(-4).map((m) => m.content).join(" ");
    const videoLang = detectLangFromText(latestUserText + recentUser);

    let slowTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setSlowWaitByMsg((prev) => ({
        ...prev,
        [assistantId]: waitTrafficMessage(userLang),
      }));
    }, SLOW_RESPONSE_MS);

    const clearSlowTimer = () => {
      if (slowTimer) {
        clearTimeout(slowTimer);
        slowTimer = null;
      }
    };

    const resp = await fetch(getChatCompletionsUrl(), {
      method: "POST",
      headers: getChatRequestHeaders(),
      body: JSON.stringify({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        forceLanguage: userLang,
      }),
      signal: ctrl.signal,
    });

    if (resp.status === 429) throw new Error("Too many requests, please wait a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    if (!resp.ok || !resp.body) throw new Error(`Failed to get reply (${resp.status})`);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let done = false;
    let allowedVideoIds = new Set<string>();
    let gotFirstToken = false;

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
            if (!gotFirstToken) {
              gotFirstToken = true;
              clearSlowTimer();
              setSlowWaitByMsg((prev) => {
                const next = { ...prev };
                delete next[assistantId];
                return next;
              });
            }
            full += delta;
            let { lang, body } = splitLangHeader(full);
            if (wantsVideo && allowedVideoIds.size > 0) {
              body = stripUnverifiedYoutubeUrls(body, allowedVideoIds);
            }
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

    clearSlowTimer();
    setSlowWaitByMsg((prev) => {
      const next = { ...prev };
      delete next[assistantId];
      return next;
    });

    let { lang, body } = splitLangHeader(full);
    body = filterAbusiveLanguage(body);
    if (hasVetConsultMarker(body)) {
      body = stripVetConsultMarker(body);
      setVetOfferForMsg(assistantId);
    }

    let videos: Awaited<ReturnType<typeof fetchVerifiedVideos>> = [];
    if (wantsVideo) {
      // Search after AI reply so topic comes from full conversation + answer text
      const videoQuery = buildVideoQuery(latestUserText, recentUser, body);
      videos = await fetchVerifiedVideos(videoQuery, videoLang);
      allowedVideoIds = new Set(videos.map((v) => v.id));
      body = stripUnverifiedYoutubeUrls(body, allowedVideoIds);
      body = appendVerifiedVideoBlock(body, videos, videoLang);
      lang = splitLangHeader(full).lang ?? lang;
    }
    const updated = messagesRef.current.map((m) =>
      m.id === assistantId ? { ...m, content: body, language: lang ?? m.language ?? null } : m
    );
    messagesRef.current = updated;
    setMessages(updated);
    persist(updated);
    void logConversationTurn({
      session_id: getSessionId(),
      conversation_id: conversationId,
      question: latestUserText,
      answer: body,
      duration_ms: startedAt != null ? Date.now() - startedAt : null,
      language: lang,
      is_voice: isVoice,
      mode: isVoice ? "voice" : "chat",
    });
    return { text: body, lang };
  };

  const send = async (text: string, isVoice = false, voiceStartedAt?: number) => {
    if (!text.trim() || sending) return;

    const userLang = resolveUserLang(text, detectLanguageFromMessages(messages) || "hi");

    if (isAffirmativeConsultReply(text) && vetOfferForMsg) {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        is_voice: isVoice,
        created_at: new Date().toISOString(),
      };
      const updated = [...messagesRef.current, userMsg];
      messagesRef.current = updated;
      setMessages(updated);
      persist(updated);
      setActiveUserLang(userLang);
      await loadNearbyVets(vetOfferForMsg, userLang);
      return;
    }

    if (containsAbusiveLanguage(text)) {
      const refusal = abuseRefusalMessage(detectLangForRefusal(text));
      const { lang, body } = splitLangHeader(refusal);
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: filterAbusiveLanguage(text), is_voice: isVoice, created_at: new Date().toISOString() };
      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: body, language: lang, created_at: new Date().toISOString() };
      const updated = [...messagesRef.current, userMsg, assistantMsg];
      messagesRef.current = updated;
      setMessages(updated);
      persist(updated);
      return;
    }
    setSending(true);
    setInput("");
    const startedAt = voiceStartedAt ?? Date.now();
    setActiveUserLang(userLang);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, is_voice: isVoice, created_at: new Date().toISOString() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", created_at: new Date().toISOString() };
    const nextHistory = [...messages, userMsg];
    const visibleMessages = [...nextHistory, assistantMsg];
    messagesRef.current = visibleMessages;
    setMessages(visibleMessages);

    try {
      const { text: reply, lang } = await streamReply(nextHistory, assistantMsg.id, text, isVoice, startedAt, userLang);
      if (isVoice && reply) void speak(reply, lang, assistantMsg.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to get reply");
      setSlowWaitByMsg((prev) => {
        const next = { ...prev };
        delete next[assistantMsg.id];
        return next;
      });
      setMessages((m) => m.filter((x) => x.id !== assistantMsg.id));
    } finally {
      setSending(false);
    }
  };

  const handleVoice = async (b64: string, mime: string) => {
    if (!isBackendConfigured()) {
      toast.error("Backend is not configured on this deployment.");
      return;
    }
    setTranscribing(true);
    const startedAt = Date.now();
    const transcribeLang = detectLanguageFromMessages(messages) || activeUserLang || "hi";
    setActiveUserLang(transcribeLang);
    try {
      const data = await transcribeAudio(b64, mime, transcribeLang);
      if (data.blocked) {
        toast.message("Please use respectful language.");
        return;
      }
      const txt = filterAbusiveLanguage(data.transcript || "");
      if (txt) await send(txt, true, startedAt);
      else toast.error("Could not transcribe audio");
    } catch (e: any) {
      toast.error(e.message || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="bg-header text-header-foreground px-3 py-2.5 flex items-center gap-3 shadow-md shrink-0 border-b border-black/10">
        {onBack && (
          <button type="button" onClick={onBack} className="md:hidden p-1.5 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <BrandAvatar size="md" variant="header" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate tracking-tight">PashuMitra</div>
          <div className="text-xs opacity-85 font-medium">Online · Live voice available</div>
        </div>
        <CallButton />
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto chat-bg px-3 py-4">
        {messages.length === 0 && (
          <div className="text-center mt-10 text-muted-foreground">
            <p className="text-sm">Ask anything about livestock, dairy, schemes — in your language 🌾</p>
            <p className="text-xs mt-2">हिन्दी · বাংলা · தமிழ் · తెలుగు · मराठी · ગુજરાતી · ಕನ್ನಡ · മലയാളം · ਪੰਜਾਬੀ · ଓଡ଼ିଆ · অসমীয়া · اردو · English</p>
          </div>
        )}
        {messages.map((m) => {
          const out = m.role === "user";
          const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"} mb-2.5`}>
              <div className={`relative max-w-[78%] md:max-w-[65%] px-3.5 py-2.5 shadow-sm ${
                out
                  ? "bg-bubble-out text-bubble-out-foreground rounded-2xl rounded-br-md border border-primary/10"
                  : "bg-bubble-in text-bubble-in-foreground rounded-2xl rounded-bl-md border border-border/60"
              }`}>
                {!out && m.language && <div className="text-[10px] uppercase tracking-wide text-primary mb-0.5">{LANG_NAMES[m.language] || m.language}</div>}
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.content ? linkifyText(m.content) : slowWaitByMsg[m.id] ? (
                    <span className="text-muted-foreground italic">{slowWaitByMsg[m.id]}</span>
                  ) : (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full typing-dot" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
                </div>
                {!out && vetOfferForMsg === m.id && !vetResultsByMsg[m.id] && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border/50">
                    <button
                      type="button"
                      disabled={loadingVetsFor === m.id}
                      onClick={() => void loadNearbyVets(m.id, m.language || activeUserLang)}
                      className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {activeUserLang === "en" ? "Yes — show nearby vets" : "हाँ — पास के डॉक्टर दिखाएँ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVetOfferForMsg(null)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                    >
                      {activeUserLang === "en" ? "No thanks" : "नहीं, धन्यवाद"}
                    </button>
                  </div>
                )}
                {!out && (vetResultsByMsg[m.id] || loadingVetsFor === m.id) && (
                  <div className="mt-3">
                    <VetNearbyPanel
                      vets={vetResultsByMsg[m.id] || []}
                      loading={loadingVetsFor === m.id}
                      lang={m.language || activeUserLang}
                      onRetry={() => void loadNearbyVets(m.id, m.language || activeUserLang)}
                    />
                  </div>
                )}
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
                  {out && <Tick read />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-muted px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-end gap-2 shrink-0 border-t border-border/80">
        <button type="button" className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-accent/80" aria-label="Language">
          <Languages className="w-6 h-6" strokeWidth={1.75} />
        </button>
        <div className="flex-1 bg-card rounded-2xl px-4 py-2 border border-border/80 shadow-sm">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={transcribing ? waitTranscribingMessage(activeUserLang) : "Type your message"}
            disabled={sending || transcribing}
            className="w-full bg-transparent outline-none text-sm font-medium placeholder:font-normal placeholder:text-muted-foreground"
          />
        </div>
        {input.trim() ? (
          <button
            type="button"
            onClick={() => send(input)}
            disabled={sending}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark disabled:opacity-50 shadow-sm"
            aria-label="Send message"
          >
            <CircleArrowUp className="w-5 h-5" strokeWidth={2.25} />
          </button>
        ) : (
          <VoiceRecorder onRecorded={handleVoice} disabled={sending || transcribing} />
        )}
      </div>
    </div>
  );
}
