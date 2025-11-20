# Threadline PLM Logbook

All major development milestones, choices, and changes are recorded here.

## [2026-07-25] Initial Project Setup (Milestone 0)
- **Event**: Configured Threadline PLM repository structure, workspaces, strict TS rules, Docker Compose container environments, and system specification blueprints.
- **Decision**: Maintained `npm workspaces` structure to manage applications (`apps/*`) and core libraries (`packages/*`). Setup PostgreSQL 16, Redis, and MinIO container environments.
- **Status**: Milestone 0 completed.

## [2026-07-25] Identity & Access Management (Milestone 1)
- **Event**: Built schemas, auth routes, token rotation with replay invalidation checks, and API key management.
- **Decision**: Enabled token rotation via single-use session records. If a session is reused, all active user tokens are immediately invalidated for replay protection. Unique `jti` JWT claim values prevent time-based token collisions in integration tests.
- **Status**: Milestone 1 completed and tests verified.

## [2026-07-25] Seasons & Collections Management (Milestone 2)
- **Event**: Built seasons planning, collection plans, style briefs, design files database tables and route modules.
- **Decision**: Integrated document security validations (filename traversal and PDF signature magic bytes checks) directly into the design file upload endpoint before saving record pointers.
- **Status**: Milestone 2 completed and tests verified.

## [2026-07-25] Materials, Suppliers, Specifications & Colourways (Milestone 3)
- **Event**: Built materials library, supplier directories, specs immutability triggers, colours, and style colourways route handlers.
- **Decision**: Implemented an explicit PUT handler check in the specification update path to reject any modifications on records with `approvalStatus = "Approved"` to satisfy the immutability requirements.
- **Status**: Milestone 3 completed and tests verified.

## [2026-07-25] Sizes, Measurements, Grading & Samples (Milestone 4)
- **Event**: Built decoupled measurement calculation library, size scales, measurement points, specs, and sample measurements routes.
- **Decision**: Developed the grading calculation logic inside a decoupled package `@threadline/measurement-engine`. Formulated pass/fail validation logic comparing actual sample values against specified limits and tolerances.
- **Status**: Milestone 4 completed and tests verified.

## [2026-07-25] Bills of Materials & Costing (Milestone 5)
- **Event**: Built style bills of materials (BOM), wholesale/retail costing estimates, and supplier quotes with price tier matrix.
- **Decision**: Developed mathematical formula in costing endpoints to automatically compute wholesale price based on cost of goods and margin percentage, and retail price based on standard 2.2 industry markup factors.
- **Status**: Milestone 5 completed and tests verified.

## [2026-07-25] Fit Logs & Approvals (Milestone 6)
- **Event**: Built sample round lifecycles, fit evaluation logs, and signature approval workflows.
- **Decision**: Developed the approval endpoints to support generic targetTypes (Style, BOM, Specification) and auto-generate digital signature tokens containing unique hash prefixes for tracking decisions.
- **Status**: Milestone 6 completed and tests verified.

## [2026-07-25] Technical Packs & Audit Trails (Milestone 7)
- **Event**: Built Technical Pack exporter combining multi-component style structures, lockable Release Controls, and change audit trails.
- **Decision**: Programmed the releases endpoint to reject any modifications on records with `"Finalized"` status to satisfy the strict lockable release controls constraint.
- **Status**: Milestone 7 completed and tests verified.

## [2026-07-25] Collaborative Comments & Activity Streams (Milestone 8)
- **Event**: Built collaborative comment threads, mention notification triggers, and consolidated activity streams.
- **Decision**: Programmed the comments endpoint to scan input bodies, detect mentioned recipient IDs, and automatically post unread notifications mapping back to the style/material context.
- **Status**: Milestone 8 completed and tests verified.
