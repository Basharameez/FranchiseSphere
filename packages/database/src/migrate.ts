import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const connectionString = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/threadline_plm";

  const pool = new pg.Pool({
    connectionString,
    max: 1
  });

  const db = drizzle(pool);

  console.log("Running migrations...");

  // Migrations directory points to migrations in root folder
  const migrationsFolder = path.resolve(__dirname, "../../../migrations");

  await migrate(db, { migrationsFolder });

  console.log("Migrations applied successfully!");
  await pool.end();
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
