import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Tick } from "@/components/Tick";
import { CallView, CallButton, type CallTurn } from "@/components/CallView";
import { ArrowLeft, Send, Smile, Paperclip, MoreVertical, Volume2, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { LANG_NAMES } from "@/lib/languages";
import { speakText, stopSpeech, unlockAudioPlayback } from "@/lib/speech";
import {
  appendVerifiedVideoBlock,
  buildVideoQuery,
  detectLangFromText,
  fetchVerifiedVideos,
  isYoutubeRequest,
  stripUnverifiedYoutubeUrls,
} from "@/lib/youtube";

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

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

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
  const [callOpen, setCallOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
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

  const openCall = useCallback(() => {
    stopSpeak();
    setCallOpen(true);
  }, [stopSpeak]);

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

  const streamReply = async (history: Message[], assistantId: string, latestUserText: string) => {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured on this deployment.");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const wantsVideo = isYoutubeRequest(latestUserText);
    const recentUser = history.filter((m) => m.role === "user").slice(-4).map((m) => m.content).join(" ");
    const videoLang = detectLangFromText(latestUserText + recentUser);

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: history.map((m) => ({ role: m.role, content: m.content })),
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
    let allowedVideoIds = new Set<string>();

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

    let { lang, body } = splitLangHeader(full);

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
    return { text: body, lang };
  };

  const send = async (text: string, isVoice = false) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput("");
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, is_voice: isVoice, created_at: new Date().toISOString() };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", created_at: new Date().toISOString() };
    const nextHistory = [...messages, userMsg];
    const visibleMessages = [...nextHistory, assistantMsg];
    messagesRef.current = visibleMessages;
    setMessages(visibleMessages);

    try {
      const { text: reply, lang } = await streamReply(nextHistory, assistantMsg.id, text);
      if (isVoice && reply) void speak(reply, lang, assistantMsg.id);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to get reply");
      setMessages((m) => m.filter((x) => x.id !== assistantMsg.id));
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
    try {
      const { data, error } = await supabase.functions.invoke("transcribe", { body: { audioBase64: b64, mimeType: mime } });
      if (error) throw error;
      const txt = (data as any)?.transcript;
      if (txt) await send(txt, true);
      else toast.error("Could not transcribe audio");
    } catch (e: any) {
      toast.error(e.message || "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  };

  const handleCallEnd = (turns: CallTurn[]) => {
    setCallOpen(false);
    if (turns.length === 0) return;
    const newMsgs: Message[] = turns.map((t) => ({
      id: t.id, role: t.role, content: t.content, language: t.language ?? null,
      is_voice: true, created_at: t.created_at,
    }));
    const sepUser: Message = {
      id: crypto.randomUUID(), role: "user",
      content: "📞 Call started", created_at: turns[0].created_at, is_voice: false,
    };
    const sepEnd: Message = {
      id: crypto.randomUUID(), role: "assistant",
      content: `📞 Call ended (${turns.length} turn${turns.length > 1 ? "s" : ""})`,
      created_at: new Date().toISOString(), is_voice: false,
    };
    const updated = [...messagesRef.current, sepUser, ...newMsgs, sepEnd];
    messagesRef.current = updated;
    setMessages(updated);
    persist(updated);
    toast.success(`Call saved — ${turns.length} turns transcribed.`);
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {callOpen && <CallView open={callOpen} onClose={handleCallEnd} history={messages.filter((m) => m.content && !m.content.startsWith("📞")).map((m) => ({ role: m.role, content: m.content }))} />}
      <div className="bg-header text-header-foreground px-3 py-2.5 flex items-center gap-3 shadow shrink-0">
        {onBack && <button onClick={onBack} className="md:hidden p-1"><ArrowLeft className="w-5 h-5" /></button>}
        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-lg">🐄</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">PashuMitra</div>
          <div className="text-xs opacity-80">Online · Tap 📞 to talk live</div>
        </div>
        <CallButton onClick={openCall} />
        <button className="p-1 opacity-80 hover:opacity-100"><MoreVertical className="w-5 h-5" /></button>
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
            <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"} mb-2`}>
              <div className={`relative max-w-[78%] md:max-w-[65%] px-3 py-2 rounded-lg shadow-sm ${
                out ? "bg-bubble-out text-bubble-out-foreground rounded-tr-none bubble-tail-out" : "bg-bubble-in text-bubble-in-foreground rounded-tl-none bubble-tail-in"
              }`}>
                {!out && m.language && <div className="text-[10px] uppercase tracking-wide text-primary mb-0.5">{LANG_NAMES[m.language] || m.language}</div>}
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.content ? linkifyText(m.content) : (
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
                  {out && <Tick read />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-muted px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-end gap-2 shrink-0">
        <button className="p-2 text-muted-foreground hover:text-foreground"><Smile className="w-6 h-6" /></button>
        <button className="p-2 text-muted-foreground hover:text-foreground hidden sm:block"><Paperclip className="w-6 h-6" /></button>
        <div className="flex-1 bg-card rounded-full px-4 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={transcribing ? "Transcribing voice…" : "Type a message"}
            disabled={sending || transcribing}
            className="w-full bg-transparent outline-none text-sm"
          />
        </div>
        {input.trim() ? (
          <button onClick={() => send(input)} disabled={sending} className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary-dark disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <VoiceRecorder onRecorded={handleVoice} disabled={sending || transcribing} />
        )}
      </div>
    </div>
  );
}
