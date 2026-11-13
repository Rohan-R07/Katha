import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Bill } from '../../types/billing';
import { Customer } from '../../types/customer';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Banknote, 
  QrCode, 
  BookOpen 
} from 'lucide-react';

function computeDailyMetrics(bills: Bill[], customers: Customer[]) {
  const today = new Date().toDateString();
  const todayBills = bills.filter((b) => new Date(b.createdAt).toDateString() === today);

  const totalSales = todayBills.reduce((acc, b) => acc + b.total, 0);
  const cashSales = todayBills.filter((b) => b.paymentMethod === 'cash').reduce((acc, b) => acc + b.total, 0);
  const upiSales = todayBills.filter((b) => b.paymentMethod === 'upi').reduce((acc, b) => acc + b.total, 0);
  const khataCredit = todayBills.filter((b) => b.paymentMethod === 'khata').reduce((acc, b) => acc + b.total, 0);

  let khataRecovered = 0;
  customers.forEach((c) => {
    c.transactions.forEach((tx) => {
      if (tx.type === 'payment' && new Date(tx.date).toDateString() === today) {
        khataRecovered += tx.amount;
      }
    });
  });

  const billCount = todayBills.length;
  const avgOrderValue = billCount > 0 ? Math.round(totalSales / billCount) : 0;

  return {
    totalSales,
    cashSales,
    upiSales,
    khataCredit,
    khataRecovered,
    billCount,
    avgOrderValue,
    todayBills,
  };
}

function computeWeeklyMetrics(bills: Bill[]) {
  const days: { dateStr: string; label: string; total: number; cash: number; upi: number; khata: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dateStr = d.toDateString();
    const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });

    const dayBills = bills.filter((b) => new Date(b.createdAt).toDateString() === dateStr);
    const total = dayBills.reduce((acc, b) => acc + b.total, 0);
    const cash = dayBills.filter((b) => b.paymentMethod === 'cash').reduce((acc, b) => acc + b.total, 0);
    const upi = dayBills.filter((b) => b.paymentMethod === 'upi').reduce((acc, b) => acc + b.total, 0);
    const khata = dayBills.filter((b) => b.paymentMethod === 'khata').reduce((acc, b) => acc + b.total, 0);

    days.push({ dateStr, label, total, cash, upi, khata });
  }

  const weeklyTotal = days.reduce((acc, d) => acc + d.total, 0);
  const maxDayTotal = Math.max(...days.map((d) => d.total), 500);

  const itemMap = new Map<string, { name: string; qty: number; revenue: number }>();
  bills.forEach((b) => {
    b.items.forEach((item) => {
      const cur = itemMap.get(item.productName) || { name: item.productName, qty: 0, revenue: 0 };
      cur.qty += item.quantity;
      cur.revenue += item.calculatedPrice;
      itemMap.set(item.productName, cur);
    });
  });

  const topItems = Array.from(itemMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    days,
    weeklyTotal,
    maxDayTotal,
    topItems,
  };
}

