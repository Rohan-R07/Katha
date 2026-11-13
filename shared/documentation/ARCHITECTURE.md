# Shared technical foundation

## Module ownership

- **Onboarding / Ramesh:** consumes auth, shop, customer import, category, and product APIs.
- **Voice assistant / Rohan:** owns recording, STT, intent parsing, clarification, confirmation, and TTS. Calls the shared structured operation API after confirmation.
- **Dashboard / Amogh:** owns this React dashboard, central backend, schema, contracts, and integration coordination.

All three share one application identity: KHATA. Do not create separate identity stores, customer tables, backend services, or financial logic for individual modules.

## Request path

```text
React dashboard ─────────────┐
Onboarding frontend ────────┼─ /api ─ FastAPI ─ strict Pydantic validation
Voice intent adapter ──────┘                 ─ shop authorization
                                             ─ shared ledger service
                                             ─ SQLAlchemy transaction
                                             ─ one PostgreSQL database
```

The managed API Server service runs `python -m backend.run`. Its old Express source remains unused so the starter is not destructively overwritten. There is no second running backend. The starter `lib/db` package is unused; SQLAlchemy plus Alembic owns KHATA's schema.

## Entities

- Users → one owned Shop.
- User → revocable AuthSessions.
- Shop → Customers → immutable Transactions.
- Transactions → optional reversal of one original transaction.
- Shop → ProductCategories → Products (simple catalog, no inventory).
- Shop/User → AiConversations, one row per adapter session ID.

Balances are derived, not columns. Composite foreign keys enforce transaction/customer/shop and product/category/shop consistency. Monetary storage is `NUMERIC(14,2)`. UUIDs are generated server-side.

## Authentication

Argon2id password hashing; HS256 JWT with `sub`, `jti`, `iss`, `iat`, and `exp`. Each JWT is backed by a database session with expiry and revocation. HttpOnly, SameSite=Lax cookie, Secure over HTTPS, scoped to `/api`. Logout revokes that exact session. All modules should use credentialed same-origin requests. Passwords and tokens are never placed in URL parameters, financial records, client storage, logs, or error responses.

Cross-site writes are rejected unless the exact origin is explicitly allowed. Configure `CORS_ORIGINS` only when separate frontend origins are truly needed. Prefer same-origin routing in this hackathon.

## Concurrency and consistency

PostgreSQL READ COMMITTED transactions and per-shop `SELECT … FOR UPDATE` serialize ledger writes and idempotency checks. The same lock protects multi-query summary/report/khata reads from changes midway through their calculation. No operation is successful until commit. Customer creation and opening balance entry commit together. Unique constraints remain a final duplicate/reversal guard.

## Contracts

`lib/api-spec/openapi.yaml` is the checked-in contract used to generate TypeScript query hooks. FastAPI serves that contract at `/api/openapi.json` and validates incoming bodies with corresponding strict Pydantic models. New endpoint fields require updating both schema and contract, then rerunning codegen.

Error shape: `{"error":"Human-readable message","code":"stable_error_code"}`; validation errors additionally contain field/message issues without sensitive inputs. Statuses: 401 sign in, 403 unapproved origin, 404 resource not in shop, 409 conflict/confirmation needed/shop required, 422 invalid input, 429 excessive auth attempts, 503 unavailable dependency/unconfigured voice.
