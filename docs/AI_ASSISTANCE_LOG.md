# AI Assistance Log

This document discloses and tracks the use of AI assistance during the development of Threadline PLM.

## Model Details
- **AI Coding Assistant**: Antigravity (Google DeepMind)
- **Model**: Gemini Pro / Flash

## Log of Operations
- **2026-07-25**: Restructured workspace directories, setup root monorepo configurations, configured docker-compose.yml with new Postgres, Redis, and MinIO container environments, and wrote Milestone 0 requirements/architecture documentation.
- **2026-07-25**: Created database schemas for core identity, memberships, invitations, and API keys; built custom JWT tokens rotator and replay guards; developed integration test suites in Vitest.
- **2026-07-25**: Created seasons, collection plans, style records, briefs, and design files database tables; programmed Fastify routes for season lifecycle planning, style briefs, and document security file scanners; wrote Vitest integration tests.
- **2026-07-25**: Created suppliers directory, materials library, specifications, colours, and colourways database tables; programmed Fastify routes enforcing material specification immutability and style colourways mapping; wrote Vitest integration tests.
- **2026-07-25**: Built decoupled `@threadline/measurement-engine` calculating graded values, deviations, and pass/fail; created sizing database tables; programmed Fastify routes for specs and reviews; wrote Vitest integration tests.
- **2026-07-25**: Created style BOM, cost estimates, and supplier quotes database tables; programmed Fastify routes for BOM mapping, wholesales cost margins, and supplier price tier quote logs; wrote Vitest integration tests.
- **2026-07-25**: Created sample rounds, fit logs, and approvals database tables; programmed Fastify routes managing fit sessions, proto status updates, and signature approval workflows; wrote Vitest integration tests.
- **2026-07-25**: Created releases and audit logs database tables; programmed Fastify routes compiling exportable Tech Pack details, enforcing lockable releases controls, and querying audit log tracks; wrote Vitest integration tests.
- **2026-07-25**: Created comments, notifications, and activities database tables; programmed Fastify routes managing comments posting, mentions routing, read markers, and aggregated activity log lists; wrote Vitest integration tests.
