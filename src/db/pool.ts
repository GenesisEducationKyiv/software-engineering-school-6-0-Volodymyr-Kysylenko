import { Pool } from "pg";

import { env } from "../config/env.js";

const { DATABASE_URL, DB_MAX_CONNECTIONS, DB_IDLE_TIMEOUT_MS, DB_CONNECTION_TIMEOUT_MS } = env;

export const pool = new Pool({
    connectionString: DATABASE_URL,
    max: DB_MAX_CONNECTIONS,
    idleTimeoutMillis: DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DB_CONNECTION_TIMEOUT_MS,
});
