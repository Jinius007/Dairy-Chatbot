/** Keep recent turns only — long threads slow/fail the LLM and hang the UI. */
export function trimChatHistory<T extends { role: string; content: string }>(
  messages: T[],
  maxMessages = 14,
): T[] {
  if (messages.length <= maxMessages) return messages;
  return messages.slice(-maxMessages);
}

export function incompleteReplyFallback(lang: string | null | undefined): string {
  const code = lang && /^[a-z]{2}$/.test(lang) ? lang : "hi";
  const fallbacks: Record<string, string> = {
    hi: "[[LANG:hi]]\nक्षमा करें, जवाब पूरा नहीं हो पाया। कृपया अपना सवाल दोबारा भेजें।",
    bn: "[[LANG:bn]]\nদুঃখিত, উত্তর সম্পূর্ণ হয়নি। অনুগ্রহ করে আবার জিজ্ঞাসা করুন।",
    ta: "[[LANG:ta]]\nமன்னிக்கவும், பதில் முழுமையாக வரவில்லை. தயவுசெய்து மீண்டும் கேளுங்கள்.",
    te: "[[LANG:te]]\nక్షమించండి, సమాధానం పూర్తి కాలేదు. దయచేసి మళ్లీ అడగండి.",
    en: "[[LANG:en]]\nSorry, the answer could not be completed. Please try again.",
  };
  return fallbacks[code] || fallbacks.hi;
}
