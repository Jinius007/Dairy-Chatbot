import { describe, expect, it } from "vitest";
import { isVetContactRequest } from "../vet-consult";

describe("isVetContactRequest", () => {
  it("matches English veterinary contact requests", () => {
    expect(isVetContactRequest("please send contact of veterinary doctor")).toBe(true);
    expect(isVetContactRequest("give me vet phone number")).toBe(true);
  });

  it("matches Hindi Devanagari vet contact requests", () => {
    expect(isVetContactRequest("पशु चिकित्सक का संपर्क भेजो")).toBe(true);
    expect(isVetContactRequest("डॉक्टर का नंबर दो")).toBe(true);
    expect(isVetContactRequest("नजदीकी पशु डॉक्टर का फोन चाहिए")).toBe(true);
  });

  it("matches romanized Hindi", () => {
    expect(isVetContactRequest("pashu chikitsak ka sampark bhejo")).toBe(true);
    expect(isVetContactRequest("doctor ka number do")).toBe(true);
  });

  it("matches vet/paravet loanwords with other-language contact words", () => {
    expect(isVetContactRequest("vet number vennum")).toBe(true);
    expect(isVetContactRequest("paravet contact lagbe")).toBe(true);
    expect(isVetContactRequest("vet தொடர்பு அனுப்ப")).toBe(true);
    expect(isVetContactRequest("paravet যোগাযোগ দাও")).toBe(true);
    expect(isVetContactRequest("vet phone kavali")).toBe(true);
    expect(isVetContactRequest("need paravet")).toBe(true);
    expect(isVetContactRequest("vet?")).toBe(true);
  });

  it("does not match past vet advice without contact intent", () => {
    expect(isVetContactRequest("vet said give antibiotic for 5 days")).toBe(false);
    expect(isVetContactRequest("paravet ne bola rest karo")).toBe(false);
  });

  it("does not match generic sickness without vet contact ask", () => {
    expect(isVetContactRequest("meri gaay bimar hai")).toBe(false);
  });
});
