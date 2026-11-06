// The alpha product model (phase-5-plan §4, docs/architecture/domain-model.md, step 5.2).
// Rules: random UUID ids (never sequential, U-01), UTC timestamps with time zone, no provider id as a key,
// soft delete (deleted_at) for content, the invariants in domain-model.md enforced in the database where a
// constraint can express them. ONLY src/lib/data/ may import this module (eslint no-restricted-imports):
// every read and write goes through the data-access layer, which asks src/lib/authz/policy.ts.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const id = () => uuid("id").primaryKey().defaultRandom();
const at = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => at("created_at").notNull().defaultNow();
const userRef = (name: string) => uuid(name).references(() => user.id, { onDelete: "cascade" });
const userRefNull = (name: string) =>
  uuid(name).references(() => user.id, { onDelete: "set null" });

// ============================================================ Identity
export const invitationStatus = pgEnum("invitation_status", [
  "sent",
  "accepted",
  "expired",
  "revoked",
]);

/**
 * PUB-05: an invite is bound to one normalised email (R-08, J1 E4); only the token's hash is stored. Step 5.4
 * (review L11): the email is stored trimmed and lower-case (check) and at most one invite per email is open
 * (partial unique index on status = 'sent').
 */
export const invitation = pgTable(
  "invitation",
  {
    id: id(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: userRefNull("invited_by"),
    status: invitationStatus("status").notNull().default("sent"),
    /** The language of the invitation email; the first suggestion for the interface language (J1 E13). */
    locale: text("locale").notNull().default("hr"),
    expiresAt: at("expires_at").notNull(),
    acceptedUserId: userRefNull("accepted_user_id"),
    acceptedAt: at("accepted_at"),
    revokedAt: at("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("invitation_email_idx").on(t.email),
    index("invitation_status_idx").on(t.status),
    uniqueIndex("invitation_open_email_uq")
      .on(t.email)
      .where(sql`${t.status} = 'sent'`),
    check("invitation_email_normalised", sql`${t.email} = lower(btrim(${t.email}))`),
    check("invitation_locale", sql`${t.locale} in ('hr', 'en')`),
  ],
);

/** D-069, U-04: an old username stays reserved for its former owner for 30 days and shows "not available". */
export const usernameReservation = pgTable(
  "username_reservation",
  {
    username: text("username").primaryKey(), // stored lower-case
    userId: userRef("user_id").notNull(),
    reservedUntil: at("reserved_until").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("username_reservation_user_idx").on(t.userId)],
);

// ============================================================ Profile and preferences
export const profileVisibility = pgEnum("profile_visibility", ["public", "private"]);
export const sectionVisibility = pgEnum("section_visibility", [
  "everyone",
  "followers",
  "mutuals",
  "me",
]);

export const profile = pgTable(
  "profile",
  {
    userId: userRef("user_id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    /** D-025, D-030: an active choice in onboarding; null until the member has chosen. */
    visibility: profileVisibility("visibility"),
    /** Appears in people search (D-093 (3)). */
    discoverable: boolean("discoverable").notNull().default(true),
    onboardingStep: text("onboarding_step"),
    onboardedAt: at("onboarded_at"),
    interfaceLocale: text("interface_locale").notNull().default("hr"),
    readingLanguages: text("reading_languages")
      .array()
      .notNull()
      .default(sql`'{hr}'::text[]`),
    timeZone: text("time_zone").notNull().default("Europe/Zagreb"),
    usernameChangedAt: at("username_changed_at"),
    createdAt: createdAt(),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("profile_username_lower_uq").on(sql`lower(${t.username})`),
    check("profile_username_shape", sql`${t.username} ~ '^[a-z0-9_]{3,30}$'`),
    check("profile_bio_len", sql`char_length(${t.bio}) <= 200`),
    check("profile_display_name_len", sql`char_length(${t.displayName}) between 1 and 50`),
  ],
);

/** Per-section visibility (D-024, matrix §2 ⚙️). Defaults follow the matrix. */
export const privacySettings = pgTable("privacy_settings", {
  userId: userRef("user_id").primaryKey(),
  musicDna: sectionVisibility("music_dna").notNull().default("everyone"),
  lists: sectionVisibility("lists").notNull().default("everyone"),
  dropHistory: sectionVisibility("drop_history").notNull().default("everyone"),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

export const notificationChannel = pgEnum("notification_channel", ["in_app", "push", "email"]);

export const notificationPreference = pgTable(
  "notification_preference",
  {
    userId: userRef("user_id").notNull(),
    type: text("type").notNull(),
    channel: notificationChannel("channel").notNull(),
    enabled: boolean("enabled").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.type, t.channel] })],
);

/** The Daily Drop reminder (D-071, OQ-11): local time in an IANA zone, never a fixed offset. */
export const dailyDropReminder = pgTable("daily_drop_reminder", {
  userId: userRef("user_id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  localTime: time("local_time").notNull().default("09:00"),
  timeZone: text("time_zone").notNull().default("Europe/Zagreb"),
  pausedUntil: at("paused_until"),
  lastNotifiedQuestionId: uuid("last_notified_question_id"),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

/** Web push per device (step 5.12). Keys are encrypted by the application before they are stored. */
export const pushSubscription = pgTable(
  "push_subscription",
  {
    id: id(),
    userId: userRef("user_id").notNull(),
    endpoint: text("endpoint").notNull().unique(),
    keys: text("keys").notNull(),
    deviceLabel: text("device_label"),
    createdAt: createdAt(),
    lastSuccessAt: at("last_success_at"),
  },
  (t) => [index("push_subscription_user_idx").on(t.userId)],
);

// ============================================================ Social graph
export const followStatus = pgEnum("follow_status", ["pending", "accepted"]);

/** Mutual is derived: both directions accepted (D-013). Pending exists only for private profiles. */
export const follow = pgTable(
  "follow",
  {
    followerId: userRef("follower_id").notNull(),
    followeeId: userRef("followee_id").notNull(),
    status: followStatus("status").notNull(),
    createdAt: createdAt(),
    acceptedAt: at("accepted_at"),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followeeId] }),
    index("follow_followee_idx").on(t.followeeId, t.status),
    check("follow_not_self", sql`${t.followerId} <> ${t.followeeId}`),
  ],
);

/** Invariant 2: a block hides both ways and removes follows both ways (src/lib/data/graph.ts, one transaction). */
export const block = pgTable(
  "block",
  {
    blockerId: userRef("blocker_id").notNull(),
    blockedId: userRef("blocked_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerId, t.blockedId] }),
    index("block_blocked_idx").on(t.blockedId),
    check("block_not_self", sql`${t.blockerId} <> ${t.blockedId}`),
  ],
);

/**
 * A declined follow request (step 5.5, review L7, J4 E6): the requester may ask again after FOLLOW_DECLINE_DAYS.
 * Declining sends no notification; the row is the only trace and the owner never sees it.
 */
export const followDecline = pgTable(
  "follow_decline",
  {
    ownerId: userRef("owner_id").notNull(),
    requesterId: userRef("requester_id").notNull(),
    declinedAt: at("declined_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.requesterId] }),
    check("follow_decline_not_self", sql`${t.ownerId} <> ${t.requesterId}`),
  ],
);

export const mute = pgTable(
  "mute",
  {
    muterId: userRef("muter_id").notNull(),
    mutedId: userRef("muted_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.muterId, t.mutedId] }),
    check("mute_not_self", sql`${t.muterId} <> ${t.mutedId}`),
  ],
);

// ============================================================ Catalogue (MusicBrainz CC0, D-093 (2))
export const catalogEntity = pgEnum("catalog_entity", ["artist", "genre"]);
export const artistAvailability = pgEnum("artist_availability", ["available", "unavailable"]);

export const genre = pgTable(
  "genre",
  {
    id: id(),
    mbid: uuid("mbid").unique(),
    slug: text("slug").notNull().unique(),
    nameHr: text("name_hr").notNull(),
    nameEn: text("name_en").notNull(),
    /** Spirala family (src/lib/music/genre-traits.ts); null = no family, neutral colour. */
    family: integer("family"),
    parentId: uuid("parent_id"),
    rank: integer("rank").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("genre_rank_idx").on(t.rank)],
);

export const artist = pgTable(
  "artist",
  {
    id: id(),
    mbid: uuid("mbid").unique(),
    name: text("name").notNull(),
    sortName: text("sort_name"),
    disambiguation: text("disambiguation"),
    country: text("country"),
    beginYear: integer("begin_year"),
    endYear: integer("end_year"),
    availability: artistAvailability("availability").notNull().default("available"),
    lastSyncedAt: at("last_synced_at"),
    createdAt: createdAt(),
  },
  (t) => [index("artist_name_idx").on(sql`lower(${t.name})`)],
);

export const externalId = pgTable(
  "external_id",
  {
    id: id(),
    entityType: catalogEntity("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    lastSyncedAt: at("last_synced_at"),
  },
  (t) => [
    uniqueIndex("external_id_provider_uq").on(t.provider, t.entityType, t.externalId),
    index("external_id_entity_idx").on(t.entityType, t.entityId),
  ],
);

/** Invariant 5: every catalogue reference resolves through redirects (merges survive, C-03). */
export const canonicalRedirect = pgTable(
  "canonical_redirect",
  {
    fromId: uuid("from_id").primaryKey(),
    toId: uuid("to_id").notNull(),
    entityType: catalogEntity("entity_type").notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [check("canonical_redirect_not_self", sql`${t.fromId} <> ${t.toId}`)],
);

export const externalLink = pgTable(
  "external_link",
  {
    id: id(),
    entityType: catalogEntity("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    service: text("service").notNull(),
    url: text("url").notNull(),
    source: text("source").notNull().default("provider"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("external_link_uq").on(t.entityType, t.entityId, t.url)],
);

// ============================================================ Music DNA
export const dnaKind = pgEnum("dna_kind", ["genre", "artist"]);
export const dnaSource = pgEnum("dna_source", ["explicit", "accepted_suggestion"]);

/** Invariant 3: explicit entries change only through the member's own actions. */
export const musicDnaEntry = pgTable(
  "music_dna_entry",
  {
    id: id(),
    userId: userRef("user_id").notNull(),
    kind: dnaKind("kind").notNull(),
    genreId: uuid("genre_id").references(() => genre.id),
    artistId: uuid("artist_id").references(() => artist.id),
    position: integer("position").notNull(),
    source: dnaSource("source").notNull().default("explicit"),
    createdAt: createdAt(),
  },
  (t) => [
    index("music_dna_user_idx").on(t.userId, t.kind, t.position),
    uniqueIndex("music_dna_genre_uq")
      .on(t.userId, t.genreId)
      .where(sql`${t.genreId} is not null`),
    uniqueIndex("music_dna_artist_uq")
      .on(t.userId, t.artistId)
      .where(sql`${t.artistId} is not null`),
    check(
      "music_dna_one_subject",
      sql`(${t.kind} = 'genre' and ${t.genreId} is not null and ${t.artistId} is null) or (${t.kind} = 'artist' and ${t.artistId} is not null and ${t.genreId} is null)`,
    ),
  ],
);

// ============================================================ Daily Drop
export const dropStatus = pgEnum("drop_status", [
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "failed",
  // Step 5.6: an admin took a published question down for a severe error (J6 "Corrections"). Every member read
  // asks for status = 'published', so a withdrawn question and its answers disappear without a second check;
  // the date is free again (the unique index covers scheduled and published only).
  "withdrawn",
]);
export const translationReview = pgEnum("translation_review", ["draft", "approved"]);
export const runStatus = pgEnum("run_status", ["running", "succeeded", "failed"]);

/**
 * Invariant 4: exactly one live question per UTC date. A scheduled or published question owns its date; a
 * reserve has no date until it is used; a failed or draft question gives the date up.
 */
export const dailyDropQuestion = pgTable(
  "daily_drop_question",
  {
    id: id(),
    publishDate: date("publish_date"),
    status: dropStatus("status").notNull().default("draft"),
    isReserve: boolean("is_reserve").notNull().default(false),
    publishedAt: at("published_at"),
    createdBy: userRefNull("created_by"),
    approvedBy: userRefNull("approved_by"),
    /** Optimistic locking for the editor (J6 E2). */
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: at("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_drop_one_per_date_uq")
      .on(t.publishDate)
      .where(sql`${t.status} in ('scheduled', 'published')`),
    index("daily_drop_status_idx").on(t.status, t.publishDate),
    check(
      "daily_drop_live_has_date",
      sql`${t.status} not in ('scheduled', 'published') or ${t.publishDate} is not null`,
    ),
  ],
);

/** Both languages approved before scheduling (JO2, invariant 8). */
export const dailyDropTranslation = pgTable(
  "daily_drop_translation",
  {
    questionId: uuid("question_id")
      .notNull()
      .references(() => dailyDropQuestion.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    text: text("text").notNull(),
    review: translationReview("review").notNull().default("draft"),
    reviewedBy: userRefNull("reviewed_by"),
    reviewedAt: at("reviewed_at"),
  },
  (t) => [
    primaryKey({ columns: [t.questionId, t.locale] }),
    check("daily_drop_translation_locale", sql`${t.locale} in ('hr', 'en')`),
    check("daily_drop_translation_len", sql`char_length(${t.text}) between 1 and 280`),
  ],
);

/** pg-boss holds the schedule; this table holds what happened (idempotent by date and attempt). */
export const publicationRun = pgTable(
  "publication_run",
  {
    id: id(),
    publishDate: date("publish_date").notNull(),
    attempt: integer("attempt").notNull(),
    status: runStatus("status").notNull().default("running"),
    questionId: uuid("question_id").references(() => dailyDropQuestion.id),
    usedReserve: boolean("used_reserve").notNull().default(false),
    error: text("error"),
    startedAt: at("started_at").notNull().defaultNow(),
    finishedAt: at("finished_at"),
  },
  (t) => [uniqueIndex("publication_run_attempt_uq").on(t.publishDate, t.attempt)],
);

// ============================================================ Content
export const contentTarget = pgEnum("content_target", ["answer", "comment"]);

/** One top-level answer per member per question among non-deleted answers (D-035). */
export const dailyDropAnswer = pgTable(
  "daily_drop_answer",
  {
    id: id(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => dailyDropQuestion.id),
    /** Null after the author's account is purged; the row then stays only as a thread placeholder. */
    authorId: userRefNull("author_id"),
    body: text("body").notNull(),
    language: text("language"),
    createdAt: createdAt(),
    editedAt: at("edited_at"),
    deletedAt: at("deleted_at"),
    /** Removed by moderation (enforcement action); shown as a placeholder, never served. */
    removedAt: at("removed_at"),
  },
  (t) => [
    uniqueIndex("daily_drop_answer_one_uq")
      .on(t.questionId, t.authorId)
      .where(sql`${t.deletedAt} is null`),
    index("daily_drop_answer_question_idx").on(t.questionId, t.createdAt),
    index("daily_drop_answer_author_idx").on(t.authorId, t.createdAt),
    // 1,500 characters (plan §1.2); the purge empties the body of a deleted answer that keeps a placeholder.
    check(
      "daily_drop_answer_len",
      sql`char_length(${t.body}) <= 1500 and (${t.deletedAt} is not null or char_length(${t.body}) >= 1)`,
    ),
  ],
);

export const comment = pgTable(
  "comment",
  {
    id: id(),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => dailyDropAnswer.id),
    parentId: uuid("parent_id"),
    authorId: userRefNull("author_id"),
    body: text("body").notNull(),
    createdAt: createdAt(),
    editedAt: at("edited_at"),
    deletedAt: at("deleted_at"),
    removedAt: at("removed_at"),
  },
  (t) => [
    index("comment_answer_idx").on(t.answerId, t.createdAt),
    check(
      "comment_len",
      sql`char_length(${t.body}) <= 750 and (${t.deletedAt} is not null or char_length(${t.body}) >= 1)`,
    ),
  ],
);

/** One reaction (D-056): unique per target and member. */
export const reaction = pgTable(
  "reaction",
  {
    targetType: contentTarget("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    userId: userRef("user_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.targetType, t.targetId, t.userId] }),
    index("reaction_user_idx").on(t.userId),
  ],
);

export const catalogReference = pgTable(
  "catalog_reference",
  {
    id: id(),
    ownerType: contentTarget("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("catalog_reference_owner_idx").on(t.ownerType, t.ownerId)],
);

// ============================================================ Notifications
/** Re-checked against the policy at render (matrix §4); never carries content in push bodies. */
export const notification = pgTable(
  "notification",
  {
    id: id(),
    recipientId: userRef("recipient_id").notNull(),
    type: text("type").notNull(),
    actorId: userRefNull("actor_id"),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    groupKey: text("group_key"),
    createdAt: createdAt(),
    readAt: at("read_at"),
  },
  (t) => [index("notification_recipient_idx").on(t.recipientId, t.createdAt)],
);

// ============================================================ Trust and safety
export const reportCategory = pgEnum("report_category", [
  "harassment",
  "hate",
  "threat",
  "sexual",
  "minor",
  "impersonation",
  "spam",
  "copyright",
  "ai_generated",
  "private_info",
  "other",
]);
export const reportStatus = pgEnum("report_status", ["open", "in_review", "resolved", "dismissed"]);
export const caseState = pgEnum("case_state", ["open", "in_progress", "decided", "closed"]);
export const enforcementKind = pgEnum("enforcement_kind", [
  "notice",
  "warning",
  "restriction",
  "suspension",
  "ban",
  "content_removal",
]);
export const appealStatus = pgEnum("appeal_status", ["open", "upheld", "overturned"]);
export const noticeStatus = pgEnum("notice_status", [
  "received",
  "in_review",
  "actioned",
  "rejected",
]);
export const noticeCategory = pgEnum("notice_category", [
  "csam",
  "hate",
  "threat",
  "privacy",
  "copyright",
  "fraud",
  "other",
]);

export const moderationCase = pgTable(
  "moderation_case",
  {
    id: id(),
    subjectUserId: userRefNull("subject_user_id"),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    priority: integer("priority").notNull().default(2),
    state: caseState("state").notNull().default("open"),
    assigneeId: userRefNull("assignee_id"),
    deadline: at("deadline"),
    createdAt: createdAt(),
    updatedAt: at("updated_at").notNull().defaultNow(),
    /** Step 5.9: "action" (an enforcement action was taken) or "none" (no violation found). */
    outcome: text("outcome"),
    decidedBy: userRefNull("decided_by"),
    decidedAt: at("decided_at"),
  },
  (t) => [
    index("moderation_case_state_idx").on(t.state, t.priority, t.createdAt),
    // J5 E4: one open case per reported object; every further report joins it.
    uniqueIndex("moderation_case_open_target_uq")
      .on(t.targetType, t.targetId)
      .where(sql`${t.state} in ('open', 'in_progress')`),
    check(
      "moderation_case_outcome",
      sql`${t.outcome} is null or ${t.outcome} in ('action', 'none')`,
    ),
  ],
);

/** The reporter id never leaves the staff API (matrix: reporterIdentity). */
export const report = pgTable(
  "report",
  {
    id: id(),
    reporterId: userRefNull("reporter_id"),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    targetOwnerId: userRefNull("target_owner_id"),
    /** The reported member's handle when the report was made (SAFE-04 shows it; never a live lookup, review 5.9 M4). */
    targetHandle: text("target_handle"),
    category: reportCategory("category").notNull(),
    details: text("details"),
    status: reportStatus("status").notNull().default("open"),
    caseId: uuid("case_id").references(() => moderationCase.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("report_case_idx").on(t.caseId),
    index("report_reporter_idx").on(t.reporterId, t.createdAt),
    // One open report per reporter and object: a second tap answers "received" without a new row.
    uniqueIndex("report_open_uq")
      .on(t.reporterId, t.targetType, t.targetId)
      .where(sql`${t.status} in ('open', 'in_review')`),
    check("report_details_len", sql`${t.details} is null or char_length(${t.details}) <= 500`),
  ],
);

/** R-07: every action carries a statement of reasons. */
export const enforcementAction = pgTable(
  "enforcement_action",
  {
    id: id(),
    caseId: uuid("case_id").references(() => moderationCase.id),
    /** Kept after the member deletes the account (moderation records under retention, plan §1.2). */
    subjectUserId: userRefNull("subject_user_id"),
    kind: enforcementKind("kind").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    statementOfReasons: text("statement_of_reasons").notNull(),
    ruleRef: text("rule_ref"),
    startsAt: at("starts_at").notNull().defaultNow(),
    endsAt: at("ends_at"),
    decidedBy: userRefNull("decided_by"),
    revokedAt: at("revoked_at"),
    createdAt: createdAt(),
    /** SAFE-06: the member may appeal until this moment (DSA Art. 20(1): at least six months). */
    appealUntil: at("appeal_until"),
    /** SAFE-07: the member saw the full-screen notice of a restriction once ("Nastavi"). */
    acknowledgedAt: at("acknowledged_at"),
    /** The decision also removed the reported answer or comment (e.g. "removed, with a warning", D-075). */
    removesContent: boolean("removes_content").notNull().default(false),
  },
  (t) => [
    index("enforcement_subject_idx").on(t.subjectUserId, t.startsAt),
    check("enforcement_sor_len", sql`char_length(${t.statementOfReasons}) between 1 and 2000`),
  ],
);

export const appeal = pgTable(
  "appeal",
  {
    id: id(),
    actionId: uuid("action_id")
      .notNull()
      .references(() => enforcementAction.id),
    appellantId: userRefNull("appellant_id"),
    text: text("text").notNull(),
    status: appealStatus("status").notNull().default("open"),
    reviewerId: userRefNull("reviewer_id"),
    decidedAt: at("decided_at"),
    createdAt: createdAt(),
    /** ADM-11: the reviewer's reasons, shown to the member with the outcome (DSA Art. 20(5)). */
    outcomeText: text("outcome_text"),
  },
  (t) => [
    // SAFE-06, basic appeal: one appeal per decision.
    uniqueIndex("appeal_action_uq").on(t.actionId),
    index("appeal_status_idx").on(t.status, t.createdAt),
    check("appeal_text_len", sql`char_length(${t.text}) between 1 and 1000`),
  ],
);

/** Invariant 7: every staff view of private content or evidence is recorded. Append-only (migration trigger). */
export const evidenceAccess = pgTable(
  "evidence_access",
  {
    id: id(),
    caseId: uuid("case_id").references(() => moderationCase.id),
    accessorId: uuid("accessor_id").notNull(),
    objectType: text("object_type").notNull(),
    objectId: uuid("object_id"),
    reason: text("reason").notNull(),
    at: at("at").notNull().defaultNow(),
  },
  (t) => [index("evidence_access_case_idx").on(t.caseId, t.at)],
);

/** The moderation copy (90 days, plan §1.2; counsel B.3). Purged by a job after purge_after. */
export const contentSnapshot = pgTable(
  "content_snapshot",
  {
    id: id(),
    caseId: uuid("case_id").references(() => moderationCase.id, { onDelete: "cascade" }),
    objectType: text("object_type").notNull(),
    objectId: uuid("object_id").notNull(),
    authorId: userRefNull("author_id"),
    content: jsonb("content").$type<Record<string, unknown>>().notNull(),
    capturedAt: at("captured_at").notNull().defaultNow(),
    purgeAfter: at("purge_after").notNull(),
  },
  (t) => [index("content_snapshot_purge_idx").on(t.purgeAfter)],
);

/** PUB-11, DSA Art. 16 notices from anyone. Personal data is limited to what Art. 16(2) asks for. */
export const notice = pgTable(
  "notice",
  {
    id: id(),
    category: noticeCategory("category").notNull(),
    url: text("url").notNull(),
    explanation: text("explanation").notNull(),
    notifierName: text("notifier_name"),
    notifierEmail: text("notifier_email"),
    submittedBy: userRefNull("submitted_by"),
    status: noticeStatus("status").notNull().default("received"),
    caseId: uuid("case_id").references(() => moderationCase.id),
    createdAt: createdAt(),
    decidedAt: at("decided_at"),
  },
  (t) => [
    index("notice_status_idx").on(t.status, t.createdAt),
    check("notice_explanation_len", sql`char_length(${t.explanation}) between 1 and 5000`),
  ],
);

// ============================================================ Operations and data rights
export const exportStatus = pgEnum("export_status", [
  "requested",
  "building",
  "ready",
  "expired",
  "failed",
]);

/** Step 5.10: the bytes of an export ZIP, kept in the row until A7 brings R2 (D-109 (4)). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/**
 * SET-12 feedback and bug reports (Master Prompt §13), separate from abuse reports. `context` holds only the
 * technical details the member left ticked (screen, version, browser and device, time); the screenshot waits for
 * 5.11. Deleted with the account (D-109 (6)).
 */
export const feedbackReport = pgTable(
  "feedback_report",
  {
    id: id(),
    userId: userRefNull("user_id"),
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    status: text("status").notNull().default("new"),
    triageNotes: text("triage_notes"),
    createdAt: createdAt(),
    context: jsonb("context").$type<Record<string, string>>().notNull().default({}),
    /** The member ticked "reply by email" (D-078): only then does ADM-15 show the address. */
    replyByEmail: boolean("reply_by_email").notNull().default(false),
    locale: text("locale").notNull().default("hr"),
    handledBy: userRefNull("handled_by"),
    handledAt: at("handled_at"),
  },
  (t) => [
    index("feedback_report_status_idx").on(t.status, t.createdAt),
    check("feedback_report_kind", sql`${t.kind} in ('bug', 'idea', 'other')`),
    check("feedback_report_status", sql`${t.status} in ('new', 'done')`),
    check("feedback_report_text_len", sql`char_length(${t.text}) between 1 and 2000`),
    check(
      "feedback_report_notes_len",
      sql`${t.triageNotes} is null or char_length(${t.triageNotes}) <= 2000`,
    ),
  ],
);

/**
 * The data copy (D-066, GDPR Art. 15 and 20): built right after the request (or by the worker's sweep),
 * downloadable by its owner for 24 hours, then the bytes are dropped. One open request per member.
 */
export const dataExportRequest = pgTable(
  "data_export_request",
  {
    id: id(),
    userId: userRef("user_id").notNull(),
    status: exportStatus("status").notNull().default("requested"),
    fileKey: text("file_key"),
    expiresAt: at("expires_at"),
    createdAt: createdAt(),
    completedAt: at("completed_at"),
    archive: bytea("archive"),
    sizeBytes: integer("size_bytes"),
    attempts: integer("attempts").notNull().default(0),
  },
  (t) => [
    index("data_export_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("data_export_open_uq")
      .on(t.userId)
      .where(sql`${t.status} in ('requested', 'building')`),
    check(
      "data_export_ready_has_archive",
      sql`${t.status} <> 'ready' or (${t.archive} is not null and ${t.expiresAt} is not null)`,
    ),
  ],
);

/** 30-day grace (D-063 (9), counsel B.3). The purge job erases personal data after scheduled_for. */
export const deletionRequest = pgTable(
  "deletion_request",
  {
    id: id(),
    userId: uuid("user_id").notNull(),
    requestedAt: at("requested_at").notNull().defaultNow(),
    scheduledFor: at("scheduled_for").notNull(),
    cancelledAt: at("cancelled_at"),
    completedAt: at("completed_at"),
    steps: jsonb("steps").$type<Record<string, string>>().notNull().default({}),
  },
  (t) => [
    index("deletion_request_due_idx").on(t.scheduledFor),
    // Step 5.10: one open request per member (neither cancelled nor completed).
    uniqueIndex("deletion_request_open_uq")
      .on(t.userId)
      .where(sql`${t.cancelledAt} is null and ${t.completedAt} is null`),
  ],
);

/** The general rate limiter (non-auth routes). Keys are keyed hashes, never an IP or email in clear. */
export const rateLimitBucket = pgTable("rate_limit_bucket", {
  key: text("key").primaryKey(),
  windowStart: at("window_start").notNull(),
  count: integer("count").notNull(),
});
