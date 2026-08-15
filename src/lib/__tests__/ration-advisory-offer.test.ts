import { describe, expect, it } from "vitest";
import {
  isAffirmativeRationOfferReply,
  isFeedRationQuery,
  isNegativeRationOfferReply,
  stripRationAdvisoryOfferMarker,
} from "../ration-advisory-offer";

describe("ration-advisory-offer", () => {
  it("detects feed questions", () => {
    expect(isFeedRationQuery("meri gaay ko kya khilau")).toBe(true);
    expect(isFeedRationQuery("balanced ration for buffalo")).toBe(true);
    expect(isFeedRationQuery("what vaccine for mastitis")).toBe(false);
  });

  it("detects yes/no to ration offer", () => {
    expect(isAffirmativeRationOfferReply("haan")).toBe(true);
    expect(isAffirmativeRationOfferReply("ration advisory")).toBe(true);
    expect(isNegativeRationOfferReply("nahi")).toBe(true);
  });

  it("strips marker", () => {
    expect(stripRationAdvisoryOfferMarker("Advice here.\n[[RATION_ADVISORY_OFFER]]")).toBe("Advice here.");
  });
});
