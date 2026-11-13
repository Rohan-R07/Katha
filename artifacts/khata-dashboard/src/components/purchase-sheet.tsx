import { Link2 } from "lucide-react";
import { useGetPurchase, getGetPurchaseQueryKey } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/khata-ui";
import { formatINR, REFETCH } from "@/lib/khata";
import { fmtQty, istDateTime, METHOD_LABEL, STATUS_CLASS, STATUS_LABEL } from "@/lib/purchase";
import { cn } from "@/lib/utils";

export function PurchaseSheet({ id, onOpenChange, onOpenTxn }: { id: string | null; onOpenChange: (o: boolean) => void; onOpenTxn: (txnId: string) => void }) {
  const q = useGetPurchase(id ?? "", { query: { enabled: !!id, queryKey: getGetPurchaseQueryKey(id ?? ""), refetchInterval: REFETCH } });
  const p = q.data;
  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-purchase">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Bill details</SheetTitle>
          <SheetDescription>Recorded by the server. Bills cannot be edited or deleted.</SheetDescription>
        </SheetHeader>
        {q.isLoading && <div className="mt-6 space-y-3"><Skeleton className="h-16" /><Skeleton className="h-40" /></div>}
        {q.isError && <div className="mt-6"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>}
        {p && (
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold" data-testid="text-purchase-customer">{p.customer_name}</p>
                <p className="num text-xs text-muted-foreground" data-testid="text-purchase-time">{istDateTime(p.purchased_at)}</p>
                <p className="text-xs text-muted-foreground">By {p.created_by_name}</p>
              </div>
              <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", STATUS_CLASS[p.payment_status])} data-testid="status-purchase-payment">{STATUS_LABEL[p.payment_status]}</span>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm" data-testid="table-purchase-items">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr><th className="p-2 text-left font-semibold">Item</th><th className="p-2 text-right font-semibold">Qty</th><th className="p-2 text-right font-semibold">Rate</th><th className="p-2 text-right font-semibold">Amount</th></tr>
                </thead>
                <tbody className="divide-y">
                  {[...p.items].sort((a, b) => a.position - b.position).map((it) => (
                    <tr key={it.id} data-testid={`row-purchase-item-${it.id}`}>
                      <td className="p-2">{it.product_name}{!it.product_id && <span className="ml-1 text-[10px] uppercase text-muted-foreground">custom</span>}</td>
                      <td className="num p-2 text-right whitespace-nowrap">{fmtQty(it.quantity)} {it.unit}</td>
                      <td className="num p-2 text-right whitespace-nowrap">{formatINR(it.unit_price)}</td>
                      <td className="num p-2 text-right font-semibold whitespace-nowrap">{formatINR(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t bg-muted/30"><td colSpan={3} className="p-2 font-semibold">Total</td><td className="num p-2 text-right text-base font-bold" data-testid="text-purchase-total">{formatINR(p.total)}</td></tr></tfoot>
              </table>
            </div>
            <dl className="divide-y rounded-md border">
              <div className="flex justify-between p-2.5"><dt className="text-muted-foreground">Payment</dt><dd className="font-semibold" data-testid="text-purchase-method">{METHOD_LABEL[p.payment_method]}</dd></div>
              {p.notes && <div className="flex justify-between gap-4 p-2.5"><dt className="text-muted-foreground">Note</dt><dd className="text-right">{p.notes}</dd></div>}
              <div className="p-2.5 text-xs text-muted-foreground">Bill ID <span className="num">{p.id}</span></div>
            </dl>
            <p className="rounded-md bg-accent/50 p-3 text-xs leading-relaxed text-accent-foreground">
              {p.payment_status === "paid" && "Paid in full at the time of sale. This did not change the customer's Khata balance."}
              {p.payment_status === "on_account" && "This bill was posted to Khata as one Udhar entry. That is the original posting, not a current unpaid amount: repayments are recorded in the Khata ledger and are not allocated to individual bills."}
              {p.payment_status === "credit_reversed" && "The Khata credit posted for this bill was later reversed in the ledger. This is a ledger correction, not a refund record. The bill itself is kept for history."}
            </p>
            <div className="flex flex-wrap gap-2">
              {p.credit_transaction_id && <Button variant="outline" size="sm" onClick={() => onOpenTxn(p.credit_transaction_id!)} data-testid="button-open-purchase-credit"><Link2 className="mr-1.5 h-4 w-4" />Open Khata entry</Button>}
              {p.credit_reversal_id && <Button variant="outline" size="sm" onClick={() => onOpenTxn(p.credit_reversal_id!)} data-testid="button-open-purchase-reversal"><Link2 className="mr-1.5 h-4 w-4" />Open reversal</Button>}
            </div>
            {p.credit_transaction_id && p.payment_status === "on_account" && <p className="text-xs text-muted-foreground">To correct a wrong Khata bill, open the Khata entry and reverse it there.</p>}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
