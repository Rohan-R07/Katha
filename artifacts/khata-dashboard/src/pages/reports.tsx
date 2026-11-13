import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useGetDailyReport, getGetDailyReportQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, PageHeader, Panel } from "@/components/khata-ui";
import { TransactionSheet } from "@/components/transaction-sheet";
import { TxnList } from "@/components/txn-list";
import { addMoney, businessDate, formatINR, paise, REFETCH } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";

export default function Reports() {
  const { t } = useI18n();
  const today = businessDate();
  const [date, setDate] = useState(today);
  const [txn, setTxn] = useState<string | null>(null);
  const params = { date };
  const q = useGetDailyReport(params, { query: { queryKey: getGetDailyReportQueryKey(params), refetchInterval: REFETCH } });
  const r = q.data;
  const shift = (n: number) => setDate(format(addDays(parseISO(date), n), "yyyy-MM-dd"));
  const net = r ? addMoney(r.total_credit, `-${r.total_payments}`, r.reversal_net) : "0.00";

  return (
    <>
      <PageHeader eyebrow={t("navDailyReport")} title={format(parseISO(date), "EEEE, d MMM yyyy")}>
        <div className="flex items-end gap-1.5">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label={t("back")} data-testid="button-prev-day"><ChevronLeft className="h-4 w-4" /></Button>
          <div><Label htmlFor="report-date" className="sr-only">{t("selectDate")}</Label>
            <Input id="report-date" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-[160px]" data-testid="input-report-date" /></div>
          <Button variant="outline" size="icon" onClick={() => shift(1)} disabled={date >= today} aria-label="Next day" data-testid="button-next-day"><ChevronRight className="h-4 w-4" /></Button>
          {date !== today && <Button variant="ghost" onClick={() => setDate(today)}>{t("today")}</Button>}
        </div>
      </PageHeader>
      {q.isLoading && <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {r && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-lg border bg-border">
            {[
              [t("udhar"), formatINR(r.total_credit), "text-credit"],
              [t("todayPayments"), formatINR(r.total_payments), "text-payment"],
              [t("reversal"), formatINR(r.reversal_net), ""],
              [t("netCashFlow"), (paise(net) > 0n ? "+" : "") + formatINR(net), paise(net) > 0n ? "text-credit" : paise(net) < 0n ? "text-payment" : ""],
            ].map(([l, v, t]) => (
              <div key={l} className="bg-card p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{l}</p><p className={`num mt-1.5 text-xl font-semibold ${t}`}>{v}</p></div>
            ))}
          </div>
          <Panel className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 text-sm">
            {[
              [t("entriesToday"), String(r.transaction_count)],
              [t("customersOnBooks"), `${r.active_customers} of ${r.customer_count}`],
              [t("totalOutstanding"), formatINR(r.total_outstanding)],
              [t("totalAdvance"), formatINR(r.total_advance)],
            ].map(([l, v]) => <div key={l} className="p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="num font-semibold">{v}</p></div>)}
          </Panel>
          <div data-testid="panel-sales-summary"><Panel>
            <div className="border-b px-4 py-3"><p className="font-display font-bold">{t("customerBreakdown")}</p></div>
            {r.purchase_count === undefined ? <p className="p-4 text-sm text-muted-foreground" data-testid="text-sales-unavailable">{t("noActivityDate")}</p> : (
              <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 text-sm">
                {[
                  [t("entriesToday"), String(r.purchase_count), "sales-count"],
                  [t("totalCredit"), formatINR(r.purchase_total ?? "0.00"), "sales-total"],
                  ["Cash", formatINR(r.cash_sales ?? "0.00"), "sales-cash"],
                  ["UPI", formatINR(r.upi_sales ?? "0.00"), "sales-upi"],
                  [t("jama"), formatINR(r.khata_sales ?? "0.00"), "sales-khata"],
                ].map(([l, v, id]) => <div key={l} className="p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="num font-semibold" data-testid={`text-${id}`}>{v}</p></div>)}
              </div>
            )}
          </Panel></div>
          {r.transactions.length === 0 ? (
            <EmptyState icon={<CalendarDays className="h-5 w-5" />} title={t("noActivityDate")} body={t("noEntriesYet")} />
          ) : <Panel><div className="border-b px-4 py-3 font-display font-bold">{t("recentEntries")}</div><TxnList items={r.transactions} onOpen={setTxn} /></Panel>}
        </div>
      )}
      <TransactionSheet id={txn} onOpenChange={(o) => !o && setTxn(null)} onNavigate={setTxn} />
    </>
  );
}
