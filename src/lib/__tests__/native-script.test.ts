import { describe, expect, it } from "vitest";
import { needsNativeScriptConversion } from "../languages";

describe("needsNativeScriptConversion", () => {
  it("flags romanized Hindi replies", () => {
    expect(needsNativeScriptConversion("aapki gaay bimar hai, daktar ko dikhaye", "hi")).toBe(true);
  });

  it("skips native Devanagari replies", () => {
    expect(needsNativeScriptConversion("आपकी गाय बीमार है, पशु चिकित्सक को दिखाएं", "hi")).toBe(false);
  });

  it("skips English", () => {
    expect(needsNativeScriptConversion("Your cow may be sick, call a vet", "en")).toBe(false);
  });

  it("allows codemix with enough native script", () => {
    expect(needsNativeScriptConversion("आपकी gaay बीमार है vet को call करें", "hi")).toBe(false);
  });
});
