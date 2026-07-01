import { describe, expect, it } from "vitest";
import { isManureWasteQuery } from "../../../catalyst/functions/pashumitra_api/lib/knowledge/manure-waste-policy.ts";

describe("isManureWasteQuery", () => {
  it("matches dung and waste management queries", () => {
    expect(isManureWasteQuery("how to manage cow dung on my farm")).toBe(true);
    expect(isManureWasteQuery("waste management in dairy")).toBe(true);
    expect(isManureWasteQuery("gobar ka kya karein")).toBe(true);
    expect(isManureWasteQuery("dung disposal problem")).toBe(true);
  });

  it("matches biogas and manure explicitly", () => {
    expect(isManureWasteQuery("biogas plant ke baare mein batao")).toBe(true);
    expect(isManureWasteQuery("manure management tips")).toBe(true);
  });

  it("does not match unrelated dairy topics", () => {
    expect(isManureWasteQuery("meri gaay kam doodh deti hai")).toBe(false);
    expect(isManureWasteQuery("mastitis treatment")).toBe(false);
  });
});
