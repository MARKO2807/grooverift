import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Staff roles (domain model §1, visibility matrix §2 "Editorial and staff-only"):
// member (default), editor (editorial content), moderator (reports and cases), admin (everything, audited).
// Permissions derive from roles; privileged roles require a second factor (threat model §3).
export const statements = {
  ...defaultStatements,
  editorial: ["read", "write", "schedule"],
  moderation: ["read", "act"],
  audit: ["read"],
  flags: ["read", "write"],
} as const;

export const ac = createAccessControl(statements);

export const roles = {
  member: ac.newRole({}),
  editor: ac.newRole({ editorial: ["read", "write", "schedule"] }),
  moderator: ac.newRole({ moderation: ["read", "act"] }),
  admin: ac.newRole({
    ...adminAc.statements,
    editorial: ["read", "write", "schedule"],
    moderation: ["read", "act"],
    audit: ["read"],
    flags: ["read", "write"],
  }),
};

// Role names shown through t(`roles.${role}`): i18n-keys: roles.member roles.editor roles.moderator roles.admin
export type Role = keyof typeof roles;
export const ROLES = Object.keys(roles) as Role[];
export const STAFF_ROLES: Role[] = ["editor", "moderator", "admin"];
export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as string[]).includes(value);