export const RevenueReporting: React.FC = () => {
  const { bills, customers, t } = useApp();
  const [reportTab, setReportTab] = useState<'daily' | 'weekly'>('daily');

  // Compute Daily Metrics
  const dailyMetrics = useMemo(() => computeDailyMetrics(bills, customers), [bills, customers]);

  // Compute Weekly Metrics (Last 7 Days)
  const weeklyMetrics = useMemo(() => computeWeeklyMetrics(bills), [bills]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Bill Number,Date,Customer Name,Primary Phone,Total Amount,Payment Mode,Payment Status\n';
    bills.forEach((b) => {
      csv += `"${b.billNumber}","${new Date(b.createdAt).toLocaleString()}","${b.customerName || 'Cash'}","${b.customerPrimaryPhone || ''}","${b.total}","${b.paymentMethod}","${b.paymentStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Khata_Revenue_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Title & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t.revenueTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time daily breakdown and 7-day sales analysis for your shop.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Daily vs Weekly Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setReportTab('daily')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                reportTab === 'daily'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.dailySummary}
            </button>
            <button
              onClick={() => setReportTab('weekly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                reportTab === 'weekly'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.weeklySummary}
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportReport}</span>
          </button>
        </div>
      </div>

      {/* DAILY VIEW */}
      {reportTab === 'daily' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Today */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500">{t.todaySales}</span>
              <div className="text-3xl font-black text-slate-900 mt-1">
                ₹{dailyMetrics.totalSales.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span>{dailyMetrics.billCount} transactions today</span>
              </div>
            </div>

            {/* UPI Digital Collected */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-amber-600" />
                <span>{t.upiCollected}</span>
              </span>
              <div className="text-3xl font-black text-amber-700 mt-1">
                ₹{dailyMetrics.upiSales.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-amber-600 mt-1">
                Instant bank settlements
              </div>
            </div>

            {/* Cash Collected */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.cashCollected}</span>
              </span>
              <div className="text-3xl font-black text-emerald-700 mt-1">
                ₹{dailyMetrics.cashSales.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-600 mt-1">
                Physical counter cash
              </div>
            </div>

            {/* Udhar Extended vs Recovered */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-rose-600" />
                <span>{t.udharGiven}</span>
              </span>
              <div className="text-3xl font-black text-rose-600 mt-1">
                ₹{dailyMetrics.khataCredit.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-emerald-700 mt-1 font-semibold">
                + ₹{dailyMetrics.khataRecovered} old udhar recovered
              </div>
            </div>
          </div>

          {/* Today's Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h2 className="text-sm font-extrabold text-slate-900 mb-4 flex items-center justify-between">
              <span>Today's Transactions ({dailyMetrics.todayBills.length})</span>
              <span className="text-xs font-semibold text-slate-400">
                Avg Basket: ₹{dailyMetrics.avgOrderValue}
              </span>
            </h2>

            {dailyMetrics.todayBills.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No orders billed yet today. Speak or create a bill in the Voice Billing tab!
              </div>
            ) : (
              <div className="space-y-2">
                {dailyMetrics.todayBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                        {bill.billNumber}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">
                          {bill.customerName || 'Cash Walk-in'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(bill.createdAt).toLocaleTimeString()} • {bill.items.length} items
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bill.paymentMethod === 'upi'
                            ? 'bg-amber-100 text-amber-800'
                            : bill.paymentMethod === 'cash'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {bill.paymentMethod.toUpperCase()}
                      </span>
                      <div className="font-black text-slate-900 text-sm">
                        ₹{bill.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WEEKLY VIEW */}
      {reportTab === 'weekly' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Weekly Summary Header Banner */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-3xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-amber-200 font-bold">
                7-Day Revenue Velocity
              </span>
              <div className="text-4xl font-black mt-1">
                ₹{weeklyMetrics.weeklyTotal.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-amber-100 mt-1">
                Aggregated daily counter sales + digital UPI receipts
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl text-xs space-y-1">
              <div>Top Daily Peak: <span className="font-bold font-mono">₹{weeklyMetrics.maxDayTotal}</span></div>
              <div>Best Channel: <span className="font-bold">UPI / QR Digital</span></div>
            </div>
          </div>

          {/* 7-Day Visual Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-600" />
              <span>Day-by-Day Revenue Breakdown</span>
            </h2>

            <div className="grid grid-cols-7 gap-2 items-end h-52 pt-4 px-2">
              {weeklyMetrics.days.map((day, idx) => {
                const heightPercent =
                  weeklyMetrics.maxDayTotal > 0
                    ? Math.max(12, Math.round((day.total / weeklyMetrics.maxDayTotal) * 100))
                    : 12;

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{day.total}
                    </span>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-amber-600 to-orange-400 rounded-xl group-hover:from-amber-700 group-hover:to-orange-500 transition-all shadow-xs flex items-center justify-center"
                    />
                    <span className="text-[10px] font-bold text-slate-500 truncate text-center w-full">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Selling Items & Cash/UPI Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top Items */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h2 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Top Selling Products this Week</span>
              </h2>
              <div className="space-y-2.5">
                {weeklyMetrics.topItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-slate-900">₹{item.revenue}</div>
                      <div className="text-[10px] text-slate-400">{item.qty} units/kg</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Channel Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 mb-3">
                  Payment Channels Split
                </h2>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Instant UPI QR</span>
                      <span className="text-amber-800">High Reliability</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[65%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Counter Cash</span>
                      <span className="text-emerald-700">Immediate</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-[25%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Khata Credit (Udhar)</span>
                      <span className="text-rose-600">Tracked</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full w-[10%]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 mt-4">
                💡 Tip: Remind customers via WhatsApp on Mondays to keep Udhar recovery above 90%.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
