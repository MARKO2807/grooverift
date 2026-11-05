import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// ---- Audit log (domain model §11, threat model: repudiation) ----
// Append-only: the migration adds a trigger that rejects UPDATE and DELETE.
// Metadata is redacted before insert (src/lib/audit): no message bodies, no raw IPs, no tokens.
export const auditActorType = pgEnum("audit_actor_type", ["member", "staff", "system"]);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actorType: auditActorType("actor_type").notNull(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [
    index("audit_log_at_idx").on(t.at),
    index("audit_log_actor_idx").on(t.actorId, t.at),
    index("audit_log_target_idx").on(t.targetType, t.targetId, t.at),
    index("audit_log_action_idx").on(t.action, t.at),
  ],
);

// ---- Feature flags (domain model §12; "paused feature" is SYS-04) ----
export const featureFlagState = pgEnum("feature_flag_state", ["on", "off", "paused"]);

export const featureFlag = pgTable("feature_flag", {
  key: text("key").primaryKey(),
  state: featureFlagState("state").notNull().default("off"),
  // Audience when the flag is on: empty means everyone; otherwise roles and user ids.
  audience: jsonb("audience")
    .$type<{ roles?: string[]; userIds?: string[] }>()
    .notNull()
    .default({}),
  note: text("note"),
  updatedBy: uuid("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- Sign-in throttle (D-077) ----
// scope "pair": one row per (email, IP) pair → 5 failures in 15 min lock for 15 min, 1 h, 24 h.
// scope "account": one row per email → 100 consecutive failures require a password reset.
// Keys are SHA-256 hashes; the table never holds an email or an IP in clear.
export const signInThrottleScope = pgEnum("sign_in_throttle_scope", ["pair", "account"]);

export const signInThrottle = pgTable(
  "sign_in_throttle",
  {
    key: text("key").primaryKey(),
    scope: signInThrottleScope("scope").notNull(),
    failures: integer("failures").notNull().default(0),
    windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
    stage: integer("stage").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sign_in_throttle_locked_idx").on(t.lockedUntil)],
);

// ---- Member-facing preferences that the foundation already needs ----
export const memberSettings = pgTable("member_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  // Reduced motion as a member setting, on top of the system setting (D-049).
  reduceMotion: boolean("reduce_motion").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
