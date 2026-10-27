// Passenger/lsnode.js loads the startup file with require(), which cannot
// load an ESM graph containing top-level await (ERR_REQUIRE_ASYNC_MODULE).
// This .cjs shim is always CommonJS regardless of package.json's "type",
// so require() succeeds immediately and hands off to import() instead.
(async () => {
  await import('./index.js');
})();
