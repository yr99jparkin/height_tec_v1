import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from "./config";

neonConfig.webSocketConstructor = ws;

// Log which environment we're using, for debugging purposes
console.log(`[database] Using ${config.environment} database`);

export const pool = new Pool({ connectionString: config.database.url });
export const db = drizzle({ client: pool, schema });
