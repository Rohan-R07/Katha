# Deploy the complete KHATA application on Vercel

## What is configured

Import this **whole repository**, with Root Directory left at `.`. Do not set the
root to `artifacts/khata-dashboard` or import only its `dist` directory: that would
omit the shared API, Python models/migrations, and OpenAPI contract.

The root `vercel.json` selects the **Vite** frontend preset and builds the existing
frontend with pnpm 10.26.1. Its explicit output directory is
`artifacts/khata-dashboard/dist/public`. Vercel serves those assets independently
of Python. A single Python function, `api/index.py`, uses `vercel_app.py` to delegate
API requests to the unchanged shared FastAPI backend, preserving paths, bodies,
cookies and origins. API routes are resolved first, then real static files, then
the SPA fallback for browser routes such as `/customers`, `/customers/<id>`,
`/onboarding`, and `/reports`.

`/api/*` continues to reach the same shared backend, with no proxy hostname or
second authentication system. No second database is created. Existing API
middleware and authentication remain in place when the backend is configured.
If it is not configured, API requests fail closed with HTTP 503, not a fake login,
fake success, replacement ledger, or in-memory database.

The API route precedes the SPA fallback: API requests must never turn into HTML.
Missing `/assets/*` files remain 404s rather than becoming `index.html`.
Python is pinned to 3.12. Use a supported Node 22 or 24 build runtime.

## Before importing: required secrets

Add these in Vercel **Project → Settings → Environment Variables** for the
environment you intend to use, before deploying. Never place them in GitHub,
`vercel.json`, a frontend `VITE_*` variable, or chat.

| Name | Required value |
| --- | --- |
| `DATABASE_URL` | An externally reachable PostgreSQL connection URL, with the provider's required TLS options |
| `JWT_SECRET` **or** `SESSION_SECRET` | One cryptographically random server-side secret, at least 32 characters |

Use the existing externally reachable database if you want the same records.
**A repository does not contain PostgreSQL data.** Replit's development database
is isolated by default; its internal connection URL is not sufficient for Vercel.
For a Replit-managed production database, get its external connection details in
the Database tool's **Production → Settings**. For an external PostgreSQL provider,
use that provider's native URL. Confirm reachability before deploying.

If a production database does not exist or there is no externally reachable URL,
database access is a deployment prerequisite, not something `vercel.json` can fix.
Do not create a replacement database or export real shop/customer data into Git.

For continuity with existing sessions, use the existing signing secret securely;
using a different secret requires users to sign in again. Do not use example values.
`PORT` and `BASE_PATH` are supplied by the frontend build script. `CORS_ORIGINS`
is normally unnecessary because the UI and API share the Vercel origin.
Gnani and LLM secrets remain optional until those integrations are implemented.

## Import and deploy manually

1. In Vercel, choose **Add New → Project** and import the GitHub repository.
2. Keep **Root Directory `.`**. Use the repository-defined Vite preset,
   install/build settings, and output directory. The Python function stays in the
   same root project; do not import only the dashboard directory or remove `/api`.
3. Add the required secrets to the intended environment.
4. Apply **missing** Alembic migrations to that target database once, from a
   trusted shell with its URL injected securely:

   ```sh
   python -m alembic -c backend/alembic.ini current
   python -m alembic -c backend/alembic.ini upgrade head
   ```

   Back up existing production data first. If this is already the database used by
   the app and it is at head, do not replay migrations or seed/reset it.
   **Vercel does not run Replit's database publishing flow.**

5. Click **Deploy** yourself. Once the GitHub integration is enabled in Vercel,
   pushes to its tracked branches can trigger automatic deployments. Changing
   environment settings does not update an existing deployment: redeploy after saving.
6. Visit `/api/healthz` on the resulting deployment. It must return
   `{"status":"ok"}`; this checks actual database access.
7. Check login, customer/profile deep-link reloads, onboarding, catalog, itemized
   purchases, repayments and reports. Test purchases with disposable data, not a
   real financial entry you will later want to delete.

