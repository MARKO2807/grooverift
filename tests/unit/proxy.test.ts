import { describe, expect, it } from "vitest";
import { isPrivatePath, profileRewrite } from "@/lib/routing/paths";

describe("proxy routing helpers", () => {
  it("rewrites /@username to the profile route in the right locale", () => {
    expect(profileRewrite("/@ana")).toBe("/hr/u/ana");
    expect(profileRewrite("/en/@ana")).toBe("/en/u/ana");
    expect(profileRewrite("/@ana/dna")).toBe("/hr/u/ana/dna");
    expect(profileRewrite("/ana")).toBeNull();
    expect(profileRewrite("/legal/@x")).toBeNull();
  });

  it("marks /me, /settings and /admin (and nothing else) as private", () => {
    for (const p of [
      "/me",
      "/me/dna",
      "/settings",
      "/en/settings/security",
      "/admin/flags",
      "/hr/me",
    ])
      expect(isPrivatePath(p), p).toBe(true);
    for (const p of ["/", "/home", "/meet", "/settingsx", "/legal/terms", "/en"])
      expect(isPrivatePath(p), p).toBe(false);
  });
});
