import { useEffect, useState } from "react";
import { ArrowUpRight, ReceiptText, Search } from "lucide-react";
import {
  useListTransactions, getListTransactionsQueryKey, useListCustomers, getListCustomersQueryKey,
  type ListTransactionsParams, type ListTransactionsTransactionType,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, PageHeader, Panel, RowsSkeleton } from "@/components/khata-ui";
import { TransactionSheet } from "@/components/transaction-sheet";
import { EntryDialog } from "@/components/entry-dialog";
import { TxnList } from "@/components/txn-list";
import { REFETCH } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";

const PAGE = 50;

export default function Transactions() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [type, setType] = useState<"all" | ListTransactionsTransactionType>("all");
  const [cust, setCust] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [txn, setTxn] = useState<string | null>(null);
  const [entry, setEntry] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  useEffect(() => setPage(0), [debounced, type, cust, from, to]);

  const params: ListTransactionsParams = {
    search: debounced || undefined, transaction_type: type === "all" ? undefined : type,
    customer_id: cust === "all" ? undefined : cust, date_from: from || undefined, date_to: to || undefined, limit: PAGE + 1, offset: page * PAGE,
  };
  const q = useListTransactions(params, { query: { queryKey: getListTransactionsQueryKey(params), refetchInterval: REFETCH } });
  const customers = useListCustomers(undefined, { query: { queryKey: getListCustomersQueryKey(), refetchInterval: REFETCH } });
  const filtered = !!(debounced || type !== "all" || cust !== "all" || from || to);
  const rows = q.data?.slice(0, PAGE) ?? [];
  const hasMore = (q.data?.length ?? 0) > PAGE;

  return (
    <>
      <PageHeader eyebrow={t("navTransactions")} title={t("transactionsTitle")}>
        <Button onClick={() => setEntry(true)} disabled={!customers.data?.length} data-testid="button-new-entry">
          <ArrowUpRight className="h-4 w-4 mr-1.5" />{t("btnGiveCredit")}
        </Button>
      </PageHeader>
      <Panel className="mb-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_150px_150px]">
        <div className="space-y-1">
          <Label htmlFor="txn-search" className="text-xs text-muted-foreground">{t("search")}</Label>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="txn-search" type="search" className="pl-9" placeholder={t("customerName")} value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-transactions" /></div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="txn-customer" className="text-xs text-muted-foreground">{t("customerCol")}</Label>
          <Select value={cust} onValueChange={setCust}>
            <SelectTrigger id="txn-customer" data-testid="select-customer"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">{t("allCustomers")}</SelectItem>{customers.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="txn-type" className="text-xs text-muted-foreground">{t("typeCol")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger id="txn-type" data-testid="select-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              <SelectItem value="credit">{t("udhar")}</SelectItem>
              <SelectItem value="payment">{t("jama")}</SelectItem>
              <SelectItem value="reversal">{t("reversal")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="txn-from" className="text-xs text-muted-foreground">{t("date")} {t("all").toLowerCase()} ({t("date")} ↑)</Label>
          <Input id="txn-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} data-testid="input-date-from" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="txn-to" className="text-xs text-muted-foreground">{t("date")} (↓)</Label>
          <Input id="txn-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} data-testid="input-date-to" />
        </div>
      </Panel>
      {q.isLoading && <RowsSkeleton rows={8} />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && rows.length === 0 && (filtered ? (
        <EmptyState icon={<Search className="h-5 w-5" />} title={t("noTransactionsFound")} body="">
          <Button variant="outline" onClick={() => { setSearch(""); setType("all"); setCust("all"); setFrom(""); setTo(""); }} data-testid="button-clear-filters">{t("filter")} ×</Button>
        </EmptyState>
      ) : (
        <EmptyState icon={<ReceiptText className="h-5 w-5" />} title={t("noEntriesYet")} body="">
          {customers.data?.length ? <Button onClick={() => setEntry(true)}>{t("btnGiveCredit")}</Button> : <p className="text-sm text-muted-foreground">{t("addFirstCustomer")}</p>}
        </EmptyState>
      ))}
      {rows.length > 0 && (
        <Panel>
          <TxnList items={rows} onOpen={setTxn} />
          <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
            <span className="text-xs text-muted-foreground">{page * PAGE + 1}–{page * PAGE + rows.length}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)} data-testid="button-prev-page">{t("back")}</Button>
              <Button size="sm" variant="outline" disabled={!hasMore} onClick={() => setPage((p) => p + 1)} data-testid="button-next-page">{t("viewAll")}</Button>
            </div>
          </div>
        </Panel>
      )}
      <TransactionSheet id={txn} onOpenChange={(o) => !o && setTxn(null)} onNavigate={setTxn} />
      <EntryDialog open={entry} kind="credit" onOpenChange={setEntry} />
    </>
  );
}
