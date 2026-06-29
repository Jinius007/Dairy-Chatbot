import { describe, expect, it } from "vitest";
import { filterToAllowedUrls } from "@/lib/allowed-urls";

describe("filterToAllowedUrls", () => {
  it("keeps allowed KB domains", () => {
    const text = "Dekhein https://dahd.gov.in/en/schemes aur https://www.nddb.coop/resources/inaph";
    expect(filterToAllowedUrls(text)).toContain("dahd.gov.in");
    expect(filterToAllowedUrls(text)).toContain("nddb.coop");
  });

  it("strips random web links", () => {
    const text = "Visit https://wikipedia.org/wiki/Cow for more";
    expect(filterToAllowedUrls(text)).not.toContain("wikipedia");
    expect(filterToAllowedUrls(text)).toBe("Visit for more");
  });
});
