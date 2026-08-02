import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add the Neon pooled connection string to the current Vercel environment.",
    );
  }

  return drizzle(neon(connectionString), { schema });
}

export function getDb() {
  database ??= createDatabase();
  return database;
}
