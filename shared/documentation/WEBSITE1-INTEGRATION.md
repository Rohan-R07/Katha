# Website 1 integration review and file map

## Inspection and preservation

Both uploaded ZIPs have identical SHA-256:
`52d7c12bdb9863c7765504b550541198277add17d982bef06c6973d45583cd6a`.
The uploads remain untouched in `attached_assets`. Bundled Windows node_modules,
compiled dist, and the nested release ZIP are not installed into this Linux workspace.
The original source, configuration, tests, handover, and `khata_voice_config.json`
are preserved unchanged in `shared/vendor/ramesh-website1`.

## Integration file map

| Area | Integrated location |
| --- | --- |
| Existing wizard/profile/customer/catalog components | `artifacts/khata-dashboard/src/modules/onboarding/components/` |
| Existing translations, types, config export, optional audio preview | `artifacts/khata-dashboard/src/modules/onboarding/` |
| Shared-session state and server-confirmed mutations | `.../onboarding/context/AppContext.tsx` |
| API compatibility adapter, generated shared client | `.../onboarding/services/api.ts` |
| Module navigation and honest availability messages | `.../onboarding/index.tsx` |
| Existing dashboard route guard/navigation | `artifacts/khata-dashboard/src/App.tsx`, `src/components/app-shell.tsx` |
| Additive schema changes | `backend/migrations/versions/0002_onboarding_metadata.py` |

Website 1 lives at `/onboarding`. New accounts use its wizard at `/setup`.
The earlier basic setup remains available at `/setup/basic` until a shop exists.
Existing dashboard routes and screens are unchanged apart from a navigation link.

## API compatibility report

| Uploaded assumption | Shared contract / adaptation |
| --- | --- |
| localhost:8000, no credentials | Same-origin generated client, credentials include |
| GET `/api/health` | GET `/api/healthz` |
| GET/POST `/api/shop/profile` | GET `/api/auth/me`, POST `/api/shops`, GET/PUT `/api/shops/me` |
| PUT `/api/shop/language` | PUT `/api/shops/me`, retaining other profile fields |
| camelCase customers and mutable balance | Explicit snake_case adapter; server-generated UUID; balance from ledger aggregates |
| Customer opening balance in local transaction array | One atomic POST `/api/customers` with decimal opening_balance and stable idempotency_key |
| POST customer-specific transactions | POST `/api/transactions`, existing ledger service |
| `/api/inventory/products` | `/api/products`, with category lookup/create via `/api/categories` |
| Failures return local success | Errors are visible, forms retain inputs, no fake success or demo state |
| Product deletion | Not supported; existing source preserved, operation reports unavailable |
| Multiple stores/account | Not supported by existing one-owner/one-shop contract; no fabricated local stores |

Customer and monetary writes retain a retry key after ambiguous failures, scoped to
the authenticated user in sessionStorage. No payload or financial data is stored there.
Money input is passed as validated decimal strings. Numeric catalog calculators and
customer totals in Website 1 are presentation-only; the backend owns the actual ledger.
Customer history opens the existing dashboard ledger, including its reversal semantics,
instead of reinterpreting it through Website 1's narrower credit/payment-only type.

## Dependencies and configuration

The ZIP pins newer/different React, React DOM, Vite, TypeScript, Tailwind, and
lucide versions than KHATA. Only its existing components and required helpers
are integrated. The current workspace dependency versions, pnpm lockfile,
Vite configuration, Replit configuration, API routing, and workflows are retained.
No second package installation, server, database, login, router, or global theme is added.
Ramesh's global root/body CSS is preserved but not imported over the dashboard theme.

## Database changes

Three nullable PostgreSQL JSONB columns on **existing** models:
- shops.profile_details: shopkeeper display name, alternate phone, email, market area,
  pincode, UPI ID, GST number.
- customers.contact_details: alternate phone/label, informational credit limit.
- products.catalog_details: localized names, unit/pricing mode, stock metadata,
  barcode, voice keywords, availability and icon.

All metadata is schema-validated, optional, and returned in the shared OpenAPI contract.
Existing dashboard updates that omit metadata preserve it. Existing records remain
valid with null metadata. Opening balances, prices, and live customer balances are
not duplicated into metadata. No ledger/history or authentication tables change.
Stock quantities are catalog metadata, not an implemented invoice-deduction service.
Credit limits are informational, not a newly enforced credit policy.

Apply migration 0002 to development through the existing Alembic flow.
Do not run the retained unused Drizzle starter against this database.

## Authentication compatibility

The ZIP had no independent server authentication; its local sample store identity
was not suitable for persistence. The integrated module is behind KHATA's existing
route guard and HttpOnly JWT session. Ownership comes only from the server session.
Account registration/login/logout are the existing KHATA screens and endpoints.
No new password store, token, auth library, database, or CORS origin was introduced.

## Duplicate features and merge approach

Ramesh's customer/catalog/profile UI overlaps with dashboard customers/products/settings.
Both views now use the same rows and invalidate shared caches after writes; the module
also polls for other-session changes. The dashboard remains the authoritative history,
correction, reporting, and management view. Original billing/reports/navigation source
is preserved rather than overwriting dashboard equivalents.

The merge order was: inspect ZIP and financial rules; preserve source separately;
extend the existing contracts with optional metadata; add the additive migration;
reuse original components with API and safety adaptations; link the existing route
guard; regenerate the shared client; verify contracts, persistence, UI, and build.

## Explicit blockers / deferred capabilities

Itemized customer bills are now supported through the separate `/api/purchases`
contract and the existing customer Khata page; see `PURCHASES.md`. The uploaded
advanced billing UI is not silently connected to that different input contract.
The backend still has **no** automated cash/UPI verification/settlement contract,
invoice stock-deduction service, WhatsApp dispatch queue/provider, multi-shop ownership
contract, or product-delete contract. Uploaded billing and revenue-report source remains
intact but is not mounted as a fake working backend-connected feature. Customer reminder
links can open WhatsApp manually; opening a link is not automated message delivery.
The profile's QR illustration is not a generated payment QR.

The original `khata_voice_config.json` is preserved byte-for-byte. The live export uses
saved shop/catalog/language and marks absent parsing/invoice endpoints null. Gnani
Prisma/Timbre remain Rohan's responsibility. Ramesh's browser speech sample is only an
optional onboarding preview, not the main assistant or evidence of Gnani readiness.

## Verification results

- All 26 backend tests passed, including the original 21 ledger/auth/isolation tests
  and five additional Website 1 persistence and compatibility tests.
- Alembic schema check reported no pending model differences after migration 0002.
- Workspace TypeScript checks and the frontend production build passed. Vite reported
  non-blocking existing UI sourcemap warnings and a large-bundle advisory.
- One signed-in browser journey passed registration, the four-step original wizard,
  shop/profile creation, customer opening balance 500.25, reload persistence, the same
  customer in the dashboard and immutable opening ledger history, product/category
  integration at price 62.50, saved profile and Hindi preference, configuration export,
  existing overview/transactions/report/settings, and logout route protection.
- Shop profile and wizard were checked at mobile width without horizontal overflow.
- All 52 preserved source/configuration files matched the uploaded ZIP byte-for-byte.
