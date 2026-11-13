import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useCreateCustomer, useUpdateCustomer, type Customer } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AMOUNT_RE, errorMessage, useIdempotencyKey, useInvalidateLedger } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";

export function CustomerDialog({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (o: boolean) => void; customer?: Customer }) {
  const editing = !!customer;
  const { t } = useI18n();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const invalidate = useInvalidateLedger();
  const [key, rotateKey] = useIdempotencyKey();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const pending = create.isPending || update.isPending;
  const [f, setF] = useState({ name: "", mobile: "", address: "", notes: "", opening: "0" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setF({ name: customer?.customer_name ?? "", mobile: customer?.mobile_number ?? "", address: customer?.address ?? "", notes: customer?.notes ?? "", opening: "0" });
      setErrs({}); setErr(null);
    }
  }, [open, customer]);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (f.mobile.trim() && !/^\+?[0-9]{10,13}$/.test(f.mobile.trim())) e.mobile = "10 to 13 digits, optional leading +";
    const op = f.opening.trim() || "0";
    if (!editing && !AMOUNT_RE.test(op)) e.opening = "Non-negative amount, up to 2 decimals";
    setErrs(e);
    if (Object.keys(e).length) return;
    const base = { customer_name: f.name.trim(), mobile_number: f.mobile.trim() || undefined, address: f.address.trim() || undefined, notes: f.notes.trim() || undefined };
    if (editing) {
      update.mutate({ customerId: customer.id, data: base }, {
        onSuccess: () => { invalidate(); toast({ title: t("success") }); onOpenChange(false); },
        onError: (x) => setErr(errorMessage(x)),
      });
    } else {
      create.mutate({ data: { ...base, opening_balance: op, idempotency_key: key } }, {
        onSuccess: (c) => { rotateKey(); invalidate(); toast({ title: t("success"), description: c.customer_name }); onOpenChange(false); navigate(`/customers/${c.id}`); },
        onError: (x) => setErr(errorMessage(x)),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{editing ? t("editCustomerDialogTitle") : t("addCustomerDialogTitle")}</DialogTitle>
          <DialogDescription>{editing ? t("balance") : t("openingBalanceHelp")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-name">{t("customerName")}</Label>
            <Input id="c-name" autoFocus maxLength={150} value={f.name} onChange={set("name")} data-testid="input-customer-name" />
            {errs.name && <p className="text-xs text-destructive">{errs.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-mobile">{t("mobileNumber")}</Label>
            <Input id="c-mobile" inputMode="tel" value={f.mobile} onChange={set("mobile")} data-testid="input-customer-mobile" />
            {errs.mobile && <p className="text-xs text-destructive">{errs.mobile}</p>}
          </div>
          {!editing && (
            <div className="space-y-1.5">
              <Label htmlFor="c-opening">{t("openingBalanceLabel")}</Label>
              <Input id="c-opening" inputMode="decimal" className="num" value={f.opening} onChange={(e) => setF((s) => ({ ...s, opening: e.target.value }))} data-testid="input-opening-balance" />
              {errs.opening ? <p className="text-xs text-destructive">{errs.opening}</p> : <p className="text-xs text-muted-foreground">{t("openingBalanceHelp")}</p>}
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-address">{t("address")}</Label>
            <Input id="c-address" value={f.address} onChange={set("address")} data-testid="input-customer-address" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-notes">{t("notes")}</Label>
            <Textarea id="c-notes" rows={2} value={f.notes} onChange={set("notes")} data-testid="input-customer-notes" />
          </div>
          {err && <p className="text-sm text-destructive sm:col-span-2" role="alert">{err}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>{t("cancel")}</Button>
            <Button type="submit" disabled={pending} data-testid="button-save-customer">
              {pending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{editing ? t("save") : t("btnAddCustomer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
