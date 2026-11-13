# Ledger semantics and safety

1. Money is a **decimal string** over the API and Python `Decimal` / PostgreSQL `NUMERIC(14,2)` internally. Never perform authoritative monetary arithmetic in JS floating-point.
2. Accepted entry amounts are positive, up to 12 whole digits and two decimal places. Products and opening balances may be zero. Reject negatives, NaN, Infinity, exponents, floating-point JSON numbers, and excessive precision.
3. A credit adds to what a customer owes. A payment subtracts. A negative balance is an advance owed to the customer, not an outstanding debt.
4. Shop outstanding is the sum of **positive customer balances**. Advances are reported separately; one customer's advance must not hide another's debt.
5. Imported opening balances are immutable credit entries with `source=opening_balance`, not a separate mutable balance column.
6. Every financial create requires a stable unique `idempotency_key`. An identical retry returns the committed original; changed data with the same key returns 409. Keep the same key until the operation succeeds or is explicitly abandoned.
7. Reversals require a reason, preserve the original, record the exact opposite sign, and can occur only once per original. Reversing a reversal is not supported; add a fresh corrected credit/payment instead.
8. No financial update/delete endpoint exists. Customer detail edits cannot change historical money.
9. Current total credit/payments are **net of their linked reversals**. Daily credit/payments show original entries recorded that day, with `reversal_net` separately showing signed corrections recorded on that day. Keep both for audit clarity.
10. Timestamps are server-generated UTC. Reports use Asia/Kolkata business days, including historical closing balance as of the selected day's end. Customers created after that day are excluded from its count. Backdated entry creation is not supported.
11. Every resource is checked against the signed-in shop. Caller-supplied shop IDs or owner IDs are not accepted in financial request bodies.
12. The LLM never writes SQL. It produces a structured intent. An explicit shopkeeper confirmation must precede an AI financial write; clarification and customer disambiguation happen in Rohan's adapter. The confirmation boolean is an integration contract, not proof supplied by a trusted LLM.
13. Itemized purchases use the same customer/shop and ledger. Cash/UPI sales are paid immediately and do not repay old Udhar. A Khata purchase atomically creates exactly one credit; retries return the original bill and credit.
14. Purchase lines snapshot names, quantities, units and prices. Round each line to paise with `ROUND_HALF_UP`, then sum. Do not fabricate item history from old amount-only ledger entries.
15. Purchase disposition and repayments are distinct. Repayments are not allocated to bills; `on_account` records the original credit posting, not a bill's current unpaid balance. Itemized gross sales and ledger collections/reversals are separate report sections. See `PURCHASES.md`.

Example: credit `"500.00"` minus payment `"200.00"` yields balance `"300.00"`. Reversing that credit leaves balance `"-200.00"` and an advance of `"200.00"`, while retaining all three audit entries.

## Verification

The tests cover actual PostgreSQL records and HTTP API responses, including register/login/logout, session revocation, opening imports, exact cents, invalid input, duplicate keys, customer edits/search, payment and credit reversals, overpayments/advances, per-shop isolation, catalog relationships, AI confirmation, and IST day boundaries. They run in rollback-only transactions so no fake shop finances remain.
