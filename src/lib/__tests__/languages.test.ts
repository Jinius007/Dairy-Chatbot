import { describe, expect, it } from "vitest";
import { detectLanguageCode, prepareTextForSpeech, splitForTts, ttsPauseMsAfterChunk, ttsPauseTierFromChunk } from "../languages";

describe("detectLanguageCode — romanized Indic", () => {
  it("detects Banglish (Bengali in Roman script)", () => {
    expect(detectLanguageCode("ekti gaay ke kotota khabar dewa uchit")).toBe("bn");
    expect(detectLanguageCode("gorur kemon khabar lagbe")).toBe("bn");
  });

  it("detects Hinglish (Hindi in Roman script)", () => {
    expect(detectLanguageCode("meri gaay bimar hai kya karna chahiye")).toBe("hi");
    expect(detectLanguageCode("kitna doodh deti hai")).toBe("hi");
  });

  it("detects Tanglish (Tamil in Roman script)", () => {
    expect(detectLanguageCode("enna pasu ku enna khabar venum")).toBe("ta");
    expect(detectLanguageCode("epdi paal yield improve pannunga")).toBe("ta");
  });

  it("detects Telugu in Roman script", () => {
    expect(detectLanguageCode("emi kavali pasuvu ki elaa cheppandi")).toBe("te");
  });

  it("detects native script languages", () => {
    expect(detectLanguageCode("আমার গoru")).toBe("bn");
    expect(detectLanguageCode("मेरी गाय")).toBe("hi");
    expect(detectLanguageCode("என் பசு")).toBe("ta");
  });

  it("detects English dairy questions", () => {
    expect(detectLanguageCode("How much feed should I give my cow?")).toBe("en");
  });
});

describe("prepareTextForSpeech", () => {
  it("expands Hindi number ranges with se", () => {
    expect(prepareTextForSpeech("2-3 kg चारा दें")).toContain("2 se 3");
    expect(prepareTextForSpeech("2-3 kg चारा दें")).toContain("किलोग्राम");
    expect(prepareTextForSpeech("2-3 kg चारा दें")).not.toContain("2 to 3");
  });

  it("expands English number ranges with to", () => {
    expect(prepareTextForSpeech("Feed 2-3 kg daily in English")).toContain("2 to 3");
  });

  it("preserves comma pauses within a line", () => {
    const out = prepareTextForSpeech("पहले पani दें, फिर चारा दें");
    expect(out).toContain(",");
  });

  it("turns line breaks into spoken pauses", () => {
    const out = prepareTextForSpeech("पहली लाइन\nदूसरी लाइन");
    expect(out).toMatch(/,|।/);
    expect(out).not.toMatch(/\n/);
  });

  it("turns blank lines into longer pauses", () => {
    const out = prepareTextForSpeech("पहला बिंदु\n\nदूसरा बिंदु");
    expect(out).toContain("।");
  });

  it("turns bullet lines into sentence breaks for a natural list pause", () => {
    const out = prepareTextForSpeech("ये करें:\n- पानी दें\n- चारा दें");
    expect(out).toMatch(/[।.]/);
    expect(out).not.toMatch(/^\s*-/m);
    expect(out).toContain("पानी");
    expect(out).toContain("चारा");
  });
});

describe("ttsPauseMsAfterChunk", () => {
  it("uses shorter pauses for commas and longer for list/sentence ends", () => {
    expect(ttsPauseMsAfterChunk("पहले ये,")).toBeLessThan(ttsPauseMsAfterChunk("दूसरा बिंदु।"));
  });

  it("treats colons and semicolons as medium-tier pauses", () => {
    expect(ttsPauseTierFromChunk("ये करें:")).toBe("medium");
    expect(ttsPauseMsAfterChunk("पहले ये,")).toBeLessThan(ttsPauseMsAfterChunk("ये करें:"));
  });

  it("treats ellipsis as a breath pause", () => {
    expect(ttsPauseTierFromChunk("और फिर…")).toBe("breath");
    expect(ttsPauseMsAfterChunk("और फिर…")).toBeGreaterThan(ttsPauseMsAfterChunk("ठीक है,"));
  });
});

describe("prepareTextForSpeech — Wispr-style lists", () => {
  it("handles numbered list lines", () => {
    const out = prepareTextForSpeech("Steps:\n1. पानी\n2. चारा");
    expect(out).toMatch(/[।.]/);
    expect(out).toContain("पानी");
    expect(out).toContain("चारा");
  });
});

describe("splitForTts", () => {
  it("splits on commas into separate chunks", () => {
    const parts = splitForTts("एक वाक्य, दूसरा वाक्य, तीसरा वाक्य", 200);
    expect(parts.length).toBe(3);
  });

  it("splits list items marked with danda into separate chunks", () => {
    const prepared = prepareTextForSpeech("ये करें:\n- पानी दें\n- चारा दें");
    const parts = splitForTts(prepared, 200);
    expect(parts.length).toBeGreaterThan(1);
  });
});
