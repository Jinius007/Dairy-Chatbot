import { describe, expect, it } from "vitest";
import {
  hasDairySignal,
  isDairyRelatedQuery,
  isStrictOffTopic,
} from "../../../catalyst/functions/pashumitra_api/lib/domain-guard.ts";

describe("domain-guard", () => {
  it("allows dairy queries including Banglish without gaay", () => {
    expect(isDairyRelatedQuery([], "gir gaay ke baare mein batao")).toBe(true);
    expect(isDairyRelatedQuery([], "gorur kemon khabar lagbe")).toBe(true);
    expect(isDairyRelatedQuery([], "ekti gaay ke kotota khabar dewa uchit")).toBe(true);
    expect(hasDairySignal("kitna doodh deti hai murrah bhains")).toBe(true);
    expect(hasDairySignal("gorur kemon khabar lagbe")).toBe(true);
  });

  it("blocks cricket and general knowledge", () => {
    expect(isStrictOffTopic("who won the cricket world cup")).toBe(true);
    expect(isDairyRelatedQuery([], "tell me a joke")).toBe(false);
    expect(isDairyRelatedQuery([], "what is machine learning")).toBe(false);
  });

  it("allows follow-ups in dairy thread", () => {
    const msgs = [
      { role: "user", content: "gir gaay ki kya khasiyat hai" },
      { role: "assistant", content: "..." },
    ];
    expect(isDairyRelatedQuery([...msgs, { role: "user", content: "aur batao" }], "aur batao")).toBe(true);
  });

  it("allows ambiguous farming questions by default", () => {
    expect(isDairyRelatedQuery([], "mera pashu kamzor hai kya karun")).toBe(true);
    expect(isDairyRelatedQuery([], "how to improve milk quality")).toBe(true);
  });
});
