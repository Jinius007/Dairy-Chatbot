import { useEffect, useState } from "react";
import { ChatView } from "@/components/ChatView";
import { BrandAvatar } from "@/components/BrandAvatar";
import { APP_DISPLAY_NAME } from "@/lib/app-brand";
import { MessageSquarePlus, MessagesSquare, Search, Stethoscope, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

interface Conversation {
  id: string; title: string; last_message: string | null; language: string | null; updated_at: string;
}

const STORAGE_KEY = "pashumitra_convs_v1";

const loadConvs = (): Conversation[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
};
const saveConvs = (c: Conversation[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(c));

const createConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: "New chat",
  last_message: null,
  language: null,
  updated_at: new Date().toISOString(),
});

const Index = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let c = loadConvs();
    if (c.length === 0) {
      c = [createConversation()];
      saveConvs(c);
    }
    setConversations(c);
    setActiveId(c[0].id);
  }, []);

  const refresh = () => setConversations(loadConvs());

  const newChat = () => {
    const conv = createConversation();
    const next = [conv, ...conversations];
    saveConvs(next);
    setConversations(next);
    setActiveId(conv.id);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = conversations.filter((c) => c.id !== id);
    saveConvs(next);
    localStorage.removeItem(`pashumitra_msgs_${id}`);
    setConversations(next);
    if (activeId === id) setActiveId(next[0]?.id || null);
  };

  const filtered = conversations.filter((c) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.last_message?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full w-full flex bg-background overflow-hidden">
      <aside className={`${activeId ? "hidden md:flex" : "flex"} md:w-[380px] w-full flex-col border-r bg-sidebar min-h-0 shrink-0`}>
        <div className="bg-header text-header-foreground p-3 flex items-center justify-between border-b border-black/10">
          <div className="flex items-center gap-2.5">
            <BrandAvatar size="sm" variant="header" />
            <div>
              <div className="font-semibold tracking-tight">{APP_DISPLAY_NAME}</div>
              <div className="text-[11px] opacity-85 font-medium">Dairy & livestock assistant</div>
            </div>
          </div>
          <div className="flex gap-1">
            <Link to="/vet" className="p-2 hover:bg-white/10 rounded-lg" title="Vet / Paravet registration">
              <Stethoscope className="w-5 h-5" strokeWidth={1.75} />
            </Link>
            <button type="button" onClick={newChat} className="p-2 hover:bg-white/10 rounded-lg" title="New chat">
              <MessageSquarePlus className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <div className="p-2 bg-muted/60 border-b border-border/60">
          <div className="flex items-center gap-2 bg-card rounded-xl px-3 py-2 border border-border/70 shadow-sm">
            <Search className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:font-normal" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12 px-4">
              <MessagesSquare className="w-12 h-12 mx-auto mb-3 opacity-35 text-primary" strokeWidth={1.5} />
              <p className="font-medium">No chats yet</p>
              <button type="button" onClick={newChat} className="mt-3 text-primary font-semibold hover:underline">Start your first chat</button>
            </div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`group w-full text-left px-3 py-3 flex gap-3 border-b border-border/50 hover:bg-sidebar-hover transition ${
                activeId === c.id ? "bg-sidebar-hover border-l-[3px] border-l-primary pl-[calc(0.75rem-3px)]" : ""
              }`}
            >
              <BrandAvatar size="lg" variant={activeId === c.id ? "primary" : "surface"} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium truncate">{c.title || "New chat"}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="text-sm text-muted-foreground truncate">{c.last_message || "Tap to start chatting"}</div>
              </div>
              <span onClick={(e) => deleteChat(c.id, e)} className="opacity-0 group-hover:opacity-100 self-center p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className={`${activeId ? "flex" : "hidden md:flex"} flex-1 flex-col min-h-0 overflow-hidden`}>
        {activeId ? (
          <ChatView conversationId={activeId} onBack={() => setActiveId(null)} onConversationUpdated={refresh} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted text-center p-8">
            <div className="w-32 h-32 rounded-2xl bg-accent flex items-center justify-center mb-6 border border-primary/15 shadow-sm">
              <MessagesSquare className="w-16 h-16 text-primary" strokeWidth={1.25} />
            </div>
            <h2 className="text-2xl font-semibold mb-2 tracking-tight text-foreground">{APP_DISPLAY_NAME}</h2>
            <p className="text-muted-foreground max-w-md font-medium leading-relaxed">Your AI companion for livestock care, dairy farming, and government schemes — in Indian languages with text and voice.</p>
            <button type="button" onClick={newChat} className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary-dark font-semibold shadow-sm">
              Start a new chat
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
