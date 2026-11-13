# Integration guide for Ramesh and Rohan

## Shared rules

Use the same FastAPI backend and database as the dashboard. Base path is `/api`. Prefer the same origin as KHATA; use `credentials: "include"` in fetch. Never send a shop ID: authentication resolves it. Do not create your own auth or balances.

Swagger: `/api/docs`. Contract: `/api/openapi.json` and `lib/api-spec/openapi.yaml`. Existing React query hooks are exported from `@workspace/api-client-react`.

```ts
async function khataRequest(path: string, body?: unknown) {
  const response = await fetch(`/api${path}`, {
    method: body ? "POST" : "GET",
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
```

## Ramesh: onboarding and existing khata

Website 1 is now mounted at `/onboarding` and uses this shared session and client.
See `WEBSITE1-INTEGRATION.md` for the source map, compatibility review, optional
profile/contact/catalog metadata, and unsupported billing/multiple-store contracts.

1. `POST /auth/register`: `{name,email,mobile_number,password}`. Password at least 10 characters. Sets the shared HttpOnly session cookie. A registered account initially has no shop.
2. `POST /shops`: `{shop_name,shop_type?,address?,city?,state?,contact_number?,preferred_language?}`.
3. `POST /customers`: `{customer_name,mobile_number?,address?,notes?,opening_balance:"500.00",idempotency_key:crypto.randomUUID()}`.
4. Store the returned `customer.id`. Customer and opening credit commit together. Preserve the import key across retries. Do not manually post a second opening credit.
5. Create categories with `POST /categories` `{category_name}`. Create products using `POST /products` `{product_name,category_id?,price:"62.50"}`.
6. `GET /auth/me` returns `{user,shop}`. `GET /shops/me` and `PUT /shops/me` support the profile.

An account can own one shop in this build. Existing-balance migration currently accepts nonnegative outstanding Udhar only, not negative historical opening advances.

## Rohan: AI voice assistant

Itemized purchase history is now available for questions such as “What did Ramesh
buy yesterday?” through `GET /api/purchases` with customer and IST date filters.
See `PURCHASES.md` for line-item input, retrieval, pagination, precision, and
accounting rules. A Khata purchase creates its own credit atomically; do not
also submit `add_credit` for the same bill.

Your module owns STT, parsing, disambiguation, explicit confirmation and TTS. No Gnani endpoints or capabilities have been assumed.

1. Authenticate with the same session, not a separate AI API key.
2. Resolve a spoken name with `GET /customers?search=Ramesh`. If multiple matches, ask the shopkeeper to choose a specific customer; never automatically take the first.
3. Ask the shopkeeper to confirm the actual customer, amount and operation.
4. Submit the confirmed structured command:

```json
{
  "intent": "add_credit",
  "customer_id": "<returned-customer-id>",
  "amount": "300.00",
  "description": "Groceries",
  "confirmed": true,
  "idempotency_key": "<stable-operation-uuid>",
  "session_id": "<your-conversation-session-id>"
}
```

`POST /ai/command` returns `{status:"committed",customer:<current balance and details>,transaction:<committed entry>}` only after database commit. For payment use `intent:"record_payment"`. For a balance inquiry send `{intent:"get_balance",customer_id:"..."}`; response is `{status:"balance",customer:...,transaction:null}`.

Repeat exactly the same operation key after network ambiguity, not a new key. Reused key with changed data returns 409. Only say an operation succeeded when response status is successful and `status` is `committed`. Never infer success from LLM output.

The same transaction appears in the dashboard immediately on refetch (dashboard polling also refreshes shared records).

`POST /ai/voice/process` deliberately returns **503 voice_not_configured**. It does not record, transcribe or synthesize speech. The `GNANI_*` and `LLM_*` names in `.env.example` are placeholders for your future adapter; merely setting them does not implement it.

## Endpoint reference

| Group | Routes |
|---|---|
| Identity | POST register/login/logout, GET me under `/auth` |
| Shop | POST `/shops`, GET/PUT `/shops/me` |
| Customers | POST/GET `/customers`, GET/PUT `/customers/{id}` |
| Ledger | POST/GET `/transactions`, GET `/transactions/{id}` |
| Corrections | POST `/transactions/{id}/reverse` `{reason,idempotency_key}` |
| Payments | POST `/payments` `{customer_id,amount,description?,idempotency_key}` |
| Khata | GET `/khata/summary`, GET `/khata/customers/{id}` |
| Reports | GET `/reports/daily?date=YYYY-MM-DD` |
| Catalog | GET/POST `/categories`, GET/POST `/products`, PUT `/products/{id}` |
| Readiness | GET `/integrations/status` |
| AI | POST `/ai/command`, reserved POST `/ai/voice/process` |

Transaction filters: `search`, `customer_id`, `transaction_type`, `date_from`, `date_to`, `limit` (1–1000), `offset`. Returns an array, newest first. Customer filters: `search`, `balance_status=all|outstanding|settled|advance`. Product filters: `search`, `category_id`.

All errors have `error` and `code`; field validation also includes `issues`. Handle 401 by signing in, 409 by resolving the conflict or confirmation, 422 by correcting input, and 503 by showing unavailable status. Never retry a failed operation with modified data under the original key.

## Changes across the team

Do not independently alter database tables or response shapes. Propose changes to the shared contract first, update backend validation, rerun codegen, then update all consumers together. Frontend modules must use the shared brand tokens and conventions in `shared/design-system/README.md`.
