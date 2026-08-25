# 07: Monorepo Dependency Cleanup & Full Build Verification

**What to build:**
Complete removal of obsolete database and AI packages from `package.json` files, updating dev scripts, and verifying the entire monorepo builds and passes all test suites cleanly in-process without external services.

**Blocked by:** 06 (Client Hook Refactoring & Typed Hono RPC Integration)

**Status:** ready-for-agent

- [ ] Removed `drizzle-orm`, `drizzle-kit`, `postgres`, `@google/genai` from `server/package.json`.
- [ ] Removed `db:generate`, `db:migrate`, `db:seed` scripts from root `package.json` and `server/package.json`.
- [ ] Verified `npm run build` succeeds across `shared`, `server`, and `client` workspaces without TypeScript or bundling errors.
- [ ] Verified `npm test` runs in Vitest workspace mode and passes 100% across all 3 workspaces without Docker or PostgreSQL running.
