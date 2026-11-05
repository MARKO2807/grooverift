import "@/lib/load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, db } from "./client";

// Applies every migration in ./drizzle that has not run yet (drizzle-kit's journal).
// Usage: npm run db:migrate   (reads DATABASE_URL; .env.local is loaded when present)
async function main() {
  await migrate(db(), { migrationsFolder: "./drizzle" });
  console.log("migrations: up to date");
}

main()
  .catch((error) => {
    console.error("migrations failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
