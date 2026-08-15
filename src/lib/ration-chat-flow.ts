import {
  initialPoshanState,
  languagePrompt,
  loadPoshanState,
  openingLine,
  processPoshanInput,
  savePoshanState,
  type PoshanConvState,
  type PoshanLang,
} from "@/lib/poshan-conversation";
import { ensureNativeScriptText } from "@/lib/native-script-api";
import { matchLangCode } from "@/lib/rationVoice";

/** Show ration reply in native script for Indic languages (bn, ta, mr, …). */
export async function displayRationReply(
  reply: string,
  language: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!reply?.trim() || !language || language === "en") return reply;
  return ensureNativeScriptText(reply, language, signal);
}

/** Seed first assistant messages for a new ration chat. */
export function rationChatBootstrap(lang?: PoshanLang): { content: string; language: string }[] {
  if (lang) {
    return [{ content: openingLine(lang), language: lang }];
  }
  return [{ content: languagePrompt(), language: "hi" }];
}

/** Handle one farmer turn in ration chat (text or voice transcript). */
export function handleRationChatTurn(
  conversationId: string,
  userText: string,
  explicitLang?: string,
): { reply: string; language: string; done: boolean } {
  let state = loadPoshanState(conversationId);

  if (!state) {
    const code = matchLangCode(userText) || explicitLang;
    const lang: PoshanLang = code === "en" ? "en" : "hi";
    if (/english|angrezi|en\b/i.test(userText.toLowerCase()) || code === "en") {
      state = initialPoshanState("en");
    } else if (/hindi|हिन्दी|हिंदी|hi\b/i.test(userText.toLowerCase()) || code === "hi") {
      state = initialPoshanState("hi");
    } else {
      state = { lang: "hi", stage: "language", draft: initialPoshanState("hi").draft };
    }
  }

  const result = processPoshanInput(state, userText);
  savePoshanState(conversationId, result.state);
  return {
    reply: result.reply,
    language: result.state.lang,
    done: result.done,
  };
}

export function getPoshanState(conversationId: string): PoshanConvState | null {
  return loadPoshanState(conversationId);
}
