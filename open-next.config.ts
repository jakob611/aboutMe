import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// All database-backed pages are rendered per request; no ISR cache is needed.
export default defineCloudflareConfig({});
