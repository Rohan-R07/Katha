import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import {
  useCreateTransaction, useRecordPayment, useListCustomers, getListCustomersQueryKey, type Customer,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { absINR, addMoney, balanceKind, errorMessage, formatINR, useIdempotencyKey, useInvalidateLedger, validAmount } from "@/lib/khata";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type EntryKind = "credit" | "payment";

export function EntryDialog({ open, onOpenChange, kind, customer }: {
  open: boolean; onOpenChange: (o: boolean) => void; kind: EntryKind; customer?: Customer;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const invalidate = useInvalidateLedger();
  const [key, rotateKey] = useIdempotencyKey();
  const [customerId, setCustomerId] = useState(customer?.id ?? "");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [err, setErr] = useState<string | null>(null);
  const credit = useCreateTransaction();
  const payment = useRecordPayment();
  const pending = credit.isPending || payment.isPending;

  const list = useListCustomers(undefined, { query: { enabled: open && !customer, queryKey: getListCustomersQueryKey() } });

  useEffect(() => {
    if (open) { setCustomerId(customer?.id ?? ""); setStep("form"); setErr(null); }
  }, [open, customer?.id]);

  const selected = customer ?? list.data?.find((c) => c.id === customerId);
  const amtErr = amount ? validAmount(amount) : null;
  const isCredit = kind === "credit";
  const after = selected && !validAmount(amount) ? addMoney(selected.balance, `${isCredit ? "" : "-"}${amount.trim()}`) : null;

  const reset = () => { setAmount(""); setDesc(""); setStep("form"); setErr(null); };

  const proceed = () => {
    const v = validAmount(amount);
    if (!customerId) return setErr("Choose a customer");
    if (v) return setErr(v);
    setErr(null); setStep("confirm");
  };

  const commit = () => {
    const amt = amount.trim();
    const description = desc.trim() || undefined;
    const handlers = {
      onSuccess: () => {
        rotateKey(); invalidate();
        toast({ title: isCredit ? t("udhar") : t("jama"), description: `${formatINR(amt)} for ${selected?.customer_name ?? "customer"}` });
        reset(); onOpenChange(false);
      },
      onError: (e: unknown) => setErr(errorMessage(e)),
    };
    if (isCredit) credit.mutate({ data: { customer_id: customerId, transaction_type: "credit", amount: amt, description, idempotency_key: key } }, handlers);
    else payment.mutate({ data: { customer_id: customerId, amount: amt, description, idempotency_key: key } }, handlers);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        <div className={cn("h-1.5", isCredit ? "bg-primary" : "bg-[hsl(168_58%_30%)]")} />
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              {isCredit ? <ArrowUpRight className="h-5 w-5 text-credit" /> : <ArrowDownLeft className="h-5 w-5 text-payment" />}
              {step === "confirm" ? t("confirm") : isCredit ? t("quickUdhar") : t("quickPayment")}
            </DialogTitle>
            <DialogDescription>
              {isCredit ? t("recordUdharTitle") : t("recordPaymentTitle")}
            </DialogDescription>
          </DialogHeader>

          {step === "form" ? (
            <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); proceed(); }}>
              {customer ? (
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm flex justify-between">
                  <span className="font-semibold">{customer.customer_name}</span>
                  <span className="num text-muted-foreground">{balanceKind(customer.balance) === "advance" ? "Adv " : "Due "}{absINR(customer.balance)}</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="entry-customer">{t("selectCustomerLabel")}</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger id="entry-customer" data-testid="select-entry-customer">
                      <SelectValue placeholder={list.isLoading ? t("loading") : t("selectCustomerLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {list.data?.length === 0 && <div className="p-2 text-sm text-muted-foreground">{t("noCustomersYet")}</div>}
                      {list.data?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.customer_name}{c.mobile_number ? ` · ${c.mobile_number}` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="entry-amount">{t("amountLabel")}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground num">Rs</span>
                  <Input id="entry-amount" autoFocus inputMode="decimal" autoComplete="off" placeholder="0.00" className="pl-10 num text-lg h-12"
                    value={amount} onChange={(e) => setAmount(e.target.value)}
                    aria-invalid={!!amtErr} data-testid="input-amount" />
                </div>
                {amtErr && <p className="text-xs text-destructive">{amtErr}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entry-desc">{t("notes")} <span className="text-muted-foreground font-normal">({t("optional")})</span></Label>
                <Textarea id="entry-desc" rows={2} maxLength={500} placeholder={isCredit ? "e.g. 5kg atta, 1L oil" : "e.g. Cash / UPI"} value={desc} onChange={(e) => setDesc(e.target.value)} data-testid="input-description" />
              </div>
              {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
                <Button type="submit" data-testid="button-review-entry">{t("details")}</Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="mt-5 space-y-4">
              <dl className="rounded-md border divide-y text-sm">
                <div className="flex justify-between p-3"><dt className="text-muted-foreground">{t("customerName")}</dt><dd className="font-semibold">{selected?.customer_name}</dd></div>
                <div className="flex justify-between p-3"><dt className="text-muted-foreground">{isCredit ? t("udhar") : t("jama")}</dt><dd className={cn("num text-lg font-bold", isCredit ? "text-credit" : "text-payment")}>{formatINR(amount)}</dd></div>
                {desc.trim() && <div className="flex justify-between gap-4 p-3"><dt className="text-muted-foreground">{t("notes")}</dt><dd className="text-right">{desc.trim()}</dd></div>}
                {selected && after !== null && (
                  <div className="flex justify-between p-3 bg-muted/40"><dt className="text-muted-foreground">{t("balance")}</dt>
                    <dd className="num font-semibold">{absINR(after)} <span className="text-xs text-muted-foreground">{balanceKind(after) === "outstanding" ? t("toCollect") : balanceKind(after)}</span></dd></div>
                )}
              </dl>
              {err && <p className="text-sm text-destructive" role="alert">{err} Retrying is safe; it will not create a duplicate.</p>}
              <DialogFooter>
                <Button variant="ghost" disabled={pending} onClick={() => setStep("form")}>{t("back")}</Button>
                <Button onClick={commit} disabled={pending} data-testid="button-confirm-entry" className={cn(!isCredit && "bg-[hsl(168_58%_30%)] hover:bg-[hsl(168_58%_26%)]")}>
                  {pending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{err ? t("retry") : t("confirmAndSave")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
