import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

export const REFETCH = 30_000;
export const AMOUNT_RE = /^\d{1,12}(\.\d{1,2})?$/;

/** Exact display-side arithmetic in integer paise; backend remains authoritative. */
export function paise(value: string): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const result = BigInt(whole || "0") * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
  return negative ? -result : result;
}

export function decimal(p: bigint): string {
  const abs = p < 0n ? -p : p;
  return `${p < 0n ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}

export function addMoney(...values: string[]): string {
  return decimal(values.reduce((sum, value) => sum + paise(value), 0n));
}

export function businessDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Server timestamps always use the same local timezone as the shop's day book. */
export function businessDateTime(value: string, options: Intl.DateTimeFormatOptions = {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
}): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "Asia/Kolkata" }).format(date);
}

const integerINR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatINR(v: string | number | null | undefined): string {
  const value = typeof v === "number" ? (Number.isFinite(v) ? v.toFixed(2) : "") : (v ?? "0.00");
  if (!/^-?\d+(\.\d{1,2})?$/.test(value)) return "—";
  const p = paise(value);
  const abs = p < 0n ? -p : p;
  return `${p < 0n ? "-" : ""}₹${integerINR.format(abs / 100n)}.${String(abs % 100n).padStart(2, "0")}`;
}
export function absINR(v: string | number | null | undefined) {
  return formatINR(typeof v === "number" ? Math.abs(v) : (v ?? "0.00").replace(/^-/, ""));
}
export function num(v: string | null | undefined) {
  const n = parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

export type BalanceKind = "outstanding" | "advance" | "settled";
export function balanceKind(v: string): BalanceKind {
  const n = paise(v);
  if (n > 0n) return "outstanding";
  if (n < 0n) return "advance";
  return "settled";
}

export function validAmount(s: string): string | null {
  const t = s.trim();
  if (!t) return "Enter an amount";
  if (!AMOUNT_RE.test(t)) return "Use up to 12 whole digits and 2 decimal places";
  if (paise(t) <= 0n) return "Amount must be more than zero";
  return null;
}

export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  const d = (e as { data?: { error?: string; message?: string } } | null)?.data;
  if (d && typeof d === "object") return d.error || d.message || fallback;
  if (e instanceof Error && e.message) return e.message.includes("Failed to fetch") ? "Can't reach the server. Check your connection." : fallback;
  return fallback;
}
export function errorStatus(e: unknown): number | undefined {
  return (e as { status?: number } | null)?.status;
}

/** Stable idempotency key, kept across retries; rotate only after success. */
export function useIdempotencyKey() {
  const [key, setKey] = useState(() => crypto.randomUUID());
  const rotate = useCallback(() => setKey(crypto.randomUUID()), []);
  return [key, rotate] as const;
}

/** Invalidate every data query (all ledger figures are interdependent). */
export function useInvalidateLedger() {
  const qc = useQueryClient();
  const ref = useRef(qc);
  ref.current = qc;
  return useCallback(() => {
    const me = getGetMeQueryKey()[0];
    return ref.current.invalidateQueries({ predicate: (q) => q.queryKey[0] !== me });
  }, []);
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
