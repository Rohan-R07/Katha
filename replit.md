# KHATA

A shared digital Udhar ledger and management dashboard for Indian Kirana shopkeepers.

## Run & Operate

- Managed workflows: `artifacts/api-server: API Server` and `artifacts/khata-dashboard: web`.
- Backend package `dev` launches `python -m backend.run` from the project root.
- `pnpm run typecheck` — all TypeScript packages.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks and shared types.
- `python -m pytest backend/tests -q` — PostgreSQL API/service tests with rollback-only records.
- `python -m alembic -c backend/alembic.ini upgrade head` — development migrations.
- Required server configuration: PostgreSQL `DATABASE_URL` and `JWT_SECRET` or existing `SESSION_SECRET`.
- Swagger: `/api/docs`; contract JSON: `/api/openapi.json`.

## Stack and ownership

- Frontend: React/Vite/TypeScript/Tailwind in `artifacts/khata-dashboard`.
- Backend: Python/FastAPI/SQLAlchemy/Pydantic in `backend`.
- Schema: `backend/app/database/models.py`, with frozen Alembic history in `backend/migrations`.
- API source of truth: `lib/api-spec/openapi.yaml`; update backend validation and rerun codegen after changes.
- The retained Express/Drizzle starter code is unused. **Never run its Drizzle push scripts against KHATA.**
- `scripts/post-merge.sh` installs pnpm/Python dependencies and applies development Alembic migrations.

## Product and integration rules

- One shared backend, database, authentication system and KHATA identity for all three modules.
- Ramesh's uploaded onboarding frontend is integrated at `/onboarding`; new accounts use its wizard at `/setup`. Preserve its original source in `shared/vendor/ramesh-website1`.
- Do not rebuild either frontend or replace the shared backend/auth/database. Adapt existing components through established contracts.
- Rohan's voice assistant is not implemented. Preserve `khata_voice_config.json`; never substitute browser recognition for his planned Gnani integration.
- A minimum account/shop setup exists to make the dashboard usable independently.
- Decimal strings over the API, Decimal/NUMERIC for money; no mutable duplicate balances.
- Immutable financial history, linked reversals with reasons, stable idempotency keys and shop-level authorization.
- Overpayment becomes an advance, reported separately from outstanding.
- Reports use Asia/Kolkata days. Daily original credit/payment totals and reversal net are separate; lifetime totals are net of reversals.
- Itemized purchases snapshot items and use one atomic ledger credit for Khata; paid cash/UPI sales do not repay old dues. No split payments, per-bill repayment allocation, refunds, or stock deductions are implied.
- No fake financial data, demo accounts, automatic login or fabricated Gnani support.
- Use the dashboard theme tokens for all future modules.

## Publishing

No startup-time schema changes or production migration scripts. Apply schema changes to development; managed Publish applies the production diff.

## Documentation

- `README.md`
- `shared/documentation/ARCHITECTURE.md`
- `shared/documentation/FINANCIAL-RULES.md`
- `shared/documentation/TEAM-INTEGRATION.md`
- `shared/documentation/WEBSITE1-INTEGRATION.md`
- `shared/documentation/PURCHASES.md`
- `shared/design-system/README.md`
