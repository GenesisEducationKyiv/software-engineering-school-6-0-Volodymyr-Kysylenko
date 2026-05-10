import type { DatabaseHealthCheckPort } from "../../services/health/health.types.js";
import { pool } from "../pool.js";

export const databaseHealthCheckAdapter: DatabaseHealthCheckPort = {
    async checkConnection(): Promise<void> {
        await pool.query("SELECT 1");
    },
};
