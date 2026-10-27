import "server-only";
import { cache } from "react";
import { createSiteContent } from "./site-content";
import { configuredDefaults, readSiteContent, contentBucket } from "./site-content-store";
export const getSiteContent = cache(async () => {
  try { return createSiteContent({ ...configuredDefaults(), ...(await readSiteContent(await contentBucket())).overrides }); }
  catch { console.error("Public content overrides unavailable; built-in copy remains available."); return createSiteContent(configuredDefaults()); }
});
