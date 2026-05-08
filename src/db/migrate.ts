import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { logger } from "../utils/logger.js";
import { pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../../migrations");

export async function runMigrations(): Promise<void> {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

    const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

    for (const file of files) {
        const exists = await pool.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);

        if (exists.rowCount) {
            continue;
        }

        const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
        const client = await pool.connect();

        try {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
            await client.query("COMMIT");
            logger.info(`Applied migration: ${file}`);
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runMigrations()
        .then(async () => {
            await pool.end();
        })
        .catch(async (error: unknown) => {
            logger.error("Migration failed", error);
            await pool.end();
            process.exit(1);
        });
}
