import { z } from "zod";

// Server-side environment, validated once. Missing or malformed values fail fast at start-up
// instead of surfacing as odd runtime errors. Never import this file from client components.
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().default("GrooveRift <no-reply@localhost>"),
  EMAIL_TRANSPORT: z.enum(["console", "none"]).default("console"),
  // Comma-separated list of request headers that carry the client IP, in order of trust.
  // Render sets X-Forwarded-For; locally there is no proxy and the header is ignored.
  IP_HEADERS: z.string().default(""),
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
  cached = parsed.data;
  return cached;
}

export const isProduction = () => env().NODE_ENV === "production";
