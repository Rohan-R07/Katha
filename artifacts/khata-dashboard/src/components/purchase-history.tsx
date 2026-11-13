import { useState } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  Filter,
  ShoppingBag,
} from "lucide-react";
import { useListPurchases, getListPurchasesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/khata-ui";
import { formatINR, REFETCH } from "@/lib/khata";
import { PAGE_SIZE } from "@/lib/purchase";
import { KiranaProductRowIcons } from "@/components/kirana-theme";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function formatKiranaDateTime(iso: string, language: string = "en") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = language === "kn" ? "kn-IN" : language === "hi" ? "hi-IN" : "en-IN";
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function PurchaseHistory({
  customerId,
  customerName = "Customer",
  onOpen,
  onNew,
}: {
  customerId: string;
  customerName?: string;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const { t, language } = useI18n();
  const [filterMode, setFilterMode] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });
  const [page, setPage] = useState(0);

  // Quick preset filter handling
  const handleFilterPreset = (val: string) => {
    setFilterMode(val);
    setPage(0);
    const today = new Date();
    const fmtDate = (d: Date) => d.toISOString().split("T")[0];

    if (val === "today") {
      const todayStr = fmtDate(today);
      setFrom(todayStr);
      setTo(todayStr);
      setApplied({ from: todayStr, to: todayStr });
    } else if (val === "week") {
      const past = new Date(today.getTime() - 7 * 86400000);
      const fromStr = fmtDate(past);
      const toStr = fmtDate(today);
      setFrom(fromStr);
      setTo(toStr);
      setApplied({ from: fromStr, to: toStr });
    } else if (val === "month") {
      const past = new Date(today.getTime() - 30 * 86400000);
      const fromStr = fmtDate(past);
      const toStr = fmtDate(today);
      setFrom(fromStr);
      setTo(toStr);
      setApplied({ from: fromStr, to: toStr });
    } else {
      // all
      setFrom("");
      setTo("");
      setApplied({ from: "", to: "" });
    }
  };

  const params = {
    customer_id: customerId,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    ...(applied.from ? { date_from: applied.from } : {}),
    ...(applied.to ? { date_to: applied.to } : {}),
  };

  const q = useListPurchases(params, {
    query: {
      queryKey: getListPurchasesQueryKey(params),
      refetchInterval: REFETCH,
    },
  });

  const total = q.data?.total_count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeBad = !!from && !!to && from > to;

  return (
    <section aria-labelledby="purchases-h" className="py-2">
      {/* Section Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fef3c7] to-[#fde68a] border border-amber-300 shadow-sm text-2xl">
            🛍️
          </div>
          <div>
            <h2 id="purchases-h" className="text-xl font-extrabold text-stone-900 tracking-tight">
              {t("purchaseHistoryHeading")}
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              {t("purchaseHistorySubtitle")}
            </p>
          </div>
        </div>

        {/* Date Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Select value={filterMode} onValueChange={handleFilterPreset}>
            <SelectTrigger className="h-9 w-[140px] rounded-xl bg-white border-stone-300 text-xs font-semibold text-stone-700 shadow-2xs">
              <div className="flex items-center gap-1.5 truncate">
                <Calendar className="h-3.5 w-3.5 text-stone-500" />
                <SelectValue placeholder={t("filterAllTime")} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllTime")}</SelectItem>
              <SelectItem value="today">{t("filterToday")}</SelectItem>
              <SelectItem value="week">{t("filterThisWeek")}</SelectItem>
              <SelectItem value="month">{t("filterThisMonth")}</SelectItem>
              <SelectItem value="custom">{t("filterCustomRange")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Range selector (when custom filter is active) */}
      {filterMode === "custom" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 p-3 bg-stone-50 rounded-xl border border-stone-200">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="pf" className="text-xs font-medium text-stone-600">From:</Label>
            <Input
              id="pf"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-[140px] text-xs bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="pt" className="text-xs font-medium text-stone-600">To:</Label>
            <Input
              id="pt"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-[140px] text-xs bg-white"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs"
            disabled={rangeBad}
            onClick={() => { setApplied({ from, to }); setPage(0); }}
          >
            Apply
          </Button>
          {(applied.from || applied.to) && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs text-stone-500"
              onClick={() => { setFrom(""); setTo(""); setApplied({ from: "", to: "" }); }}
            >
              Reset
            </Button>
          )}
        </div>
      )}

      {/* Main Table / Rows */}
      {q.isLoading ? (
        <RowsSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.purchases.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6 text-amber-600" />}
          title={applied.from || applied.to ? "No bills in this date range" : "No itemized bills yet"}
          body="Record what the customer bought item by item to track purchase history."
        >
          <Button onClick={onNew} className="bg-[#15803d] hover:bg-[#166534] text-white">
            Add Purchase
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-[200px_1fr_100px_120px_130px_36px] items-center gap-3 bg-[#fbf8f3] px-5 py-3 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider select-none">
            <span>{t("colDateTime")}</span>
            <span>{t("colProductsPurchased")}</span>
            <span>{t("colQuantity")}</span>
            <span>{t("colAmount")}</span>
            <span>{t("colType")}</span>
            <span></span>
          </div>

          {/* Table Body Rows */}
          <ul className="divide-y divide-stone-100" data-testid="list-purchases">
            {q.data.purchases.map((p) => {
              const formattedDate = formatKiranaDateTime(p.purchased_at, language);
              const itemsSummary = p.items
                .map((i) => `${i.product_name}${i.quantity && i.quantity !== "1" ? ` (${i.quantity} ${i.unit || ""})`.trim() : ""}`)
                .join(", ");
              const itemCount = p.items.length;
              const isCredit = p.payment_method === "khata" || p.payment_status === "on_account";

              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(p.id)}
                    className="w-full text-left p-4 md:px-5 md:py-3.5 hover:bg-[#fffdfa] transition-colors focus-visible:bg-[#fffdfa] focus-visible:outline-none flex flex-col md:grid md:grid-cols-[200px_1fr_100px_120px_130px_36px] md:items-center gap-2 md:gap-3"
                    data-testid={`row-purchase-${p.id}`}
                  >
                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-stone-700 text-xs font-medium">
                      <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                      <span className="whitespace-nowrap">{formattedDate}</span>
                    </div>

                    {/* Products Purchased with Mini Icons */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <KiranaProductRowIcons items={p.items} />
                      <span className="truncate text-xs font-semibold text-stone-900" title={itemsSummary}>
                        {itemsSummary}
                      </span>
                    </div>

                    {/* Quantity */}
                    <div className="text-xs text-stone-600 font-medium">
                      <span className="md:hidden text-stone-400">Qty: </span>
                      {itemCount} {itemCount === 1 ? t("itemSingle") : t("itemsCount")}
                    </div>

                    {/* Amount */}
                    <div className="text-sm font-extrabold text-stone-900 tracking-tight">
                      {formatINR(p.total)}
                    </div>

                    {/* Type pill */}
                    <div>
                      {isCredit ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fee2e2] text-[#dc2626] border border-[#fecaca]">
                          {t("typeCreditUdhar")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                          Paid ({p.payment_method.toUpperCase()})
                        </span>
                      )}
                    </div>

                    {/* Arrow chevron */}
                    <div className="hidden md:flex justify-end text-stone-400">
                      <ChevronRightIcon className="h-4 w-4" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Pagination Controls */}
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-stone-200 px-5 py-3 text-xs bg-[#fbf8f3]">
              <span className="text-stone-500 font-medium" data-testid="text-purchase-page">
                Page {page + 1} of {pages} ({total} bills)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-white"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  aria-label="Previous page"
                  data-testid="button-purchase-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-white"
                  disabled={page + 1 >= pages}
                  onClick={() => setPage(page + 1)}
                  aria-label="Next page"
                  data-testid="button-purchase-next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
