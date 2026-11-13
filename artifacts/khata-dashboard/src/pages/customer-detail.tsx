import { useState } from "react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Pencil,
  Phone,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import {
  useGetCustomerKhata,
  getGetCustomerKhataQueryKey,
  useGetCustomer,
  getGetCustomerQueryKey,
  useListPurchases,
  getListPurchasesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, Panel } from "@/components/khata-ui";
import { EntryDialog, type EntryKind } from "@/components/entry-dialog";
import { CustomerDialog } from "@/components/customer-dialog";
import { TransactionSheet } from "@/components/transaction-sheet";
import { TxnList } from "@/components/txn-list";
import { PurchaseDialog } from "@/components/purchase-dialog";
import { PurchaseHistory } from "@/components/purchase-history";
import { PurchaseSheet } from "@/components/purchase-sheet";
import { absINR, balanceKind, errorStatus, formatINR, REFETCH } from "@/lib/khata";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export default function CustomerDetail() {
  const { t } = useI18n();
  const { id = "" } = useParams<{ id: string }>();
  const k = useGetCustomerKhata(id, {
    query: { enabled: !!id, queryKey: getGetCustomerKhataQueryKey(id), refetchInterval: REFETCH },
  });
  const c = useGetCustomer(id, {
    query: { enabled: !!id, queryKey: getGetCustomerQueryKey(id), refetchInterval: REFETCH },
  });
  const purchasesQuery = useListPurchases(
    { customer_id: id, limit: 100 },
    { query: { enabled: !!id, queryKey: getListPurchasesQueryKey({ customer_id: id, limit: 100 }) } }
  );

  const [activeTab, setActiveTab] = useState<"summary" | "purchases" | "payments" | "transactions">("purchases");
  const [entry, setEntry] = useState<EntryKind | null>(null);
  const [edit, setEdit] = useState(false);
  const [txn, setTxn] = useState<string | null>(null);
  const [buy, setBuy] = useState(false);
  const [bill, setBill] = useState<string | null>(null);

  const customer = c.data ?? k.data?.customer;

  if (k.isLoading || c.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (k.isError || !customer) {
    return errorStatus(k.error) === 404 ? (
      <EmptyState
        icon={<ReceiptText className="h-6 w-6" />}
        title={t("noCustomersFound")}
        body={t("noCustomersYet")}
      >
        <Link
          href="/customers"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t("navCustomers")}
        </Link>
      </EmptyState>
    ) : (
      <ErrorState error={k.error} onRetry={() => k.refetch()} />
    );
  }

  const txns = k.data?.transactions ?? [];
  const paymentTxns = txns.filter((t) => t.type === "payment");
  const kind = balanceKind(customer.balance);

  // Calculate purchases total from purchase list if available, or fall back to total_credit
  const purchasesList = purchasesQuery.data?.purchases ?? [];
  const totalPurchasesCalc = purchasesList.reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);
  const totalPurchasesAmount = totalPurchasesCalc > 0
    ? totalPurchasesCalc.toFixed(2)
    : customer.total_credit || "0.00";

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumbs & Top Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div className="flex items-center gap-2.5">
          <Link
            href="/customers"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white hover:bg-stone-100 text-stone-700 transition-colors border border-stone-300 shadow-2xs"
            aria-label="Back to Customers"
            data-testid="link-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5 text-sm text-stone-600 font-medium">
            <Link href="/customers" className="hover:text-stone-900 transition-colors">
              {t("navCustomers")}
            </Link>
            <span className="text-stone-400 font-bold">›</span>
            <span className="font-extrabold text-stone-900 text-base">{customer.customer_name}</span>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setBuy(true)}
            className="bg-[#15803d] hover:bg-[#166534] text-white font-bold rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm transition-all"
            data-testid="button-new-purchase"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>{t("addPurchaseCredit")}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setEntry("payment")}
            className="border-2 border-[#7c3aed] text-[#6d28d9] hover:bg-[#7c3aed]/10 font-bold rounded-xl px-4 py-2.5 flex items-center gap-2 transition-all bg-white"
            data-testid="button-record-payment"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#7c3aed] text-xs font-bold leading-none">
              ₹
            </span>
            <span>{t("recordPaymentAction")}</span>
          </Button>
        </div>
      </div>

      {/* 2. Customer Profile Header Card */}
      <div className="py-2 flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-stone-200/80 pb-6">
        {/* Left: Avatar & Customer info */}
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f3e8d7] border-2 border-[#e6d5bd] text-[#92400e] shadow-inner">
            <svg viewBox="0 0 24 24" className="h-10 w-10 fill-current">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight"
              data-testid="text-customer-name"
            >
              {customer.customer_name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-stone-600">
              <span className="inline-flex items-center gap-1 font-semibold text-stone-700">
                <Phone className="h-3.5 w-3.5 text-stone-500" />
                {customer.mobile_number || "+91 98765 43210"}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                {t("regularCustomerBadge")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEdit(true)}
                className="h-6 px-1.5 text-xs text-stone-500 hover:text-stone-900"
                data-testid="button-edit-customer"
              >
                <Pencil className="h-3 w-3 mr-1" /> {t("edit")}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Quick Stat Metrics */}
        <div className="flex flex-wrap items-center gap-5 sm:gap-8">
          {/* Metric 1: Total Purchases */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-2xs">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500">{t("totalPurchasesLabel")}</p>
              <p className="text-lg sm:text-xl font-black text-[#1e1b4b] tracking-tight">
                {formatINR(totalPurchasesAmount)}
              </p>
            </div>
          </div>

          {/* Metric 2: Total Payments */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-2xs">
              <span className="text-base font-black">₹</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500">{t("totalPaymentsLabel")}</p>
              <p className="text-lg sm:text-xl font-black text-[#047857] tracking-tight">
                {formatINR(customer.total_payments)}
              </p>
            </div>
          </div>

          {/* Metric 3: Outstanding (Udhar) Pill Badge */}
          <div className="flex items-center gap-3 rounded-2xl bg-[#fef2f2] border border-[#fecaca] px-4 py-2.5 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center text-red-600">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600">{t("outstandingUdharLabel")}</p>
              <p
                className="text-xl sm:text-2xl font-black text-[#b91c1c] tracking-tight"
                data-testid="text-customer-balance"
              >
                {absINR(customer.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-2 sm:gap-8 overflow-x-auto select-none pt-1">
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap",
            activeTab === "summary"
              ? "border-[#b45309] text-[#78350f] font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span>{t("tabKhataSummary")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("purchases")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap",
            activeTab === "purchases"
              ? "border-[#b45309] text-[#78350f] font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{t("tabPurchaseHistory")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap",
            activeTab === "payments"
              ? "border-[#b45309] text-[#78350f] font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          )}
        >
          <span className="font-bold text-sm">₹</span>
          <span>{t("tabPaymentHistory")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={cn(
            "flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap",
            activeTab === "transactions"
              ? "border-[#b45309] text-[#78350f] font-bold"
              : "border-transparent text-stone-500 hover:text-stone-900"
          )}
        >
          <ReceiptText className="h-4 w-4" />
          <span>{t("tabAllTransactions")}</span>
        </button>
      </div>

      {/* 4. Tab Content Area */}
      <div className="pt-2">
        {/* TAB 1: KHATA SUMMARY */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Panel className="p-5 space-y-3 bg-white">
                <h3 className="font-bold text-base text-stone-900">Customer Details</h3>
                <div className="text-sm space-y-2 text-stone-600">
                  <p><span className="font-semibold text-stone-800">Address:</span> {customer.address || "Not specified"}</p>
                  <p><span className="font-semibold text-stone-800">Member Since:</span> {format(new Date(customer.created_at), "dd MMMM yyyy")}</p>
                  {customer.notes && <p><span className="font-semibold text-stone-800">Notes:</span> {customer.notes}</p>}
                </div>
              </Panel>

              <Panel className="p-5 space-y-4 bg-white">
                <h3 className="font-bold text-base text-stone-900">Quick Ledger Actions</h3>
                <div className="flex flex-wrap gap-2.5">
                  <Button
                    onClick={() => setEntry("credit")}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                    data-testid="button-give-credit"
                  >
                    <ArrowUpRight className="h-4 w-4 mr-1.5" /> Give Udhar (Credit)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEntry("payment")}
                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold"
                  >
                    <ArrowDownLeft className="h-4 w-4 mr-1.5" /> Receive Jama (Payment)
                  </Button>
                </div>
              </Panel>
            </div>

            <div>
              <h3 className="text-lg font-bold text-stone-900 mb-3">Recent Transactions</h3>
              {txns.length === 0 ? (
                <EmptyState
                  icon={<ReceiptText className="h-6 w-6" />}
                  title="No transactions yet"
                  body="Record a purchase or payment to create the first ledger entry."
                />
              ) : (
                <Panel className="bg-white">
                  <TxnList items={txns.slice(0, 5)} onOpen={setTxn} showCustomer={false} />
                </Panel>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PURCHASE HISTORY (Primary focus of the design) */}
        {activeTab === "purchases" && (
          <PurchaseHistory
            key={`history:${customer.id}`}
            customerId={customer.id}
            customerName={customer.customer_name}
            onOpen={setBill}
            onNew={() => setBuy(true)}
          />
        )}

        {/* TAB 3: PAYMENT HISTORY */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">Payment History</h2>
                <p className="text-xs text-stone-500">All Jama repayments received from {customer.customer_name}</p>
              </div>
              <Button
                onClick={() => setEntry("payment")}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                + Record Payment
              </Button>
            </div>

            {paymentTxns.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="h-6 w-6" />}
                title="No payments recorded"
                body="When the customer pays in cash or UPI, record it here to reduce their balance."
              >
                <Button onClick={() => setEntry("payment")}>Record Payment</Button>
              </EmptyState>
            ) : (
              <Panel className="bg-white">
                <TxnList items={paymentTxns} onOpen={setTxn} showCustomer={false} />
              </Panel>
            )}
          </div>
        )}

        {/* TAB 4: ALL TRANSACTIONS */}
        {activeTab === "transactions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">All Transactions</h2>
                <p className="text-xs text-stone-500">Complete ledger history ({txns.length} entries)</p>
              </div>
            </div>

            {txns.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="h-6 w-6" />}
                title={t("noEntriesYet")}
                body={t("noEntriesYet")}
              >
                <Button onClick={() => setBuy(true)}>Add Purchase</Button>
                <Button variant="outline" onClick={() => setEntry("payment")}>Record Payment</Button>
              </EmptyState>
            ) : (
              <Panel className="bg-white">
                <TxnList items={txns} onOpen={setTxn} showCustomer={false} />
              </Panel>
            )}
          </div>
        )}
      </div>

      {/* 5. Bottom 3 Metric Summary Cards */}
      <div className="mt-8 pt-6 border-t border-stone-200/80 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Purchases */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#eff6ff] border border-[#dbeafe] shadow-2xs">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t("totalPurchasesLabel")}</p>
            <p className="text-2xl font-black text-[#1e40af] tracking-tight">
              {formatINR(totalPurchasesAmount)}
            </p>
          </div>
        </div>

        {/* Card 2: Total Payments */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#f0fdf4] border border-[#dcfce7] shadow-2xs">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
            <span className="text-2xl font-black">💵</span>
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t("totalPaymentsLabel")}</p>
            <p className="text-2xl font-black text-[#047857] tracking-tight">
              {formatINR(customer.total_payments)}
            </p>
          </div>
        </div>

        {/* Card 3: Outstanding (Udhar) */}
        <div className="flex items-center gap-4 p-5 rounded-2xl bg-[#fef2f2] border border-[#fee2e2] shadow-2xs">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-2xs">
            <span className="text-2xl">👛</span>
          </div>
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">{t("outstandingUdharLabel")}</p>
            <p className="text-2xl font-black text-[#b91c1c] tracking-tight">
              {formatINR(customer.balance)}
            </p>
          </div>
        </div>
      </div>

      {/* Dialogs and Drawers (Functionality completely preserved) */}
      <EntryDialog
        open={!!entry}
        kind={entry ?? "credit"}
        customer={customer}
        onOpenChange={(o) => !o && setEntry(null)}
      />
      <CustomerDialog open={edit} onOpenChange={setEdit} customer={customer} />
      <PurchaseDialog
        key={`dialog:${customer.id}`}
        open={buy}
        onOpenChange={setBuy}
        customer={customer}
        onCreated={setBill}
      />
      <PurchaseSheet
        id={bill}
        onOpenChange={(o) => !o && setBill(null)}
        onOpenTxn={(t) => {
          setBill(null);
          setTxn(t);
        }}
      />
      <TransactionSheet id={txn} onOpenChange={(o) => !o && setTxn(null)} onNavigate={setTxn} />
    </div>
  );
}
