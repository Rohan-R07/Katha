import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, ReceiptText, UserPlus, Sparkles } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { useGetSummary, getGetSummaryQueryKey, type AuthSession } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BalanceTag, EmptyState, ErrorState, Monogram, PageHeader, Panel } from "@/components/khata-ui";
import { GnaniVoiceAssistant } from "@/components/gnani-voice-assistant";
import { EntryDialog, type EntryKind } from "@/components/entry-dialog";
import { CustomerDialog } from "@/components/customer-dialog";
import { TransactionSheet } from "@/components/transaction-sheet";
import { TxnList } from "@/components/txn-list";
import { HandwrittenKhataDialog } from "@/components/handwritten-khata-dialog";
import { formatINR, num, REFETCH } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";

export default function Overview({ session }: { session: AuthSession }) {
  const q = useGetSummary({ query: { queryKey: getGetSummaryQueryKey(), refetchInterval: REFETCH } });
  const { t } = useI18n();
  const [entry, setEntry] = useState<EntryKind | null>(null);
  const [addCust, setAddCust] = useState(false);
  const [openHandwritten, setOpenHandwritten] = useState(false);
  const [txn, setTxn] = useState<string | null>(null);
  const s = q.data;

  const actions = (
    <>
      <Button variant="outline" onClick={() => setOpenHandwritten(true)}
        className="border-primary/40 hover:bg-primary/5 text-primary font-semibold"
        data-testid="button-upload-handwritten-khata">
        <Sparkles className="h-4 w-4 mr-1.5 text-primary" />{t("btnUploadHandwritten")}
      </Button>
      <GnaniVoiceAssistant session={session} />
      <Button variant="outline" onClick={() => setAddCust(true)} data-testid="button-add-customer">
        <UserPlus className="h-4 w-4 mr-1.5" />{t("btnAddCustomer")}
      </Button>
      <Button variant="outline" onClick={() => setEntry("payment")} disabled={!s?.total_customers} data-testid="button-record-payment">
        <ArrowDownLeft className="h-4 w-4 mr-1.5 text-payment" />{t("btnRecordPayment")}
      </Button>
      <Button onClick={() => setEntry("credit")} disabled={!s?.total_customers} data-testid="button-give-credit">
        <ArrowUpRight className="h-4 w-4 mr-1.5" />{t("btnGiveCredit")}
      </Button>
    </>
  );

  return (
    <>
      <PageHeader eyebrow={s ? format(new Date(s.business_date), "EEEE, d MMMM yyyy") : t("today")} title={session.shop?.shop_name ?? t("overviewTitle")}>{actions}</PageHeader>
      {q.isLoading && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}<Skeleton className="h-64 sm:col-span-2 lg:col-span-4" /></div>}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {s && s.total_customers === 0 && (
        <EmptyState icon={<UserPlus className="h-5 w-5" />} title={t("emptyKhataTitle")} body={t("emptyKhataBody")}>
          <Button onClick={() => setAddCust(true)} data-testid="button-empty-add-customer">
            <UserPlus className="h-4 w-4 mr-1.5" />{t("addFirstCustomer")}
          </Button>
        </EmptyState>
      )}
      {s && s.total_customers > 0 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-lg border bg-border">
            <div className="col-span-2 lg:col-span-1 bg-primary text-primary-foreground p-4 sm:p-5">
              <p className="text-xs uppercase tracking-wider opacity-80 font-semibold">{t("toCollect")}</p>
              <p className="num mt-2 text-2xl sm:text-3xl font-semibold" data-testid="text-total-outstanding">{formatINR(s.total_outstanding)}</p>
              <p className="mt-1 text-xs opacity-80">{s.total_customers} {t("customersOnBooks")}</p>
            </div>
            <Stat label={t("todayCredit")} value={formatINR(s.today_credit)} tone="text-credit" sub={`${s.today_transactions} ${t("entriesToday")}`} />
            <Stat label={t("todayPayments")} value={formatINR(s.today_payments)} tone="text-payment" sub={`${t("totalPayments")} ${formatINR(s.total_payments)}`} />
            <Stat label={t("totalAdvance")} value={formatINR(s.total_advance)} tone="text-advance" sub={`${t("totalCredit")} ${formatINR(s.total_credit)}`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Panel>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-display font-bold">{t("recentEntries")}</h2>
                <Link href="/transactions" className="text-sm text-primary font-medium hover:underline underline-offset-4" data-testid="link-all-transactions">{t("allEntries")}</Link>
              </div>
              {s.recent_transactions.length ? <TxnList items={s.recent_transactions} onOpen={setTxn} /> : (
                <div className="p-8 text-center text-sm text-muted-foreground"><ReceiptText className="mx-auto mb-2 h-5 w-5" />{t("noEntriesYet")}</div>
              )}
            </Panel>
            <div className="space-y-5">
              <Panel>
                <div className="border-b px-4 py-3"><h2 className="font-display font-bold">{t("highestDues")}</h2></div>
                {s.top_customers.length ? (
                  <ul className="divide-y">
                    {s.top_customers.map((c) => (
                      <li key={c.id}>
                        <Link href={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50" data-testid={`link-top-customer-${c.id}`}>
                          <Monogram name={c.customer_name} />
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{c.customer_name}</p><p className="text-xs text-muted-foreground">{c.mobile_number || "—"}</p></div>
                          <BalanceTag value={c.balance} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <p className="p-6 text-sm text-muted-foreground text-center">{t("nobodyOwesYou")}</p>}
              </Panel>
              {s.daily_activity.length > 0 && (
                <Panel className="p-4">
                  <h2 className="font-display font-bold">{t("recentDays")}</h2>
                  <p className="text-xs text-muted-foreground mb-3"><span className="text-credit font-semibold">{t("udhar")}</span> vs <span className="text-payment font-semibold">{t("todayPayments")}</span></p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={s.daily_activity.map((d) => ({ d: format(new Date(d.date), "dd MMM"), credit: num(d.credit), payments: num(d.payments) }))}>
                        <XAxis dataKey="d" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(v: number) => formatINR(v)} cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="credit" name={t("udhar")} fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="payments" name={t("todayPayments")} fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        </div>
      )}
      <EntryDialog open={!!entry} kind={entry ?? "credit"} onOpenChange={(o) => !o && setEntry(null)} />
      <CustomerDialog open={addCust} onOpenChange={setAddCust} />
      <TransactionSheet id={txn} onOpenChange={(o) => !o && setTxn(null)} onNavigate={setTxn} />
      <HandwrittenKhataDialog open={openHandwritten} onOpenChange={setOpenHandwritten} />
    </>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`num mt-2 text-lg sm:text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground truncate">{sub}</p>
    </div>
  );
}
