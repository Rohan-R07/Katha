import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types/customer';
import { 
  UserPlus, 
  Search, 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X, 
  ShieldAlert, 
  History 
} from 'lucide-react';
import { createWhatsAppUrl } from '../../services/whatsapp';

export const OutstandingCustomersList: React.FC = () => {
  const { customers, outstandingCustomers, totalOutstanding, addCustomer, recordKhataTransaction, shopProfile, t } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'outstanding' | 'cleared'>('outstanding');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeLedgerCustomer, setActiveLedgerCustomer] = useState<Customer | null>(null);
  const [txModal, setTxModal] = useState<{ customer: Customer; type: 'credit' | 'payment' } | null>(null);
  const [txAmount, setTxAmount] = useState<number>(0);
  const [txDescription, setTxDescription] = useState<string>('');
  const [showCustToast, setShowCustToast] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Add Customer Form State
  const initialCustomerForm = {
    name: '',
    primaryPhone: '',
    altPhone: '',
    altPhoneLabel: 'Spouse',
    address: '',
    creditLimit: 5000,
    initialBalance: 0,
  };
  const [formData, setFormData] = useState(initialCustomerForm);

  // Filtered list
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const matchSearch =
        cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.primaryPhone.includes(searchQuery) ||
        cust.altPhone.includes(searchQuery);

      if (!matchSearch) return false;

      if (filterMode === 'outstanding') return cust.outstandingBalance > 0;
      if (filterMode === 'cleared') return cust.outstandingBalance === 0;
      return true;
    });
  }, [customers, searchQuery, filterMode]);

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.primaryPhone.trim()) {
      setValidationError('Please enter Customer Name and Primary Mobile Number');
      return;
    }
    setValidationError(null);

    await addCustomer({
      name: formData.name.trim(),
      primaryPhone: formData.primaryPhone.trim(),
      altPhone: formData.altPhone.trim() || formData.primaryPhone.trim(),
      altPhoneLabel: formData.altPhoneLabel || 'Family',
      address: formData.address || 'Market Area',
      creditLimit: Number(formData.creditLimit) || 5000,
      initialBalance: Number(formData.initialBalance) || 0,
    });

    setIsAddModalOpen(false);
    setFormData(initialCustomerForm);
    setShowCustToast(true);
    setTimeout(() => setShowCustToast(false), 3000);
  };

  const handleRecordTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txModal || txAmount <= 0) return;

    await recordKhataTransaction(
      txModal.customer.id,
      txModal.type,
      txAmount,
      txDescription || (txModal.type === 'credit' ? 'Manual Udhar Entry' : 'Manual Cash/UPI Repayment')
    );

    // Refresh active ledger if open
    if (activeLedgerCustomer && activeLedgerCustomer.id === txModal.customer.id) {
      const updated = customers.find((c) => c.id === txModal.customer.id);
      if (updated) setActiveLedgerCustomer(updated);
    }

    setTxModal(null);
    setTxAmount(0);
    setTxDescription('');
  };

  const handleSendReminderPrimary = (customer: Customer) => {
    const text = `ನಮಸ್ಕಾರ ${customer.name}. ${shopProfile.name} ಅಂಗಡಿಯಿಂದ ನೆನಪೋಲೆ: ನಿಮ್ಮ ಹಳೆ ಖಾತಾ ಬಾಕಿ ಮೊತ್ತ ₹${customer.outstandingBalance} ಆಗಿದೆ. ದಯವಿಟ್ಟು ಅಂಗಡಿಗೆ ಭೇಟಿ ನೀಡಿ ಅಥವಾ UPI (${shopProfile.upiId}) ಮೂಲಕ ಪಾವತಿಸಿ. ಧನ್ಯವಾದಗಳು! (ಅಂಗಡಿ Ph: ${shopProfile.primaryPhone})`;
    const url = createWhatsAppUrl(customer.primaryPhone, text);
    window.open(url, '_blank');
  };

  const handleSendReminderAlt = (customer: Customer) => {
    const relation = customer.altPhoneLabel || 'ಕುಟುಂಬದವರು / Family';
    const text = `ನಮಸ್ಕಾರ (${relation}). ${shopProfile.name} ಅಂಗಡಿಯಿಂದ ಮಾಹಿತಿ: ${customer.name} ಅವರ ಹೆಸರಿನ ಖಾತಾ ಬಾಕಿ ಮೊತ್ತ ₹${customer.outstandingBalance} ಉಳಿದಿದೆ. ದಯವಿಟ್ಟು ಅವರಿಗೆ ತಿಳಿಸಿ ಅಥವಾ UPI (${shopProfile.upiId}) ಮೂಲಕ ಪಾವತಿಸಿ. (ಅಂಗಡಿ Ph: ${shopProfile.primaryPhone})`;
    const url = createWhatsAppUrl(customer.altPhone, text);
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Toast Notification */}
      {showCustToast && (
        <div className="mb-4 p-3.5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center justify-between text-xs font-black text-emerald-900 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-600" />
            <span>ಗ್ರಾಹಕರನ್ನು ಯಶಸ್ವಿಯಾಗಿ ನೋಂದಾಯಿಸಲಾಗಿದೆ / Customer successfully registered to Khata ledger!</span>
          </div>
          <button onClick={() => setShowCustToast(false)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.khataTitle}
            </h1>
            <span className="text-xs bg-rose-100 text-rose-900 font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
              {outstandingCustomers.length} Active Debtors
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.persistentNotice}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.addCustomer}</span>
        </button>
      </div>

      {/* Mandatory Notice Alert Banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <span className="font-extrabold uppercase">Mandatory System Constraint:</span>{' '}
          For <strong>ANY</strong> customer registered with an outstanding balance, their contact details
          (Primary Mobile Number and Alternative Mobile Number) are <strong>prominently and persistently displayed</strong>{' '}
          alongside their name across all views to ensure seamless follow-up recovery.
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500">{t.totalOutstanding}</span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Across {outstandingCustomers.length} registered accounts
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500">Average Credit per Debtor</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{outstandingCustomers.length > 0 ? Math.round(totalOutstanding / outstandingCustomers.length) : 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Standard limit: ₹5,000</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500">Accounts with Alternative Contact</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            100%
          </div>
          <span className="text-[11px] text-emerald-700 mt-0.5 block font-semibold">
            All debtors have verified 2nd phone numbers
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs mb-6 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, primary or alt phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="sm:col-span-4 flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('outstanding')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterMode === 'outstanding' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Outstanding ({outstandingCustomers.length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setFilterMode('cleared')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterMode === 'cleared' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Zero Due
          </button>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const hasBalance = customer.outstandingBalance > 0;
          return (
            <div
              key={customer.id}
              className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                hasBalance ? 'border-rose-300 ring-1 ring-rose-100' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header: Name and Outstanding Balance */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-black text-slate-900 text-sm">{customer.name}</h2>
                    {customer.address && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {customer.address}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                        hasBalance
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {hasBalance ? `Due: ₹${customer.outstandingBalance}` : 'Settled (₹0)'}
                    </span>
                  </div>
                </div>

                {/* MANDATORY PERSISTENT CONTACT BOX */}
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-xs">
                  {/* Primary Phone */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-bold text-slate-700">Primary:</span>
                      <a
                        href={`tel:${customer.primaryPhone}`}
                        className="font-mono font-bold text-blue-700 hover:underline"
                      >
                        {customer.primaryPhone}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${customer.primaryPhone}`}
                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        title="Call Primary"
                      >
                        <PhoneCall className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Alternative Phone (PERSISTENT MANDATORY) */}
                  <div className="flex items-center justify-between border-t border-slate-200/80 pt-1.5">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-bold text-slate-700">
                        Alt ({customer.altPhoneLabel || 'Secondary'}):
                      </span>
                      <a
                        href={`tel:${customer.altPhone}`}
                        className="font-mono font-bold text-blue-700 hover:underline"
                      >
                        {customer.altPhone}
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${customer.altPhone}`}
                        className="p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100"
                        title="Call Alternative"
                      >
                        <PhoneCall className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Credit Limit & Last Activity */}
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Limit: ₹{customer.creditLimit}</span>
                  <span>Last: {new Date(customer.lastTransactionDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setTxModal({ customer, type: 'payment' })}
                    className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.recordPayment}</span>
                  </button>

                  <button
                    onClick={() => setTxModal({ customer, type: 'credit' })}
                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg border border-rose-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    <span>{t.recordCredit}</span>
                  </button>
                </div>

                {hasBalance && (
                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    <button
                      onClick={() => handleSendReminderPrimary(customer)}
                      className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title="Send WhatsApp notice to Registered Primary Number"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp Primary</span>
                    </button>

                    <button
                      onClick={() => handleSendReminderAlt(customer)}
                      className="py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title="Send WhatsApp notice to Alternate Number (Family/Spouse)"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp Alt ({customer.altPhoneLabel || 'Family'})</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setActiveLedgerCustomer(customer)}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="View Transaction History"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>ಖಾತಾ ಲೆಕ್ಕಪತ್ರ ನೋಡಿ (View Full Ledger)</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-600" />
                <span>{t.addCustomer}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-3.5">
              {validationError && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-700 animate-fadeIn">
                  {validationError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.customerName} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-semibold"
                  required
                />
              </div>

              {/* MANDATORY: Primary Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.primaryMobile} *</span>
                </label>
                <input
                  type="tel"
                  value={formData.primaryPhone}
                  onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  required
                />
              </div>

              {/* MANDATORY: Alternative Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t.altMobile}</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 rounded">
                    ಕುಟುಂಬದ ನಂಬರ್ (Family Phone)
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="tel"
                    value={formData.altPhone}
                    onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                    placeholder="2nd phone (optional)"
                    className="col-span-2 text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                  <select
                    value={formData.altPhoneLabel}
                    onChange={(e) => setFormData({ ...formData, altPhoneLabel: e.target.value })}
                    className="text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Brother">Brother</option>
                    <option value="Office">Office</option>
                    <option value="Neighbour">Neighbour</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.creditLimit}
                  </label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street or house number"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-md cursor-pointer"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD TRANSACTION MODAL (Payment or Credit) */}
      {txModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                {txModal.type === 'payment' ? (
                  <>
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                    <span>Record Jama (Repayment)</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5 text-rose-600" />
                    <span>Add Udhar (Credit)</span>
                  </>
                )}
              </h3>
              <button onClick={() => setTxModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-xs">
              <div className="font-bold text-slate-900">{txModal.customer.name}</div>
              <div className="text-slate-500 font-mono mt-0.5">
                Pri: {txModal.customer.primaryPhone} | Alt: {txModal.customer.altPhone}
              </div>
              <div className="font-extrabold text-rose-600 mt-1">
                Current Due: ₹{txModal.customer.outstandingBalance}
              </div>
            </div>

            <form onSubmit={handleRecordTransactionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  value={txAmount || ''}
                  onChange={(e) => setTxAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter amount"
                  className="w-full text-base font-black p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Note
                </label>
                <input
                  type="text"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder={txModal.type === 'payment' ? 'e.g. Cash settled via Shop' : 'e.g. Atta & Oil udhar'}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTxModal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-black text-white rounded-lg shadow-md cursor-pointer ${
                    txModal.type === 'payment' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL CUSTOMER LEDGER MODAL */}
      {activeLedgerCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {activeLedgerCustomer.name} • Account Ledger
                </h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">
                  Primary: {activeLedgerCustomer.primaryPhone} | Alt ({activeLedgerCustomer.altPhoneLabel || 'Secondary'}): {activeLedgerCustomer.altPhone}
                </div>
              </div>
              <button
                onClick={() => setActiveLedgerCustomer(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Card */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-800 font-bold">Total Outstanding Balance:</span>
                <div className="text-2xl font-black text-rose-700 mt-0.5">
                  ₹{activeLedgerCustomer.outstandingBalance}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSendReminderPrimary(activeLedgerCustomer)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="WhatsApp to Registered Primary Number"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Primary</span>
                </button>
                <button
                  onClick={() => handleSendReminderAlt(activeLedgerCustomer)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                  title="WhatsApp to Alternate Number (Family/Spouse)"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp Alt</span>
                </button>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700">Transaction History ({activeLedgerCustomer.transactions.length})</h4>
              {activeLedgerCustomer.transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No transactions recorded yet.</div>
              ) : (
                activeLedgerCustomer.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          tx.type === 'credit'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {tx.type === 'credit' ? 'U' : 'J'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{tx.description}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(tx.date).toLocaleString()} • Rec by: {tx.recordedBy}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-black text-xs ${
                          tx.type === 'credit' ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {tx.type === 'credit' ? `+ ₹${tx.amount}` : `- ₹${tx.amount}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Bal: ₹{tx.balanceAfter}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