Keep Preview deployments separate from real production records: an authorized
preview using the same database can change those records. Do not automatically
copy the production URL/secret into untrusted branch previews.

## Verification and limitations

### `500 FUNCTION_INVOCATION_FAILED` after a successful build

The screenshot alone is not a traceback. Check **Vercel → Project → Settings →
Environment Variables** and Runtime Logs before changing working application code.
The backend intentionally requires `DATABASE_URL` and a valid signing secret at
startup. The hosting adapter now loads that backend only for API requests, so its
missing configuration no longer crashes delivery of the public page assets.
The frontend displays an explicit unavailable-backend message; it does not allow
login or financial operations while the backend is unavailable.
Replit secrets are **not** automatically copied to Vercel.

1. Add the existing externally reachable PostgreSQL URL as `DATABASE_URL`, securely.
2. Add `JWT_SECRET` or `SESSION_SECRET` (at least 32 characters), securely.
3. Select the target used by the deployment, normally **Production**. Configure
   Preview separately only if intended; do not expose production data to previews.
4. Save and redeploy in Vercel. Then check `/api/healthz` before testing financial writes.
5. If it still fails, inspect the new deployment's Runtime Logs. Do not paste
   secret values, database URLs, cookies, or tokens into chat or GitHub.

`build:vercel` checks these settings before compiling. By default, missing settings
produce a warning and allow the public page assets to build; the runtime gateway
still rejects all API operations with HTTP 503. To require a fully configured
backend at build time, set `KHATA_REQUIRE_BACKEND=1` for that deployment environment.
Neither mode generates a default secret, creates a database, logs values, or skips
authentication. A successful assets build **does not** prove database reachability,
credentials, migration state, or a working ledger.
After building, run `pnpm run test:deployment` and `python scripts/check-vercel.py`.
The first includes isolated unconfigured-hosting tests; the second uses the real,
configured backend and performs read-only routing/database-health checks.

## External production database

Vercel's production target is Neon project `khata-production`, database `khata`,
branch `production`, in `aws-us-east-1` alongside Vercel's `iad1` function region.
All production modules use this one shared database. Replit's development database
is separate and is not overwritten or continuously synchronized.

Use the restricted PostgreSQL role `khata_app` for Vercel's encrypted
`DATABASE_URL`, with TLS and Neon's pooled endpoint. This is a database role only,
not a second application authentication system. The existing KHATA account,
session and shop-authorization logic stays authoritative. Never expose the URL
through `VITE_*`, commit it, or paste it into logs.

Schema changes require the database owner, not the runtime role. Reuse the existing
Alembic migrations with an explicitly supplied external connection; never run
migrations as part of a frontend build, API request or server startup.

`scripts/initialize-external-production.py` is a one-time initialization tool,
not a backup job. It takes the target connection and expected hostname from the
process environment (`KHATA_TARGET_DATABASE_URL`, `KHATA_TARGET_HOST`), performs
a dry run by default, and requires `--execute` to write. It refuses a target
containing application records or unrelated tables. Source reads use a read-only
snapshot; the target schema and rows commit together only after per-table counts
and record fingerprints match. Binary transfer preserves SQL/JSON nulls, IDs,
exact decimals and timestamps without writing a dump file or replaying ledger
operations. Do not rerun initialization after production has received new data.

Local checks can validate the build, config schema, the existing 54 backend tests,
and the Vercel adapter's API/static/deep-link routing. A real Vercel deployment is
still necessary to verify Vercel permissions, environment settings, network access,
and project limits; no configuration can guarantee zero hosting errors.

The existing auth-attempt limiter is process-local. For a public multi-instance
deployment, enforce a distributed/edge rate limit as documented in the main README.
PostgreSQL connection limits must also accommodate serverless instances; use your
existing provider's supported pooler if needed, without changing the ledger model.

Official references:
- https://vercel.com/docs/frameworks/backend/fastapi
- https://vercel.com/docs/functions/runtimes/python
- https://docs.replit.com/features/data-and-storage/connection-details
