import { z } from "zod";

// Server-side environment, validated once. Missing or malformed values fail fast at start-up
// instead of surfacing as odd runtime errors. Never import this file from client components.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
    .refine((v) => !/^change-me/i.test(v), "BETTER_AUTH_SECRET still holds the placeholder"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().default("GrooveRift <no-reply@localhost>"),
  EMAIL_TRANSPORT: z.enum(["console", "file", "none", "zeptomail"]).default("console"),
  // ZeptoMail (A7, D-110): the API host from the console's "Send mail" page (EU accounts use the EU host) and the
  // Send Mail token. Required when EMAIL_TRANSPORT=zeptomail.
  ZEPTOMAIL_API_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
  ZEPTOMAIL_TOKEN: z.string().optional(),
  EMAIL_FILE: z.string().default(".mail-outbox.jsonl"),
  // The file transport is for end-to-end tests only; CI and the Playwright config set this flag.
  E2E_EMAIL_FILE: z.string().optional(),
  // Cloudflare R2 object storage (A7, D-113): the bucket lives in the EU jurisdiction, so the endpoint must be the
  // jurisdiction-specific one (`https://<account-id>.eu.r2.cloudflarestorage.com`); a non-EU endpoint is refused.
  // Optional until step 5.11 uses it.
  R2_ENDPOINT: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z
      .url()
      .refine(
        (v) => new URL(v).hostname.endsWith(".eu.r2.cloudflarestorage.com"),
        "R2_ENDPOINT must be the EU jurisdiction endpoint (*.eu.r2.cloudflarestorage.com)",
      )
      .optional(),
  ),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  // Comma-separated request headers that carry the client IP, in order of trust (Better Auth
  // `advanced.ipAddress.ipAddressHeaders`). Empty locally (no proxy); REQUIRED in production, or every
  // client would share one rate-limit bucket and one lockout pair.
  IP_HEADERS: z.string().default(""),
  // Proxy addresses that append to X-Forwarded-For (Better Auth `trustedProxies`), comma-separated.
  TRUSTED_PROXIES: z.string().default(""),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  const data = parsed.data;
  // `next build` evaluates the modules with NODE_ENV=production to collect route data; the
  // production guards apply to the running server, not to the build.
  const building = process.env.NEXT_PHASE === "phase-production-build";
  if (data.NODE_ENV === "production" && !building) {
    // Security email must never be silently dropped (A7): only a real provider, or the test file
    // transport when the end-to-end suite says so explicitly.
    const testFile = data.EMAIL_TRANSPORT === "file" && data.E2E_EMAIL_FILE === "1";
    if (data.EMAIL_TRANSPORT === "console" || (data.EMAIL_TRANSPORT === "file" && !testFile)) {
      throw new Error(
        `EMAIL_TRANSPORT=${data.EMAIL_TRANSPORT} is not allowed in production: configure a provider (A7).`,
      );
    }
    if (
      data.EMAIL_TRANSPORT === "zeptomail" &&
      (!data.ZEPTOMAIL_API_URL || !data.ZEPTOMAIL_TOKEN)
    ) {
      throw new Error("EMAIL_TRANSPORT=zeptomail needs ZEPTOMAIL_API_URL and ZEPTOMAIL_TOKEN.");
    }
    if (!data.IP_HEADERS.trim() && data.E2E_EMAIL_FILE !== "1") {
      throw new Error(
        "IP_HEADERS must name the client-IP header in production (e.g. x-forwarded-for).",
      );
    }
    if (data.BETTER_AUTH_SECRET.length < 43) {
      throw new Error(
        "BETTER_AUTH_SECRET must be at least 43 characters (32 random bytes) in production.",
      );
    }
  }
  cached = data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";

export const listFromEnv = (value: string) =>
  value
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
