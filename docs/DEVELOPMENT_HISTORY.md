# Development History

This document details the development timeline of Threadline PLM.

## Milestones Timeline
- **Milestone 0: Monorepo Foundation** (Completed: 2026-07-25)
  - Configured workspace setup, strict TS settings, Docker Compose services configuration, and system specification blueprints.
- **Milestone 1: Identity & Access Management** (Completed: 2026-07-25)
  - Programmed Drizzle schemas for users, sessions, orgs, memberships, invites, and apiKeys.
  - Implemented token rotation, session audits, TOTP MFA verify mock, and final administrator protection rules.
  - Wrote comprehensive positive, negative, and cross-tenant integration test suite in Vitest.
- **Milestone 2: Seasons, Collections, Briefs, Styles, and Design Files** (Completed: 2026-07-25)
  - Programmed database tables for seasons, collectionPlans, styles, productBriefs, and designFiles.
  - Built Fastify routes for season lifecycle management, style briefs, and document security scan sketch attachments.
  - Wrote Vitest integration test suite verifying season planning, collection plans, briefs, and sketch file uploads.
- **Milestone 3: Materials, Suppliers, Specifications, and Colourways** (Completed: 2026-07-25)
  - Programmed database tables for suppliers, materials, materialSpecifications, colours, and colourways.
  - Built Fastify routes for supplier directory, material specs immutability verification, and style colourways mapping.
  - Wrote Vitest integration test suite verifying supplier setups, spec revisions, immutability rejections, and colourway mappings.
- **Milestone 4: Sizes, Measurements, Grading, and Sample Measurements** (Completed: 2026-07-25)
  - Created decoupled `@threadline/measurement-engine` calculating graded increments and tolerance check bounds.
  - Programmed database tables for sizeScales, measurementPoints, measurementSpecifications, and sampleMeasurements.
  - Built Fastify routes for specs creation, graded sizes lookup, and sample fit pass/fail entries.
  - Wrote Vitest integration test suite verifying size scale grades and sample pass/fail deviation checks.
- **Milestone 5: Bills of Materials, Costing, and Supplier Quotes** (Completed: 2026-07-25)
  - Programmed database tables for bomItems, costEstimates, and supplierQuotes.
  - Built Fastify routes for BOM mapping, wholesale target margin calculations, and supplier quotes with price tiers.
  - Wrote Vitest integration test suite verifying BOM tracking, supplier quotes, and margin costing estimates.
- **Milestone 6: Fit Logs, Samples, and Approvals** (Completed: 2026-07-25)
  - Programmed database tables for sampleRounds, fitLogs, and approvals.
  - Built Fastify routes for sample round requested/received flow, fit evaluation logs, and signature approvals.
  - Wrote Vitest integration test suite verifying fit status reviews and release approval sign-offs.
- **Milestone 7: Technical Packs, Release Controls, and Audit Reports** (Completed: 2026-07-25)
  - Programmed database tables for releases and auditLogs.
  - Built Fastify routes for complete Tech Pack detail compilation, lockable release controls, and changes compliance audit queries.
  - Wrote Vitest integration test suite verifying Tech Pack compile keys, locked releases, and audit compliance trails.
- **Milestone 8: Collaborative Comments and Real-time Activity Streams** (Completed: 2026-07-25)
  - Programmed database tables for comments, notifications, and activities.
  - Built Fastify routes for collaborative threads, mentions notification dispatches, and live activities stream feeds.
  - Wrote Vitest integration test suite verifying comment threads, mentions dispatches, and aggregated activity feeds.
