import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// The WebSocket Pool driver (vs neon-http) supports interactive
// db.transaction(...), which we need for atomic multi-step writes. In Node it
// needs a WebSocket constructor; on the edge/browser the global WebSocket is used.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });

export const db = drizzle(pool, { schema });
