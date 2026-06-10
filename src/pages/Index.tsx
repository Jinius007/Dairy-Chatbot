import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatView } from "@/components/ChatView";
import { Search, Plus, MessageCircle, Trash2, Wheat, ChevronRight } from "lucide-react";

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
  const navigate = useNavigate();
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
        <div className="bg-header text-header-foreground p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center">🐄</div>
            <div className="font-medium">PashuMitra</div>
          </div>
          <div className="flex gap-1">
            <button onClick={newChat} className="p-2 hover:bg-white/10 rounded-full" title="New chat"><Plus className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-2 bg-muted/50">
          <button
            onClick={() => navigate("/ration")}
            className="w-full mb-2 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 text-left hover:bg-primary/10 transition"
          >
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Wheat className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">Ration Advisor · राशन सलाहकार</div>
              <div className="text-xs text-muted-foreground truncate">Low-cost balanced feed plan for your animal</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
          <div className="flex items-center gap-2 bg-card rounded-full px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" className="flex-1 bg-transparent outline-none text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12 px-4">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No chats yet</p>
              <button onClick={newChat} className="mt-3 text-primary font-medium">Start your first chat</button>
            </div>
          )}
          {filtered.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`group w-full text-left px-3 py-3 flex gap-3 border-b hover:bg-sidebar-hover transition ${activeId === c.id ? "bg-sidebar-hover" : ""}`}>
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl shrink-0">🐄</div>
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
            <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <MessageCircle className="w-16 h-16 text-primary" />
            </div>
            <h2 className="text-2xl font-light mb-2">PashuMitra Web</h2>
            <p className="text-muted-foreground max-w-md">Your AI companion for livestock care, dairy farming, and government schemes — in 7 Indian languages with text and voice.</p>
            <button onClick={newChat} className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary-dark">Start a new chat</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
