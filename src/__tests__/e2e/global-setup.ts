import { runMigrations } from "../../db/migrate.js";
import { pool } from "../../db/pool.js";

export default async function globalSetup() {
    await runMigrations();
    await pool.query("TRUNCATE TABLE subscriptions CASCADE");
    await pool.end();
}
