// Step 5.10: the pure account and data rules (src/lib/account/rules.ts) and the signed download link.
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  cleanFeedbackContext,
  deletionDate,
  deviceLabel,
  exportExpiry,
  GRACE_DAYS,
  isDeleteChoice,
  isFeedbackKind,
  isFreshSignIn,
} from "@/lib/account/rules";
import { exportDownloadPath, verifyExportSignature } from "@/lib/account/download";

describe("dates (D-063 (9), plan §1.2)", () => {
  it("deletes 30 days after the request and lets a copy live 24 hours", () => {
    const at = new Date("2026-11-07T10:00:00Z");
    expect(GRACE_DAYS).toBe(30);
    expect(deletionDate(at).toISOString()).toBe("2026-12-07T10:00:00.000Z");
    expect(exportExpiry(at).toISOString()).toBe("2026-11-08T10:00:00.000Z");
  });

  it("counts a sign-in as a confirmation for 15 minutes only", () => {
    const now = new Date("2026-11-07T10:00:00Z");
    expect(isFreshSignIn(new Date("2026-11-07T09:50:00Z"), now)).toBe(true);
    expect(isFreshSignIn(new Date("2026-11-07T09:44:59Z"), now)).toBe(false);
    expect(isFreshSignIn(new Date("2026-11-07T10:05:00Z"), now)).toBe(false); // from the future
  });
});

describe("inputs", () => {
  it("accepts only the known choices and kinds", () => {
    expect(isDeleteChoice("delete")).toBe(true);
    expect(isDeleteChoice("deactivate")).toBe(true);
    expect(isDeleteChoice("purge")).toBe(false);
    expect(isFeedbackKind("bug")).toBe(true);
    expect(isFeedbackKind("abuse")).toBe(false);
  });

  it("keeps only the four feedback details, short and without control characters", () => {
    expect(
      cleanFeedbackContext({
        screen: "Početna\n\t",
        device: "x".repeat(500),
        cookie: "secret",
        time: 5,
      }),
    ).toEqual({ screen: "Početna", device: "x".repeat(200) });
    expect(cleanFeedbackContext(null)).toEqual({});
    expect(cleanFeedbackContext("screen")).toEqual({});
  });

  it("names a device without the raw user agent", () => {
    expect(
      deviceLabel(
        "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36",
      ),
    ).toBe("Chrome · Android");
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/605.1.15")).toBe(
      "Safari · iOS",
    );
    expect(deviceLabel("")).toBeNull();
  });
});

describe("the signed download link", () => {
  const id = "2b0f2b5e-1a7c-4c55-9d3e-6a3b0f4f7a11";
  const owner = "7d1b3f0a-2a8e-4c1b-8f6e-0b9c1d2e3f40";
  const other = "0e9d8c7b-6a5f-4e3d-8c2b-1a0f9e8d7c6b";
  const expires = new Date("2026-11-08T10:00:00Z");
  const parts = (path: string) => {
    const u = new URL(path, "https://x.invalid");
    return [u.searchParams.get("e"), u.searchParams.get("s")] as const;
  };

  it("works for its owner until it expires", () => {
    const [e, s] = parts(exportDownloadPath(id, owner, expires));
    expect(verifyExportSignature(id, owner, e, s, new Date("2026-11-08T09:59:00Z"))).toBe(true);
    expect(verifyExportSignature(id, owner, e, s, new Date("2026-11-08T10:00:01Z"))).toBe(false);
  });

  it("refuses another member, another copy, a changed expiry or a forged signature", () => {
    const [e, s] = parts(exportDownloadPath(id, owner, expires));
    const now = new Date("2026-11-07T12:00:00Z");
    expect(verifyExportSignature(id, other, e, s, now)).toBe(false);
    expect(verifyExportSignature(other, owner, e, s, now)).toBe(false);
    expect(verifyExportSignature(id, owner, String(Number(e) + 3600), s, now)).toBe(false);
    expect(verifyExportSignature(id, owner, e, `${s!.slice(0, -2)}AA`, now)).toBe(false);
    expect(verifyExportSignature(id, owner, null, s, now)).toBe(false);
    expect(verifyExportSignature(id, owner, "1e12", s, now)).toBe(false);
  });
});
