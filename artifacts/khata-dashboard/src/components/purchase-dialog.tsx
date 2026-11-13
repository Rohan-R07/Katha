import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  useCreatePurchase, useListProducts, getListProductsQueryKey, useGetMe, getGetMeQueryKey,
  type Customer, type PurchaseInput, type PurchaseInputPaymentMethod,
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { errorMessage, errorStatus, formatINR, useInvalidateLedger } from "@/lib/khata";
import {
  clearStored, draftTotal, emptyDraft, lineError, linePaise, loadStored, METHOD_LABEL, newLine, paiseStr, saveStored,
  storageKey, toPayload, validateDraft, type Draft, type DraftLine,
} from "@/lib/purchase";
import { cn } from "@/lib/utils";

const CUSTOM = "__custom__";
const METHODS: PurchaseInputPaymentMethod[] = ["cash", "upi", "khata"];

export function PurchaseDialog({ open, onOpenChange, customer, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; customer: Customer; onCreated?: (id: string) => void;
}) {
  const { toast } = useToast();
  const invalidate = useInvalidateLedger();
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), staleTime: 60_000 } });
  const sKey = storageKey(me.data?.user.id ?? "anon", customer.id);
  const products = useListProducts(undefined, { query: { enabled: open, queryKey: getListProductsQueryKey() } });
  const create = useCreatePurchase();

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [key, setKey] = useState<string>(() => crypto.randomUUID());
  const [frozen, setFrozen] = useState<PurchaseInput | null>(null);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [err, setErr] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [abandon, setAbandon] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const loadedFor = useRef<string | null>(null);
  const inflight = useRef(false);

  useEffect(() => {
    if (!open) { loadedFor.current = null; return; }
    if (loadedFor.current === sKey) return;
    loadedFor.current = sKey;
    let s;
    try {
      s = loadStored(sKey);
      if (s?.frozen && s.frozen.customer_id !== customer.id) throw new Error("Saved bill belongs to another customer.");
      setStorageReady(true);
    } catch {
      setStorageReady(false);
      setErr("Cannot safely restore this bill draft. Browser session storage is blocked or damaged. Check purchase history before clearing browser storage; no new request has been sent.");
      return;
    }
    if (s) { setDraft(s.draft); setKey(s.key); setFrozen(s.frozen); setStep(s.frozen ? "confirm" : "form"); setRestored(true); }
    else { setDraft(emptyDraft()); setKey(crypto.randomUUID()); setFrozen(null); setStep("form"); setRestored(false); }
    setErr(null); setAbandon(false);
  }, [open, sKey]);

  useEffect(() => {
    if (!open || !storageReady || loadedFor.current !== sKey) return;
    const dirty = frozen || draft.notes || draft.payment_method || draft.lines.some((l) => l.product_name || l.product_id || l.unit_price);
    if (dirty) {
      try { saveStored(sKey, { draft, key, frozen, savedAt: new Date().toISOString() }); }
      catch {
        setStorageReady(false);
        setErr("Browser session storage is unavailable. Enable it before saving so an interrupted request can be retried safely.");
      }
    }
  }, [draft, key, frozen, open, sKey, storageReady]);

  const locked = !!frozen;
  const setLine = (k: string, patch: Partial<DraftLine>) => setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.key === k ? { ...l, ...patch } : l)) }));
  const pick = (k: string, v: string) => {
    if (v === CUSTOM) return setLine(k, { product_id: null, product_name: "" });
    const p = products.data?.find((x) => x.id === v);
    if (p) setLine(k, { product_id: p.id, product_name: p.product_name, unit: p.catalog_details?.unit ?? "piece", unit_price: p.price });
  };
  const total = draftTotal(draft);

  const review = () => {
    if (!storageReady) return;
    const v = validateDraft(draft);
    if (v) return setErr(v);
    setErr(null); setStep("confirm");
  };

  const submit = async () => {
    if (inflight.current || !storageReady) return;
    const payload = frozen ?? toPayload(customer.id, draft, key);
    setFrozen(payload);
    try { saveStored(sKey, { draft, key: payload.idempotency_key, frozen: payload, savedAt: new Date().toISOString() }); }
    catch {
      setStorageReady(false);
      setErr("The retry key could not be saved in browser session storage. Nothing was sent. Enable session storage and reopen this form.");
      return;
    }
    inflight.current = true; setErr(null);
    let result;
    try {
      result = await create.mutateAsync({ data: payload });
    } catch (e) {
      const s = errorStatus(e);
      if (s === 400 || s === 422) {
        // Definite rejection: nothing was saved, editing allowed with a fresh key.
        setFrozen(null); const nk = crypto.randomUUID(); setKey(nk);
        setErr(`${errorMessage(e)} Nothing was saved. Go back to fix it.`);
      } else {
        setErr(`${errorMessage(e)} The bill may or may not have been saved. Retry sends the exact same bill and will not create a duplicate.`);
      }
      inflight.current = false;
      return;
    }
    inflight.current = false;
    const cleared = clearStored(sKey);
    toast({ title: "Purchase recorded", description: `${formatINR(result.total)} · ${METHOD_LABEL[result.payment_method]} · ${customer.customer_name}${cleared ? "" : ". The saved browser draft could not be cleared; retrying it will return this same bill."}` });
    setDraft(emptyDraft()); setKey(crypto.randomUUID()); setFrozen(null); setStep("form"); setRestored(false);
    onOpenChange(false);
    onCreated?.(result.id);
    try { await invalidate(); } catch { /* refresh failure is not a create failure; queries refetch on interval */ }
  };

  const doAbandon = () => {
    if (!clearStored(sKey)) {
      setErr("The browser draft could not be cleared. No new bill was started.");
      return;
    }
    setDraft(emptyDraft()); setKey(crypto.randomUUID()); setFrozen(null); setStep("form"); setErr(null); setAbandon(false); setRestored(false);
    onOpenChange(false);
  };

  const pending = create.isPending;
  const shown = frozen
    ? { lines: frozen.items.map((i, n) => ({ ...draft.lines[n], ...i, product_name: i.product_name ?? draft.lines[n]?.product_name ?? "" })), method: frozen.payment_method, notes: frozen.notes ?? "" }
    : { lines: draft.lines, method: draft.payment_method, notes: draft.notes.trim() };
  const shownTotal = shown.lines.reduce((s, l) => s + (linePaise(l.quantity, l.unit_price) ?? 0n), 0n);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!pending) onOpenChange(o); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 gap-0 sm:max-w-2xl" data-testid="dialog-purchase">
        <div className="h-1.5 bahi-spine" />
        <div className="p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{step === "confirm" ? "Review bill" : "New purchase"}</DialogTitle>
            <DialogDescription>Itemized bill for {customer.customer_name}. Time and totals are set by the server. No tax, discount, stock or split payment.</DialogDescription>
          </DialogHeader>
          {restored && <p className="mt-3 rounded-md bg-accent/60 p-2.5 text-xs text-accent-foreground" data-testid="text-purchase-restored">{locked ? "An earlier submission of this bill was not confirmed. Retry to finish it safely, or abandon it." : "Unsaved draft restored."}</p>}

          {step === "form" ? (
            <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); review(); }}>
              <div className="space-y-3">
                {draft.lines.map((l, i) => {
                  const lp = linePaise(l.quantity, l.unit_price);
                  const le = (l.product_name || l.unit_price) ? lineError(l) : null;
                  return (
                    <fieldset key={l.key} className="rounded-md border p-3" data-testid={`line-${i}`}>
                      <legend className="px-1 text-xs font-semibold text-muted-foreground">Item {i + 1}</legend>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1.2fr_0.7fr_0.8fr_0.9fr_auto] sm:items-end">
                        <div className="col-span-2 sm:col-span-1">
                          <Label htmlFor={`pp-${l.key}`} className="text-xs">Product</Label>
                          <Select value={l.product_id ?? CUSTOM} onValueChange={(v) => pick(l.key, v)}>
                            <SelectTrigger id={`pp-${l.key}`} className="h-10" data-testid={`select-line-product-${i}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={CUSTOM}>Custom item</SelectItem>
                              {products.isLoading && <div className="p-2 text-xs text-muted-foreground">Loading catalog...</div>}
                              {products.isError && <div className="p-2 text-xs text-destructive">Catalog unavailable; use custom items.</div>}
                              {products.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.product_name} · {formatINR(p.price)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Label htmlFor={`pn-${l.key}`} className="text-xs">Name</Label>
                          <Input id={`pn-${l.key}`} className="h-10" maxLength={150} value={l.product_name} disabled={!!l.product_id} placeholder="e.g. Toor dal" onChange={(e) => setLine(l.key, { product_name: e.target.value })} data-testid={`input-line-name-${i}`} />
                        </div>
                        <div>
                          <Label htmlFor={`pq-${l.key}`} className="text-xs">Qty</Label>
                          <Input id={`pq-${l.key}`} className="num h-10" inputMode="decimal" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} data-testid={`input-line-qty-${i}`} />
                        </div>
                        <div>
                          <Label htmlFor={`pu-${l.key}`} className="text-xs">Unit</Label>
                          <Input id={`pu-${l.key}`} className="h-10" maxLength={30} value={l.unit} onChange={(e) => setLine(l.key, { unit: e.target.value })} data-testid={`input-line-unit-${i}`} />
                        </div>
                        <div>
                          <Label htmlFor={`pr-${l.key}`} className="text-xs">Rate (Rs)</Label>
                          <Input id={`pr-${l.key}`} className="num h-10" inputMode="decimal" placeholder="0.00" value={l.unit_price} onChange={(e) => setLine(l.key, { unit_price: e.target.value })} data-testid={`input-line-price-${i}`} />
                        </div>
                        <div className="flex items-end justify-between gap-2 sm:justify-end">
                          <span className="num text-sm font-semibold sm:hidden" aria-live="polite">{lp !== null ? formatINR(paiseStr(lp)) : "—"}</span>
                          <Button type="button" variant="ghost" size="icon" disabled={draft.lines.length === 1} onClick={() => setDraft((d) => ({ ...d, lines: d.lines.filter((x) => x.key !== l.key) }))} aria-label={`Remove item ${i + 1}`} data-testid={`button-remove-line-${i}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex justify-between text-xs">
                        <span className="text-destructive">{le}</span>
                        <span className="num hidden text-muted-foreground sm:inline" data-testid={`text-line-total-${i}`}>{lp !== null ? formatINR(paiseStr(lp)) : "—"}</span>
                      </div>
                    </fieldset>
                  );
                })}
                <Button type="button" variant="outline" size="sm" disabled={draft.lines.length >= 100} onClick={() => setDraft((d) => ({ ...d, lines: [...d.lines, newLine()] }))} data-testid="button-add-line"><Plus className="mr-1 h-4 w-4" />Add item</Button>
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">Payment</legend>
                <div className="grid grid-cols-3 gap-2" role="radiogroup">
                  {METHODS.map((m) => (
                    <button key={m} type="button" role="radio" aria-checked={draft.payment_method === m} onClick={() => setDraft((d) => ({ ...d, payment_method: m }))}
                      className={cn("rounded-md border px-2 py-2.5 text-sm font-semibold transition-colors", draft.payment_method === m ? (m === "khata" ? "border-primary bg-credit-soft text-credit" : "border-[hsl(168_58%_30%)] bg-payment-soft text-payment") : "hover:bg-muted/50")}
                      data-testid={`radio-payment-${m}`}>{METHOD_LABEL[m]}</button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {draft.payment_method === "khata" ? "Adds one Udhar entry for the full bill to the Khata." : draft.payment_method ? "Fully paid now. Existing Udhar stays unchanged; use Receive payment for dues." : "Cash/UPI = paid now in full. Khata = full bill added as Udhar."}
                </p>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="purchase-notes">Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Textarea id="purchase-notes" rows={2} maxLength={1000} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} data-testid="input-purchase-notes" />
              </div>

              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5">
                <span className="text-sm text-muted-foreground">Bill total (preview)</span>
                <span className="num text-xl font-bold" data-testid="text-purchase-preview-total">{total !== null ? formatINR(paiseStr(total)) : "—"}</span>
              </div>
              {err && <p className="text-sm text-destructive" role="alert" data-testid="text-purchase-error">{err}</p>}
              <DialogFooter className="gap-2">
                {restored && <Button type="button" variant="ghost" className="text-destructive" onClick={() => setAbandon(true)} data-testid="button-abandon-purchase">Discard draft</Button>}
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                <Button type="submit" disabled={!storageReady} data-testid="button-review-purchase">Review</Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Amount</th></tr></thead>
                  <tbody className="divide-y">
                    {shown.lines.map((l, i) => (
                      <tr key={i}><td className="p-2">{l.product_name}</td><td className="num p-2 text-right whitespace-nowrap">{l.quantity} {l.unit}</td><td className="num p-2 text-right">{formatINR(l.unit_price)}</td><td className="num p-2 text-right font-semibold">{formatINR(paiseStr(linePaise(l.quantity, l.unit_price) ?? 0n))}</td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t bg-muted/30"><td colSpan={3} className="p-2 font-semibold">Total</td><td className="num p-2 text-right text-base font-bold" data-testid="text-review-total">{formatINR(paiseStr(shownTotal))}</td></tr></tfoot>
                </table>
              </div>
              <dl className="divide-y rounded-md border text-sm">
                <div className="flex justify-between p-2.5"><dt className="text-muted-foreground">Payment</dt><dd className="font-semibold" data-testid="text-review-method">{METHOD_LABEL[shown.method]}</dd></div>
                {shown.notes && <div className="flex justify-between gap-4 p-2.5"><dt className="text-muted-foreground">Note</dt><dd className="text-right">{shown.notes}</dd></div>}
              </dl>
              <p className="text-xs text-muted-foreground">{shown.method === "khata" ? "Saving adds this full amount to the customer's Khata as one Udhar entry." : "Saving records a fully paid sale. The Khata balance does not change."}</p>
              {err && <p className="text-sm text-destructive" role="alert" data-testid="text-purchase-error">{err}</p>}
              <DialogFooter className="gap-2">
                {locked ? (
                  <Button variant="ghost" className="text-destructive" disabled={pending} onClick={() => setAbandon(true)} data-testid="button-abandon-purchase">Abandon</Button>
                ) : (
                  <Button variant="ghost" disabled={pending} onClick={() => { setStep("form"); }} data-testid="button-back-purchase">Back</Button>
                )}
                <Button onClick={submit} disabled={pending} data-testid="button-confirm-purchase">
                  {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}{locked && !pending ? "Retry same bill" : "Confirm and save"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {abandon && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm" role="alertdialog" aria-label="Abandon bill">
              <p className="font-semibold text-destructive">Discard this bill?</p>
              <p className="mt-1 text-xs">{locked ? "It may already have been saved on the server. Check purchase history before entering it again, or you could record it twice." : "Your unsaved items will be lost."}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="destructive" onClick={doAbandon} data-testid="button-confirm-abandon">Discard</Button>
                <Button size="sm" variant="ghost" onClick={() => setAbandon(false)}>Keep</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
