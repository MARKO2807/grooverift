import { describe, expect, it } from "vitest";
import { validateNotice } from "@/lib/legal/notice";

const valid = {
  category: "hate",
  url: "https://grooverift.com/@netko",
  explanation: "Poziva na nasilje prema skupini.",
  name: "Ime Prezime",
  email: "Ime@Primjer.hr",
  goodFaith: "on",
};

describe("DSA Art. 16 notice validation (PUB-11)", () => {
  it("accepts a complete notice and normalises the email", () => {
    const r = validateNotice(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.email).toBe("ime@primjer.hr");
  });

  it("names every missing field", () => {
    const r = validateNotice({});
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toEqual({
        category: "categoryRequired",
        url: "urlRequired",
        explanation: "explanationRequired",
        name: "nameRequired",
        email: "emailRequired",
        goodFaith: "goodFaithRequired",
      });
  });

  it("rejects a category that is not on the list", () => {
    const r = validateNotice({ ...valid, category: "spam" });
    expect(r.ok).toBe(false);
  });

  it("rejects links that are not web addresses", () => {
    for (const url of ["grooverift.com/@x", "javascript:alert(1)", "ftp://x.y/z"]) {
      const r = validateNotice({ ...valid, url });
      expect(r.ok, url).toBe(false);
      if (!r.ok) expect(r.errors.url).toBe("urlInvalid");
    }
  });

  it("makes name and email optional only for child sexual abuse reports (Art. 16(2)(c))", () => {
    const csam = validateNotice({ ...valid, category: "csam", name: "", email: "" });
    expect(csam.ok).toBe(true);
    if (csam.ok) expect(csam.value.name).toBeNull();
    const other = validateNotice({ ...valid, name: "", email: "" });
    expect(other.ok).toBe(false);
  });

  it("checks an email that is given even when it is optional", () => {
    const r = validateNotice({ ...valid, category: "csam", email: "nije-adresa" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.email).toBe("emailInvalid");
  });

  it("limits the explanation to 5,000 characters", () => {
    const r = validateNotice({ ...valid, explanation: "x".repeat(5001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.explanation).toBe("explanationLong");
  });

  it("requires the good-faith statement", () => {
    const r = validateNotice({ ...valid, goodFaith: undefined });
    expect(r.ok).toBe(false);
  });
});
