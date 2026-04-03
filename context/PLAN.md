# NoviCloud TypeScript SDK - Implementation Plan

**Created:** 2026-04-02
**Updated:** 2026-04-03

---

## Status legend

- [x] Done
- [~] Partially done
- [ ] Not started

---

## Phase 1: Scaffolding and code generation

- [x] git init, package.json, tsconfig, tsup, vitest
- [x] Copy OpenAPI spec from Java repo
- [x] Generate TypeScript client (openapi-generator-cli, typescript-fetch)
- [x] Verify generated output (18 APIs, ~50 models, runtime with Basic Auth)

## Phase 2: SDK overlay (core)

- [x] errors.ts - 5 error classes, HTTP status mapping factory
- [x] retry.ts - RetryHandler + RetryPolicy (exponential/fixed backoff, jitter)
- [x] paging.ts - PagedResult with AsyncIterable, seek, fetchFrom, bidirectional
- [x] resource-helpers.ts - extractDane, extractSelfLink, requireNotNull, toLink
- [x] query-types.ts - 18 typed query interfaces (broken params excluded per ADR-031)
- [x] resources.ts - 18 resource client classes
- [x] client.ts - NoviCloudClient entry point
- [x] index.ts - public API exports
- [x] Build passes (ESM + CJS + DTS)

## Phase 3: Documentation

- [x] JSDoc on public API (client.ts, errors.ts, retry.ts, paging.ts, resources.ts - all 18 clients)
- [x] README.md
- [x] LICENSE.txt (copied from Java)
- [x] CHANGELOG.md
- [x] context/ARCHITECTURE.md
- [x] context/reports/ - session 1 report
- [x] context/confidence/ - session 1 assessment
- [x] context/PLAN.md (this file)
- [x] CLAUDE.md rewrite (comprehensive, Java-level detail)

## Phase 4: Tests

- [x] errors.test.ts (12 tests)
- [x] retry.test.ts (10 tests)
- [x] paging.test.ts (15 tests)
- [x] resource-helpers.test.ts (13 tests)
- [x] integration/towary.test.ts (13 tests)
- [x] Integration tests for all 18 endpoints (172 tests total across 22 files)
- [x] Run tests and fix failures (172/172 pass, paging seek bug fixed)
- [x] Test coverage: 60% overall, 100% on core (errors, retry, resource-helpers, client)

## Phase 5: Static analysis

- [x] ESLint config (flat config, ts-eslint + prettier)
- [x] Prettier config (.prettierrc, .prettierignore)
- [x] Run and fix all violations (0 ESLint errors, 0 Prettier issues)
- [x] Add to build scripts (lint, lint:fix, format, format:check)

## Phase 6: Demo app

- [x] demo/demo.ts (READ_ONLY mode, all 18 endpoints)
- [ ] Run demo against live server
- [ ] CRUD_SAFE mode (hard-delete endpoints)

## Phase 7: Repo hygiene

- [x] Git commits (proper history)
- [ ] .claude/hooks/ for OpenAPI edit protection
- [ ] examples/ directory with usage snippets

## Phase 8: Publish preparation

- [ ] npm audit fix
- [ ] Final README review
- [ ] npm publish dry run
- [ ] GitHub repo creation

---

## Current focus

Phases 1-5 complete. Creating git commits now.
