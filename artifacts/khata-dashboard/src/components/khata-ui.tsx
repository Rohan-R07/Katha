import type { ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { absINR, balanceKind, errorMessage, initials } from "@/lib/khata";
import type { Transaction } from "@workspace/api-client-react";
import { useI18n } from "@/lib/i18n";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1">{eyebrow}</p>}
        <h1 className="font-display text-2xl sm:text-3xl font-bold" data-testid="text-page-title">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-lg border bg-card", className)}>{children}</section>;
}

export function BalanceTag({ value, className }: { value: string; className?: string }) {
  const k = balanceKind(value);
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex flex-col items-end leading-tight", className)}>
      <span className={cn("num font-semibold", k === "outstanding" && "text-credit", k === "advance" && "text-advance", k === "settled" && "text-muted-foreground")}>
        {absINR(value)}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {k === "outstanding" ? t("toCollect") : k === "advance" ? t("advance") : t("settled")}
      </span>
    </span>
  );
}

export function Monogram({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground text-xs font-bold", className)}>
      {initials(name)}
    </span>
  );
}

export function TypePill({ t: txn }: { t: Transaction }) {
  const { t } = useI18n();
  const map: Record<string, [string, string]> = {
    credit: [t("udhar"), "bg-credit-soft text-credit"],
    payment: [t("jama"), "bg-payment-soft text-payment"],
    reversal: [t("reversed"), "bg-muted text-muted-foreground"],
  };
  const [label, cls] = map[txn.transaction_type];
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", cls)}>{label}</span>
      {txn.is_reversed && <span className="rounded border border-dashed px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("reversed")}</span>}
    </span>
  );
}

export function SignedAmount({ t, className }: { t: Transaction; className?: string }) {
  const n = parseFloat(t.signed_amount);
  return (
    <span className={cn("num font-semibold", n > 0 ? "text-credit" : n < 0 ? "text-payment" : "", t.is_reversed && "line-through opacity-60", className)}>
      {n > 0 ? "+" : n < 0 ? "−" : ""}{absINR(t.signed_amount)}
    </span>
  );
}

export function ErrorState({ error, onRetry, title = "Couldn't load this" }: { error: unknown; onRetry?: () => void; title?: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-dashed bg-card p-8 text-center" role="alert" data-testid="status-error">
      <AlertTriangle className="mx-auto h-6 w-6 text-primary" />
      <p className="mt-3 font-display text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} data-testid="button-retry">
          <RotateCw className="h-4 w-4 mr-1.5" /> {t("retry")}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg border bg-card ruled px-6 py-12 text-center" data-testid="status-empty">
      <div className="absolute inset-y-0 left-0 w-2 bahi-spine" aria-hidden />
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">{icon}</div>
      <p className="mt-4 font-display text-xl font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y rounded-lg border bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/5" /></div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
