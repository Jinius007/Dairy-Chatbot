/** Per-call conversation state (Vobiz is stateless — we track CallUUID). */

export type CallMessage = { role: "user" | "assistant"; content: string };

type Session = {
  messages: CallMessage[];
  lang: string | null;
  expires: number;
};

const store = new Map<string, Session>();
const TTL_MS = 30 * 60 * 1000;
const MAX_TURNS = 12;

function purge(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
}

export function getCallSession(callUuid: string): Session {
  purge();
  const key = callUuid.trim();
  if (!key) {
    return { messages: [], lang: null, expires: Date.now() + TTL_MS };
  }
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return hit;
  const fresh: Session = { messages: [], lang: null, expires: Date.now() + TTL_MS };
  store.set(key, fresh);
  return fresh;
}

export function getSessionLang(callUuid: string): string | null {
  return getCallSession(callUuid).lang;
}

export function setSessionLang(callUuid: string, lang: string): void {
  if (!callUuid.trim() || !lang) return;
  const session = getCallSession(callUuid);
  session.lang = lang;
  session.expires = Date.now() + TTL_MS;
  store.set(callUuid, session);
}

export function appendCallTurn(
  callUuid: string,
  userText: string,
  assistantText: string,
  lang: string | null,
): CallMessage[] {
  if (!callUuid.trim()) return [];
  const session = getCallSession(callUuid);
  session.messages.push({ role: "user", content: userText });
  session.messages.push({ role: "assistant", content: assistantText });
  if (lang) session.lang = lang;
  if (session.messages.length > MAX_TURNS * 2) {
    session.messages = session.messages.slice(-MAX_TURNS * 2);
  }
  session.expires = Date.now() + TTL_MS;
  store.set(callUuid, session);
  return session.messages;
}

export function clearCallSession(callUuid: string): void {
  if (callUuid.trim()) store.delete(callUuid.trim());
}
