import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Phone, PhoneCall, MessageSquare, ChevronDown, ChevronUp, UserCheck, ArrowRight, Sparkles } from 'lucide-react';
import { createWhatsAppUrl } from '../../services/whatsapp';

export const PersistentKhataAlertBar: React.FC = () => {
  const { outstandingCustomers, totalOutstanding, shopProfile, setCurrentView, recordKhataTransaction, t } = useApp();
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePaymentModal, setActivePaymentModal] = useState<string | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<string>('');

  if (outstandingCustomers.length === 0) {
    return null;
  }

  const handleSendReminderPrimary = (customer: any) => {
    const message = `ನಮಸ್ಕಾರ ${customer.name}. ${shopProfile.name} ಅಂಗಡಿಯಿಂದ ನೆನಪೋಲೆ: ನಿಮ್ಮ ಹಳೆ ಖಾತಾ ಬಾಕಿ ಮೊತ್ತ ₹${customer.outstandingBalance} ಆಗಿದೆ. ದಯವಿಟ್ಟು ಅಂಗಡಿಗೆ ಭೇಟಿ ನೀಡಿ ಅಥವಾ UPI (${shopProfile.upiId}) ಮೂಲಕ ಪಾವತಿಸಿ. ಧನ್ಯವಾದಗಳು! (ಅಂಗಡಿ ಸಂಪರ್ಕ: ${shopProfile.primaryPhone})`;
    const url = createWhatsAppUrl(customer.primaryPhone, message);
    window.open(url, '_blank');
  };

  const handleSendReminderAlt = (customer: any) => {
    const relation = customer.altPhoneLabel || 'ಕುಟುಂಬದವರು / Family';
    const message = `ನಮಸ್ಕಾರ (${relation}). ${shopProfile.name} ಅಂಗಡಿಯಿಂದ ಮಾಹಿತಿ: ${customer.name} ಅವರ ಹೆಸರಿನ ಖಾತಾ ಬಾಕಿ ಮೊತ್ತ ₹${customer.outstandingBalance} ಉಳಿದಿದೆ. ದಯವಿಟ್ಟು ಅವರಿಗೆ ತಿಳಿಸಿ ಅಥವಾ UPI (${shopProfile.upiId}) ಮೂಲಕ ಪಾವತಿಸಿ. (ಅಂಗಡಿ Ph: ${shopProfile.primaryPhone})`;
    const url = createWhatsAppUrl(customer.altPhone, message);
    window.open(url, '_blank');
  };

  const handleQuickRepayment = (customerId: string) => {
    const amt = parseFloat(repaymentAmount);
    if (!amt || amt <= 0) return;
    recordKhataTransaction(customerId, 'payment', amt, 'Cash/UPI Repayment (Quick Jama)');
    setActivePaymentModal(null);
    setRepaymentAmount('');
  };

  return (
    <aside aria-label="Khata Follow-ups and Debtors" className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white shadow-md transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        {/* Header summary line */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-200 opacity-90"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>ಹಳ್ಳಿ & ನಗರದ ಲೈವ್ ಬಾಕಿ ವಸೂಲಾತಿ ಪಟ್ಟಿ / PERSISTENT KHATA FOLLOW-UPS:</span>
              <span className="bg-white/20 text-white backdrop-blur-xs text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
                {outstandingCustomers.length} Debtors
              </span>
              <span className="text-white/60 hidden sm:inline">|</span>
              <span className="text-yellow-200 font-extrabold text-sm sm:text-base">
                ₹{totalOutstanding.toLocaleString('en-IN')} Due
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('khata')}
              className="text-xs font-bold text-slate-900 bg-yellow-300 hover:bg-yellow-400 px-3 py-1.5 rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <span>{t.viewLedger}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-extrabold text-white bg-black/20 hover:bg-black/30 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title={isExpanded ? 'Collapse debtors bar' : 'Expand debtors bar'}
            >
              <span>{isExpanded ? 'Hide' : 'Show All Debtors'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Persistent debtor cards list */}
        {isExpanded && (
          <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2.5 border-t border-white/20">
            {outstandingCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-white text-slate-900 rounded-xl p-3 shadow-md border-2 border-amber-300 hover:border-amber-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="font-black text-slate-900 text-xs sm:text-sm">
                        {customer.name}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Account ID: {customer.id}
                      </span>
                    </div>
                    <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shrink-0">
                      ₹{customer.outstandingBalance}
                    </span>
                  </div>

                  {/* MANDATORY: Prominent Primary AND Alternative Phone Display */}
                  <div className="mt-2 space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                    {/* Primary Registered Phone */}
                    <div className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-bold text-slate-800">Primary (Register No):</span>
                        <a
                          href={`tel:${customer.primaryPhone}`}
                          className="text-blue-700 font-mono hover:underline font-bold"
                        >
                          {customer.primaryPhone}
                        </a>
                      </div>
                      <a
                        href={`tel:${customer.primaryPhone}`}
                        className="text-emerald-700 hover:text-emerald-800 bg-emerald-100 p-1 rounded hover:bg-emerald-200 transition-colors"
                        title="Direct Call Primary"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Alternative Phone (Mandatory persistent visibility) */}
                    <div className="flex items-center justify-between text-slate-700 border-t border-slate-200 pt-1.5">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-bold text-slate-800">
                          Alt ({customer.altPhoneLabel || 'Family'}):
                        </span>
                        <a
                          href={`tel:${customer.altPhone}`}
                          className="text-blue-700 font-mono hover:underline font-bold"
                        >
                          {customer.altPhone}
                        </a>
                      </div>
                      <a
                        href={`tel:${customer.altPhone}`}
                        className="text-amber-700 hover:text-amber-800 bg-amber-100 p-1 rounded hover:bg-amber-200 transition-colors"
                        title="Direct Call Alternative"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Follow up actions: DUAL WHATSAPP (Primary AND Alternate) */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleSendReminderPrimary(customer)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                      title="Send WhatsApp notice to Registered Primary Number"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp Primary</span>
                    </button>

                    <button
                      onClick={() => handleSendReminderAlt(customer)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                      title="Send WhatsApp notice to Alternate Number (Family/Spouse)"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp Alt ({customer.altPhoneLabel || 'Family'})</span>
                    </button>
                  </div>

                  <button
                    onClick={() => setActivePaymentModal(customer.id)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Record Jama (ಪಾವತಿ ಜಮಾ)</span>
                  </button>
                </div>

                {/* Inline Quick Repayment Modal */}
                {activePaymentModal === customer.id && (
                  <div className="mt-2.5 p-2 bg-blue-50 rounded-lg border border-blue-200 animate-fadeIn text-slate-900">
                    <div className="text-xs font-bold text-blue-900 mb-1">
                      Record Repayment from {customer.name}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder={`Amount (max ₹${customer.outstandingBalance})`}
                        value={repaymentAmount}
                        onChange={(e) => setRepaymentAmount(e.target.value)}
                        className="w-full text-xs p-1.5 rounded border border-blue-300 bg-white font-bold"
                        autoFocus
                      />
                      <button
                        onClick={() => handleQuickRepayment(customer.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setActivePaymentModal(null)}
                        className="text-xs text-slate-500 hover:text-slate-800 px-1.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
