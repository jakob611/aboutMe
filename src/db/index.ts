import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

/** Create the HTTP client inside the request, never while building/importing routes. */
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL in the Worker's runtime secrets.");
  }
  return drizzle(neon(databaseUrl));
}
