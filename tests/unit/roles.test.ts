// D-119 (1), OQ-35: admin impersonation is off for the alpha; the admin keeps every other user permission.
import { describe, expect, it } from "vitest";
import { roles } from "@/lib/auth/roles";

describe("admin role", () => {
  it("cannot impersonate members or admins", () => {
    expect(roles.admin.authorize({ user: ["impersonate"] }).success).toBe(false);
    expect(roles.admin.authorize({ user: ["impersonate-admins"] }).success).toBe(false);
  });

  it("keeps the other user permissions and the GrooveRift ones", () => {
    expect(roles.admin.authorize({ user: ["list", "set-role", "ban"] }).success).toBe(true);
    expect(roles.admin.authorize({ moderation: ["act"], flags: ["write"] }).success).toBe(true);
    expect(roles.member.authorize({ user: ["list"] }).success).toBe(false);
  });
});
