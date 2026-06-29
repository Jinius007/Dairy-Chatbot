import { describe, expect, it } from "vitest";
import {
  hasDairySignal,
  isDairyRelatedQuery,
  isStrictOffTopic,
} from "../../../catalyst/functions/pashumitra_api/lib/domain-guard.ts";

describe("domain-guard", () => {
  it("allows dairy queries", () => {
    expect(isDairyRelatedQuery([], "gir gaay ke baare mein batao")).toBe(true);
    expect(hasDairySignal("kitna doodh deti hai murrah bhains")).toBe(true);
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
});
