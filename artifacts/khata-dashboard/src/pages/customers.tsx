import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Search, UserPlus, Users } from "lucide-react";
import { useListCustomers, getListCustomersQueryKey, type ListCustomersBalanceStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BalanceTag, EmptyState, ErrorState, Monogram, PageHeader, Panel, RowsSkeleton } from "@/components/khata-ui";
import { CustomerDialog } from "@/components/customer-dialog";
import { formatINR, REFETCH } from "@/lib/khata";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function Customers() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<ListCustomersBalanceStatus>("all");
  const [add, setAdd] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(timer); }, [search]);
  const params = { search: debounced || undefined, balance_status: status };
  const q = useListCustomers(params, { query: { queryKey: getListCustomersQueryKey(params), refetchInterval: REFETCH } });
  const filtered = !!debounced || status !== "all";

  const FILTERS: { v: ListCustomersBalanceStatus; lKey: keyof ReturnType<typeof t extends (...args: any) => any ? never : typeof t> }[] = [
    { v: "all", lKey: "allCustomers" as any },
    { v: "outstanding", lKey: "owingOnly" as any },
    { v: "settled", lKey: "settledOnly" as any },
  ];

  return (
    <>
      <PageHeader eyebrow={t("navCustomers")} title={t("customersTitle")}>
        <Button onClick={() => setAdd(true)} data-testid="button-add-customer">
          <UserPlus className="h-4 w-4 mr-1.5" />{t("btnAddCustomer")}
        </Button>
      </PageHeader>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="customer-search" className="sr-only">{t("search")} {t("navCustomers")}</label>
          <Input id="customer-search" type="search" placeholder={t("searchCustomersPlaceholder")} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="input-search-customers" />
        </div>
        <div role="radiogroup" aria-label={t("filter")} className="flex rounded-md border bg-card p-0.5">
          {(["all", "outstanding", "settled"] as ListCustomersBalanceStatus[]).map((v) => {
            const labels: Record<string, string> = {
              all: t("allCustomers"),
              outstanding: t("owingOnly"),
              settled: t("settledOnly"),
            };
            return (
              <button key={v} role="radio" aria-checked={status === v} onClick={() => setStatus(v)} data-testid={`filter-${v}`}
                className={cn("flex-1 rounded px-3 py-1.5 text-sm font-medium whitespace-nowrap", status === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {labels[v]}
              </button>
            );
          })}
        </div>
      </div>
      {q.isLoading && <RowsSkeleton />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.length === 0 && (filtered ? (
        <EmptyState icon={<Search className="h-5 w-5" />} title={t("noCustomersFound")} body="">
          <Button variant="outline" onClick={() => { setSearch(""); setStatus("all"); }}>{t("filter")} ×</Button>
        </EmptyState>
      ) : (
        <EmptyState icon={<Users className="h-5 w-5" />} title={t("noCustomersYet")} body="">
          <Button onClick={() => setAdd(true)}><UserPlus className="h-4 w-4 mr-1.5" />{t("btnAddCustomer")}</Button>
        </EmptyState>
      ))}
      {q.data && q.data.length > 0 && (
        <Panel>
          <div className="hidden sm:grid grid-cols-[1fr_120px_120px_130px] gap-3 border-b px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>{t("customerName")}</span><span className="text-right">{t("udhar")}</span><span className="text-right">{t("jama")}</span><span className="text-right">{t("balance")}</span>
          </div>
          <ul className="divide-y">
            {q.data.map((c) => (
              <li key={c.id}>
                <Link href={`/customers/${c.id}`} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_120px_130px] items-center gap-3 px-4 py-2.5 hover:bg-muted/50" data-testid={`row-customer-${c.id}`}>
                  <span className="flex min-w-0 items-center gap-3"><Monogram name={c.customer_name} />
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{c.customer_name}</span><span className="block truncate text-xs text-muted-foreground">{c.mobile_number || "—"}</span></span>
                  </span>
                  <span className="hidden sm:block text-right num text-sm text-muted-foreground">{formatINR(c.total_credit)}</span>
                  <span className="hidden sm:block text-right num text-sm text-muted-foreground">{formatINR(c.total_payments)}</span>
                  <BalanceTag value={c.balance} className="justify-self-end" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">{q.data.length} {t("navCustomers").toLowerCase()}</p>
        </Panel>
      )}
      <CustomerDialog open={add} onOpenChange={setAdd} />
    </>
  );
}
