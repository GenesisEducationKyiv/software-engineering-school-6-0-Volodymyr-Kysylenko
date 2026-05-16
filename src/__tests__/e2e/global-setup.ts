import { runMigrations } from "../../db/migrate.js";
import { pool } from "../../db/pool.js";

export default async function globalSetup() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not set. Make sure .env.e2e is loaded.");
    }

    await runMigrations();
    await pool.query("TRUNCATE TABLE subscriptions CASCADE");
    await pool.end();
}
