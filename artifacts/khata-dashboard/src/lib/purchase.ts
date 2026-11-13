import type { Purchase, PurchaseInput, PurchaseInputPaymentMethod } from "@workspace/api-client-react";
import { decimal } from "@/lib/khata";

export const QTY_RE = /^\d{1,9}(\.\d{1,3})?$/;
export const PRICE_RE = /^\d{1,12}(\.\d{1,2})?$/;
export const MAX_TOTAL_PAISE = 10n ** 14n - 1n; // 12 whole digits + 2 decimals
export const PAGE_SIZE = 20;

/** Quantity as integer thousandths. */
export function milli(q: string): bigint {
  const [w, f = ""] = q.trim().split(".");
  return BigInt(w || "0") * 1000n + BigInt(f.padEnd(3, "0").slice(0, 3));
}
export function pricePaise(p: string): bigint {
  const [w, f = ""] = p.trim().split(".");
  return BigInt(w || "0") * 100n + BigInt(f.padEnd(2, "0").slice(0, 2));
}
/** Mirrors backend: quantity*unit_price rounded to paise ROUND_HALF_UP (values are non-negative). */
export function linePaise(q: string, p: string): bigint | null {
  if (!QTY_RE.test(q.trim()) || !PRICE_RE.test(p.trim())) return null;
  return (milli(q) * pricePaise(p) + 500n) / 1000n;
}

export type DraftLine = { key: string; product_id: string | null; product_name: string; quantity: string; unit: string; unit_price: string };
export type Draft = { lines: DraftLine[]; payment_method: PurchaseInputPaymentMethod | ""; notes: string };
export type Stored = { draft: Draft; key: string; frozen: PurchaseInput | null; savedAt: string };

export const newLine = (): DraftLine => ({ key: crypto.randomUUID(), product_id: null, product_name: "", quantity: "1", unit: "piece", unit_price: "" });
export const emptyDraft = (): Draft => ({ lines: [newLine()], payment_method: "", notes: "" });

export function lineError(l: DraftLine): string | null {
  if (!l.product_id && !l.product_name.trim()) return "Item name needed";
  if (l.product_name.trim().length > 150) return "Name max 150 characters";
  const q = l.quantity.trim();
  if (!QTY_RE.test(q)) return "Quantity: up to 9 digits, 3 decimals";
  if (milli(q) <= 0n) return "Quantity must be above zero";
  const u = l.unit.trim();
  if (!u || u.length > 30) return "Unit needed (max 30)";
  if (!PRICE_RE.test(l.unit_price.trim())) return "Price: up to 12 digits, 2 decimals";
  return null;
}

export function draftTotal(d: Draft): bigint | null {
  let t = 0n;
  for (const l of d.lines) { const v = linePaise(l.quantity, l.unit_price); if (v === null) return null; t += v; }
  return t;
}

export function validateDraft(d: Draft): string | null {
  if (d.lines.length === 0) return "Add at least one item";
  if (d.lines.length > 100) return "At most 100 items per bill";
  const bad = d.lines.findIndex((l) => lineError(l));
  if (bad >= 0) return `Item ${bad + 1}: ${lineError(d.lines[bad])}`;
  if (!d.payment_method) return "Choose how the customer paid";
  if (d.notes.length > 1000) return "Note max 1000 characters";
  const t = draftTotal(d);
  if (t === null || t <= 0n) return "Bill total must be more than zero";
  if (t > MAX_TOTAL_PAISE) return "Bill total is too large";
  return null;
}

export function toPayload(customerId: string, d: Draft, key: string): PurchaseInput {
  return {
    customer_id: customerId,
    payment_method: d.payment_method as PurchaseInputPaymentMethod,
    items: d.lines.map((l) => ({
      product_id: l.product_id,
      ...(l.product_id ? {} : { product_name: l.product_name.trim() }),
      quantity: l.quantity.trim(),
      unit: l.unit.trim(),
      unit_price: l.unit_price.trim(),
    })),
    notes: d.notes.trim() || undefined,
    idempotency_key: key,
  };
}

export const paiseStr = (p: bigint) => decimal(p);

export function storageKey(userId: string, customerId: string) { return `khata:purchase-draft:${userId}:${customerId}`; }
export function loadStored(k: string): Stored | null {
  const raw = sessionStorage.getItem(k);
  if (!raw) return null;
  const value = JSON.parse(raw) as Stored;
  if (!value || typeof value.key !== "string" || value.key.length < 8 ||
      !value.draft || !Array.isArray(value.draft.lines) || value.draft.lines.length < 1 || value.draft.lines.length > 100 ||
      typeof value.draft.notes !== "string" ||
      !["", "cash", "upi", "khata"].includes(value.draft.payment_method) ||
      !value.draft.lines.every(line => line && typeof line.key === "string" &&
        typeof line.product_name === "string" && typeof line.quantity === "string" &&
        typeof line.unit === "string" && typeof line.unit_price === "string" &&
        (line.product_id === null || typeof line.product_id === "string")) ||
      (value.frozen !== null && (!value.frozen || value.frozen.idempotency_key !== value.key ||
        typeof value.frozen.customer_id !== "string" || !["cash", "upi", "khata"].includes(value.frozen.payment_method) ||
        !Array.isArray(value.frozen.items) || value.frozen.items.length < 1 ||
        !value.frozen.items.every(item => item && typeof item.quantity === "string" &&
          typeof item.unit_price === "string" && typeof item.unit === "string")))) {
    throw new Error("The saved purchase draft is damaged. Review purchase history before removing it.");
  }
  return value;
}
export function saveStored(k: string, s: Stored) { sessionStorage.setItem(k, JSON.stringify(s)); }
export function clearStored(k: string) {
  try { sessionStorage.removeItem(k); return true; } catch { return false; }
}

const fmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
});
export function istDateTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${fmt.format(d)} IST`;
}

export const METHOD_LABEL: Record<string, string> = { cash: "Cash", upi: "UPI", khata: "Khata (Udhar)" };
export const STATUS_LABEL: Record<Purchase["payment_status"], string> = {
  paid: "Paid at sale", on_account: "Posted to Khata", credit_reversed: "Khata credit reversed",
};
export const STATUS_CLASS: Record<Purchase["payment_status"], string> = {
  paid: "bg-payment-soft text-payment", on_account: "bg-credit-soft text-credit", credit_reversed: "bg-muted text-muted-foreground line-through decoration-1",
};

export function fmtQty(q: string) { return q.includes(".") ? q.replace(/0+$/, "").replace(/\.$/, "") : q; }
