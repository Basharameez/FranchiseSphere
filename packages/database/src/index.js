import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
const connectionString = process.env.DATABASE_URL || "postgres://postgres:password@localhost:5432/threadline_plm";
const pool = new pg.Pool({
    connectionString,
});
export const db = drizzle(pool, { schema });
export { schema };
//# sourceMappingURL=index.js.map