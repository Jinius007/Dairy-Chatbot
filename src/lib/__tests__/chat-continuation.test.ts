import { describe, expect, it } from "vitest";
import { looksIncompleteReply } from "@/lib/chat-continuation";

describe("looksIncompleteReply", () => {
  it("detects mid-word cutoff like the Gir cow example", () => {
    const text = "[[LANG:hi]]\nगिर गाय बहुत अच्छी चॉइस है! ये इंडियन क्लाइमेट में बहुत स्ट्रॉन्ग और हार्टी होती हैं, कम बीमारियाँ लगती हैं। दू";
    expect(looksIncompleteReply(text)).toBe(true);
  });

  it("accepts a complete sentence ending", () => {
    const text = "[[LANG:hi]]\nगिर गाय भारत में बहुत अच्छी नस्ल है।";
    expect(looksIncompleteReply(text)).toBe(false);
  });
});
