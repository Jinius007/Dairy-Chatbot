import { describe, expect, it } from "vitest";
import {
  buildCattlePurchasePrompt,
  isCattlePurchaseQuery,
} from "../../../catalyst/functions/pashumitra_api/lib/knowledge/cattle-purchase-policy.ts";
import { isMilkMarketingQuery } from "../../../catalyst/functions/pashumitra_api/lib/cooperative-location.ts";

describe("cattle-purchase-policy", () => {
  it("detects buy-cow queries", () => {
    expect(isCattlePurchaseQuery("where can I buy cows")).toBe(true);
    expect(isCattlePurchaseQuery("gaay kahan se kharidu")).toBe(true);
    expect(isCattlePurchaseQuery("gorur kothay pabo")).toBe(true);
  });

  it("does not treat milk marketing as cattle purchase", () => {
    expect(isCattlePurchaseQuery("doodh kahan bechu")).toBe(false);
    expect(isCattlePurchaseQuery("where to sell milk")).toBe(false);
  });

  it("excludes cattle purchase from milk marketing routing", () => {
    expect(isMilkMarketingQuery("where can I buy cows")).toBe(false);
    expect(isMilkMarketingQuery("where to sell milk")).toBe(true);
  });

  it("builds anti-hallucination prompt for buy-cow queries", () => {
    const prompt = buildCattlePurchasePrompt("where can I buy cows");
    expect(prompt).toContain("Amul");
    expect(prompt).toContain("NOT");
    expect(prompt).toContain("1962");
  });
});
