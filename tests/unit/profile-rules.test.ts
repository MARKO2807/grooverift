import { describe, expect, it } from "vitest";
import { foldQuery } from "@/lib/data/people";
import {
  cleanBio,
  nextUsernameChange,
  validDisplayName,
  USERNAME_CHANGE_DAYS,
} from "@/lib/profile/constants";

describe("profile rules (step 5.5)", () => {
  it("display names: up to three words, 40 characters, no control characters (D-085 (3))", () => {
    expect(validDisplayName("Ana Sluša")).toBe(true);
    expect(validDisplayName("  Tri  Riječi Tu ")).toBe(true);
    expect(validDisplayName("Četiri riječi su previše")).toBe(false);
    expect(validDisplayName("")).toBe(false);
    expect(validDisplayName("a".repeat(41))).toBe(false);
    expect(validDisplayName("Ana\u0007")).toBe(false);
  });

  it("bio: trimmed, line breaks kept, other control characters refused, 200 max", () => {
    expect(cleanBio(" prvi\r\ndrugi ")).toBe("prvi\ndrugi");
    expect(cleanBio("")).toBe("");
    expect(cleanBio("x".repeat(200))).toHaveLength(200);
    expect(cleanBio("x".repeat(201))).toBeNull();
    expect(cleanBio("a\u0000b")).toBeNull();
  });

  it("username change window (D-069): once every 30 days", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    expect(nextUsernameChange(null, now)).toBeNull();
    const recent = new Date(now.getTime() - 5 * 86_400_000);
    expect(nextUsernameChange(recent, now)?.toISOString()).toBe(
      new Date(recent.getTime() + USERNAME_CHANGE_DAYS * 86_400_000).toISOString(),
    );
    const old = new Date(now.getTime() - 31 * 86_400_000);
    expect(nextUsernameChange(old, now)).toBeNull();
  });

  it("search queries fold diacritics and case, drop a leading @ and unsafe characters", () => {
    expect(foldQuery("  @Željko Đurić ")).toBe("zeljko duric");
    expect(foldQuery("ČĆŠŽĐ čćšžđ")).toBe("ccszd ccszd");
    expect(foldQuery("ana%_'); drop--")).toBe("ana _ drop");
    expect(foldQuery("a".repeat(80))).toHaveLength(50);
  });
});
