# Itemized purchases and customer history

## Existing architecture, extended

There was no persisted invoice/purchase model before this extension. Website 1's
original billing frontend remains preserved but is not a second billing backend.
Migration `0003` adds `purchases` and `purchase_items` to the existing PostgreSQL
database. They reference the existing authenticated shop, customer, optional catalog
product, recording user, and optional credit ledger entry. No new account, customer,
balance, payment, or catalog system is introduced.

The individual dashboard customer page now has **New purchase**, newest-first
purchase history, business-date filters, pagination, and full bill details.
Existing Khata history, manual Udhar, repayments, corrections, onboarding, and
catalog management remain available.

## Accounting semantics

| Choice | Purchase disposition | Effect on existing Khata ledger |
| --- | --- | --- |
| Cash | Fully paid at sale | None; this is not a repayment of old dues |
| UPI | Fully paid at sale, manually recorded | None; no claim of provider/payment verification |
| Khata | Original full bill posted on account | Exactly one credit for the server-computed bill total |

The bill/items and its Khata credit commit in the **same database transaction**.
The existing ledger service is the only financial writer. A stable purchase
idempotency key is required; the same normalized request returns the same purchase
and the same credit, while changed data under that key returns 409. Shop-level
locking serializes concurrent writes before checking that key. The credit uses a
server-owned internal operation key, never a second frontend credit submission.

Repayments continue through `/payments` or the existing confirmed AI commands.
They are not purchases and are not allocated to individual bills. Consequently,
`on_account` means **originally posted to Khata**, not “this particular bill is still
unpaid.” Later repayments change the customer balance, not that historical marker.
No partial payments, split tenders, per-invoice settlement allocation, refunds,
tax/discount calculations, automated UPI verification, or inventory deductions
are implied. A free line is permitted if the whole bill remains positive.

An existing linked credit can be corrected through the current reversal API.
The purchase and its items remain immutable; the current response then reports
`credit_reversed` and the reversal ID. This is a ledger correction, **not a refund**.
The daily itemized-sales totals remain gross recorded purchases; existing ledger
reversal reporting remains separate.

## Precision and historical data

- Quantity: positive decimal string, up to 9 whole and 3 fractional digits.
- Unit price: existing nonnegative INR decimal-string money rules.
- Each line: `quantity × unit_price`, rounded to paise using decimal `ROUND_HALF_UP`.
- Bill total: sum of already-rounded line totals, positive and at most
  `999999999999.99`. Overflow and zero-total bills are rejected before any credit.
- Frontend previews use integer BigInt thousandths/paise with the same rule.
- The backend owns totals; caller-supplied totals, ownership, credit IDs, statuses,
  and timestamps are rejected.
- PostgreSQL `TIMESTAMPTZ` records server insertion time; responses include UTC
  offsets, and the interface displays readable date/time including seconds in
  `Asia/Kolkata` (IST), the established local business timezone for KHATA.
- Product names, units, quantities, and prices are immutable snapshots. Later
  product edits never rewrite old bills.
- No purchase edit/delete endpoints exist. Earlier amount-only ledger entries
  remain intact; missing historical item details are not fabricated or backfilled.

## Shared API / Rohan integration

All endpoints use the existing HttpOnly session or shared bearer authentication.
Never send shop/owner IDs; authentication resolves the shop.

### Record a purchase

`POST /api/purchases`

```json
{
  "customer_id": "<existing-customer-uuid>",
  "payment_method": "khata",
  "items": [
    {
      "product_id": "<optional-existing-product-uuid>",
      "quantity": "0.500",
      "unit": "kg",
      "unit_price": "80.00"
    },
    {
      "product_name": "Carry bag",
      "quantity": "1",
      "unit": "piece",
      "unit_price": "2.00"
    }
  ],
  "notes": "Groceries",
  "idempotency_key": "<stable-operation-uuid>"
}
```

The example creates a `42.00` purchase and one `42.00` credit. A selected product's
current server name is snapshotted; custom items require `product_name`.
Do **not** subsequently send `add_credit` for the same bill.

### Retrieve “What did Ramesh buy yesterday?”

1. Resolve the name using `GET /api/customers?search=Ramesh`.
2. Ask for clarification if multiple customers match; never choose automatically.
3. Calculate yesterday's calendar date in `Asia/Kolkata`, not the device/UTC date.
4. Call:

   `GET /api/purchases?customer_id=<uuid>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&limit=20&offset=0`

5. Response: `{purchases, total_count, limit, offset, timezone}`. Each purchase
   includes the full item snapshots, timestamp, method, original disposition,
   notes, recording user, and linked ledger/reversal IDs. Fetch subsequent pages
   until all matching records are retrieved. Dates are inclusive local business
   days, implemented with a half-open UTC boundary.

`GET /api/purchases/{purchase_id}` returns complete bill details. The optional
`search` list filter matches customer or item names. Sorting is newest first,
with purchase ID as a stable tie-breaker. Foreign-shop customers/products/bills
return 404, never cross-shop records.

Rohan's future adapter may use these read APIs and, after explicit customer/item/
amount/payment-method confirmation, the shared purchase-create API. No Gnani
speech or LLM behavior is fabricated. Website 1's **live** config export now
advertises purchase history/create URLs; the uploaded original JSON is unchanged.

## Reports and UI safety

`GET /api/reports/daily` keeps all original ledger fields and adds:
`purchase_count`, `purchase_total`, `cash_sales`, `upi_sales`, `khata_sales`.
The dashboard displays these in a separate itemized-sales section. Do not add
sales and ledger credit totals together: a Khata sale already has its ledger
credit. Cash/UPI sales must not inflate old-debt “Collected” totals.

Purchase forms have review/confirmation, double-click protection, and a
user/customer-scoped sessionStorage draft with its stable operation key. An
ambiguous failed request freezes the submitted bill so only the identical request
can be retried; editing after a definite validation rejection uses a fresh key.
Browser storage failure blocks a new submission rather than losing retry safety.
Explicit abandonment warns the operator to check history first. Successful saves
invalidate both purchase and ledger queries; polling refreshes other sessions.

## Verification

PostgreSQL tests cover item/timestamp persistence, catalog snapshots, exact line
rounding, paid-vs-credit accounting, retry/mismatch behavior, atomic rollback after
credit creation, invalid inputs and overflow, tenant isolation, IST date boundaries,
sorting/pagination, historical reports, credit reversals, legacy opening balances,
and shared authentication. Tests use rollback-only records.

All 54 backend tests and workspace TypeScript checks passed. Alembic reported no
model/schema drift, and the production frontend build succeeded (with existing
non-blocking sourcemap and bundle-size advisories).

The signed-in browser journey verified a real committed purchase whose response
was deliberately aborted: after reload, retry returned the original bill ID and
only one ledger credit. It also verified catalog/custom lines, paid cash/UPI sales,
separate repayments, reload persistence, history ordering/date filters, bill details,
correct sales/ledger reports, existing onboarding/settings/overview, and 390px layouts.
Post-test display fixes gave all ledger rows/details the same IST timezone as the
day book, made sibling component keys unique, and prevented incomplete date-filter
typing from sending invalid requests; these fixes passed TypeScript/build checks.
