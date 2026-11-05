// For CLI scripts (migrate, seed) run outside Next.js: load .env.local, then .env, without
// overriding variables that are already set (CI passes them through the environment).
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
