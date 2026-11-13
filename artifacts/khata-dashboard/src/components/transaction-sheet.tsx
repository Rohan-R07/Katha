import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CornerUpLeft, Loader2 } from "lucide-react";
import { useGetTransaction, getGetTransactionQueryKey, useReverseTransaction } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ErrorState, SignedAmount, TypePill } from "@/components/khata-ui";
import { businessDateTime, errorMessage, formatINR, useIdempotencyKey, useInvalidateLedger } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";

export function TransactionSheet({ id, onOpenChange, onNavigate }: { id: string | null; onOpenChange: (o: boolean) => void; onNavigate: (id: string) => void }) {
  const { t } = useI18n();
  const q = useGetTransaction(id ?? "", { query: { enabled: !!id, queryKey: getGetTransactionQueryKey(id ?? "") } });
  const txn = q.data;
  const reverse = useReverseTransaction();
  const invalidate = useInvalidateLedger();
  const { toast } = useToast();
  const [key, rotateKey] = useIdempotencyKey();
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"view" | "reverse">("view");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setMode("view"); setReason(""); setErr(null); }, [id]);

  const canReverse = txn && !txn.is_reversed && txn.transaction_type !== "reversal";

  const submit = () => {
    if (!txn) return;
    if (reason.trim().length < 3) return setErr("Give a reason of at least 3 characters");
    reverse.mutate({ transactionId: txn.id, data: { reason: reason.trim(), idempotency_key: key } }, {
      onSuccess: (r) => { rotateKey(); invalidate(); toast({ title: t("success"), description: `Offset entry ${formatINR(r.amount)} added.` }); setMode("view"); setReason(""); setErr(null); },
      onError: (e) => setErr(errorMessage(e)),
    });
  };

  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{t("details")}</SheetTitle>
          <SheetDescription>{t("reversal")}</SheetDescription>
        </SheetHeader>
        {q.isLoading && <div className="mt-6 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /></div>}
        {q.isError && <div className="mt-6"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>}
        {txn && (
          <div className="mt-6 space-y-5">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-2"><TypePill t={txn} /><span className="text-xs text-muted-foreground num">{businessDateTime(txn.created_at)} IST</span></div>
              <SignedAmount t={txn} className="mt-3 block text-3xl" />
              <Link href={`/customers/${txn.customer_id}`} className="mt-1 inline-block text-sm font-semibold underline-offset-4 hover:underline" data-testid="link-txn-customer">{txn.customer_name}</Link>
            </div>
            <dl className="divide-y rounded-lg border text-sm">
              {[
                [t("notes"), txn.description || t("notes")],
                ["Recorded by", txn.created_by_name],
                [t("sourceCol"), txn.source],
                ["Reference", txn.id],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 p-3"><dt className="text-muted-foreground">{k}</dt><dd className="text-right break-all">{v}</dd></div>
              ))}
            </dl>
            {txn.reversal_of && (
              <button className="w-full rounded-md border border-dashed p-3 text-left text-sm hover:bg-muted/50" onClick={() => onNavigate(txn.reversal_of!)} data-testid="link-original-entry">
                <span className="text-muted-foreground">Reverses entry </span><span className="font-semibold underline underline-offset-4">view original</span>
              </button>
            )}
            {txn.is_reversed && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t("reversed")}</p>}
            {canReverse && mode === "view" && (
              <Button variant="outline" className="w-full" onClick={() => setMode("reverse")} data-testid="button-start-reversal">
                <CornerUpLeft className="h-4 w-4 mr-1.5" /> {t("reversal")}
              </Button>
            )}
            {canReverse && mode === "reverse" && (
              <form className="space-y-3 rounded-lg border border-primary/40 bg-credit-soft/40 p-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <p className="text-sm">This adds an opposite entry of <span className="num font-semibold">{formatINR(txn.amount)}</span>. The original stays in the record.</p>
                <div className="space-y-1.5">
                  <Label htmlFor="rev-reason">{t("description")} ({t("required")})</Label>
                  <Textarea id="rev-reason" autoFocus rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Entered for wrong customer" data-testid="input-reversal-reason" />
                </div>
                {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => setMode("view")} disabled={reverse.isPending}>{t("cancel")}</Button>
                  <Button type="submit" variant="destructive" disabled={reverse.isPending} data-testid="button-confirm-reversal">
                    {reverse.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{t("confirm")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
