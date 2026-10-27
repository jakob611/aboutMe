import { createRequire, registerHooks } from "node:module";

// Next aliases this marker to its empty server entry when compiling Server
// Components. Plain Node rendering tests need the same alias; the application's
// client-bundle guard remains unchanged.
const require = createRequire(import.meta.url);
const serverMarker = require.resolve("next/dist/compiled/server-only/empty");
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "server-only" ? serverMarker : specifier, context);
  },
});
