import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Phone, 
  RotateCcw, 
  Check, 
  QrCode,
  Building2,
  Plus,
  X
} from 'lucide-react';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { ShopType } from '../../types/shop';

export const ShopProfileView: React.FC = () => {
  const { 
    shopProfile, 
    stores, 
    addStore, 
    switchStore, 
    updateShopProfile, 
    setCurrentView, 
    resetAllData, 
    theme,
    language,
    t 
  } = useApp();

  const isDark = theme === 'black';

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: shopProfile.name,
    shopkeeperName: shopProfile.shopkeeperName,
    shopType: shopProfile.shopType,
    primaryPhone: shopProfile.primaryPhone,
    altPhone: shopProfile.altPhone,
    email: shopProfile.email || '',
    address: shopProfile.address,
    marketArea: shopProfile.marketArea,
    pincode: shopProfile.pincode,
    upiId: shopProfile.upiId,
    gstNumber: shopProfile.gstNumber || '',
  });

  const handleStartEditing = () => {
    setFormData({
      name: shopProfile.name,
      shopkeeperName: shopProfile.shopkeeperName,
      shopType: shopProfile.shopType,
      primaryPhone: shopProfile.primaryPhone,
      altPhone: shopProfile.altPhone,
      email: shopProfile.email || '',
      address: shopProfile.address,
      marketArea: shopProfile.marketArea,
      pincode: shopProfile.pincode,
      upiId: shopProfile.upiId,
      gstNumber: shopProfile.gstNumber || '',
    });
    setIsEditing(true);
  };

  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);
  const [newStoreForm, setNewStoreForm] = useState({
    name: '',
    shopkeeperName: '',
    shopType: 'kirana' as ShopType,
    primaryPhone: '',
    altPhone: '',
    address: '',
    marketArea: '',
    pincode: '560001',
    upiId: '',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateShopProfile(formData);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCreateNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreForm.name || !newStoreForm.primaryPhone) return;

    await addStore({
      name: newStoreForm.name,
      shopkeeperName: newStoreForm.shopkeeperName || 'Shopkeeper',
      shopType: newStoreForm.shopType,
      primaryPhone: newStoreForm.primaryPhone,
      altPhone: newStoreForm.altPhone || newStoreForm.primaryPhone,
      address: newStoreForm.address || 'Market Road',
      marketArea: newStoreForm.marketArea || 'City',
      pincode: newStoreForm.pincode || '560001',
      upiId: newStoreForm.upiId || `${newStoreForm.primaryPhone}@upi`,
      preferredLanguage: language,
    });

    setIsAddStoreModalOpen(false);
    setNewStoreForm({
      name: '',
      shopkeeperName: '',
      shopType: 'kirana',
      primaryPhone: '',
      altPhone: '',
      address: '',
      marketArea: '',
      pincode: '560001',
      upiId: '',
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.navProfile}
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Verified Merchant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage your store details, UPI billing configurations, and team integration parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              onClick={handleStartEditing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              {t.editProfile}
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300"
            >
              Cancel Editing
            </button>
          )}

          <button
            onClick={() => setCurrentView('onboarding')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-colors"
            title="Re-run the initial onboarding setup"
          >
            Re-run Setup Wizard
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-900 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Shop Profile successfully updated and synced with Amogh’s FastAPI backend!</span>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Merchant Card & UPI QR (1 col) */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center text-2xl font-black shadow-md shadow-orange-500/30 mb-3">
              🏪
            </div>
            <h2 className="font-black text-slate-900 text-base">{shopProfile.name}</h2>
            <div className="text-xs text-slate-500 font-semibold mt-0.5">{shopProfile.shopkeeperName}</div>
            <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mt-2">
              {shopProfile.shopType}
            </span>

            {/* QR Code Preview */}
            <div className="mt-5 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Shop UPI QR
              </span>
              <div className="w-32 h-32 bg-slate-900 rounded-xl p-2 flex items-center justify-center text-white my-1 shadow-inner">
                <QrCode className="w-24 h-24 text-amber-300" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-800 mt-1 truncate max-w-[180px]">
                {shopProfile.upiId}
              </span>
            </div>
          </div>

          {/* Reset seed data button */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
            <span className="text-xs text-slate-500 block mb-2">Want to reset sample data for demo?</span>
            <button
              onClick={() => {
                if (confirm('Reset all demo data to default Kirana seed state?')) {
                  resetAllData();
                }
              }}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo State</span>
            </button>
          </div>
        </div>

        {/* Right Column: Profile Details & Form (2 cols) */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            {!isEditing ? (
              /* Read-only view */
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Shop Identity
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-semibold block">{t.shopName}</span>
                      <span className="font-black text-slate-900 text-sm mt-0.5 block">{shopProfile.name}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-semibold block">{t.shopkeeperName}</span>
                      <span className="font-black text-slate-900 text-sm mt-0.5 block">{shopProfile.shopkeeperName}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Persistent Contact Visibility Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-semibold block flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t.primaryMobile}</span>
                      </span>
                      <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block">
                        {shopProfile.primaryPhone}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-400 font-semibold block flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t.altMobile}</span>
                      </span>
                      <span className="font-mono font-bold text-amber-800 text-sm mt-0.5 block">
                        {shopProfile.altPhone}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Location & Tax
                  </h3>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="font-bold text-slate-900">{shopProfile.address}</div>
                    <div className="text-slate-500">
                      Market: {shopProfile.marketArea} • PIN Code: {shopProfile.pincode}
                    </div>
                    {shopProfile.gstNumber && (
                      <div className="text-slate-600 font-mono text-[11px] pt-1 border-t border-slate-200">
                        GST: {shopProfile.gstNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Speech & Language Engine
                  </h3>
                  <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">
                        Current Store Language: {shopProfile.preferredLanguage.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-amber-700">
                        Configured for Rohan's AI Voice Assistant
                      </span>
                    </div>
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
            ) : (
              /* Editable form */
              <form onSubmit={handleSave} className="space-y-4">
                <h3 className="text-base font-black text-slate-900 mb-3">
                  Edit Shop Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.shopName} *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.shopkeeperName} *</label>
                    <input
                      type="text"
                      value={formData.shopkeeperName}
                      onChange={(e) => setFormData({ ...formData, shopkeeperName: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.primaryMobile} *</label>
                    <input
                      type="tel"
                      value={formData.primaryPhone}
                      onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.altMobile} *</label>
                    <input
                      type="tel"
                      value={formData.altPhone}
                      onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.upiId} *</label>
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.gstOptional}</label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">{t.address}</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Stores Directory / Multi-Store Switcher */}
      <div className={`mt-6 rounded-3xl border p-6 shadow-xs ${
        isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-extrabold">ನೋಂದಾಯಿತ ಅಂಗಡಿಗಳು (Registered Stores) ({stores.length})</h2>
          </div>
          <button
            onClick={() => setIsAddStoreModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ ಹೊಸ ಅಂಗಡಿ ಸೇರಿಸಿ (Add Store)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stores.map((s) => (
            <div
              key={s.id}
              className={`p-4 rounded-2xl border transition-all ${
                s.id === shopProfile.id
                  ? isDark
                    ? 'border-amber-500 bg-amber-950/20 shadow-md ring-2 ring-amber-500/30'
                    : 'border-amber-500 bg-amber-50/60 shadow-md ring-2 ring-amber-500/20'
                  : isDark
                  ? 'border-zinc-800 bg-zinc-800/40 hover:border-zinc-700'
                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-extrabold text-sm">{s.name}</div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {s.shopkeeperName} • <span className="uppercase text-[10px] font-bold text-amber-600">{s.shopType}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 font-mono">
                    Ph: {s.primaryPhone} | UPI: {s.upiId}
                  </div>
                </div>
                {s.id === shopProfile.id ? (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300">
                    Active ✅
                  </span>
                ) : (
                  <button
                    onClick={() => switchStore(s.id)}
                    className="text-xs font-bold px-2.5 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-lg transition-colors cursor-pointer"
                  >
                    Switch
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD NEW STORE MODAL */}
      {isAddStoreModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className={`rounded-3xl max-w-lg w-full p-6 shadow-2xl border ${
            isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-xl">🏪</span>
                <div>
                  <h3 className="font-black text-base">ಹೊಸ ಅಂಗಡಿ ನೋಂದಣಿ (Add New Store)</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Add another Kirana, Bakery, or Retail Store to Project Khata</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStoreModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewStore} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold mb-1">ಅಂಗಡಿಯ ಹೆಸರು (Store Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Krishna Bakery & Sweets"
                  value={newStoreForm.name}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, name: e.target.value })}
                  className={`w-full text-xs p-2.5 rounded-xl border font-bold ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">ಮಾಲೀಕರ ಹೆಸರು (Owner Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Gowda"
                    value={newStoreForm.shopkeeperName}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, shopkeeperName: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl border ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">ಅಂಗಡಿ ವಿಧ (Category)</label>
                  <select
                    value={newStoreForm.shopType}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, shopType: e.target.value as ShopType })}
                    className={`w-full text-xs p-2.5 rounded-xl border ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="kirana">Kirana & Provisions</option>
                    <option value="vegetable_fruit">Vegetables & Fruits</option>
                    <option value="dairy_sweets">Dairy & Sweets</option>
                    <option value="bakery">Bakery & Snacks</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="general">General Store</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">ಮುಖ್ಯ ಮೊಬೈಲ್ (Primary Phone) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9845012345"
                    value={newStoreForm.primaryPhone}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, primaryPhone: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl border font-mono ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">UPI ID (Google Pay / PhonePe) *</label>
                  <input
                    type="text"
                    required
                    placeholder="shopname@okaxis"
                    value={newStoreForm.upiId}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, upiId: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl border font-mono ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">ವಿಳಾಸ & ಮಾರುಕಟ್ಟೆ (Address & Market Area)</label>
                <input
                  type="text"
                  placeholder="Gandhi Circle, Malleshwaram"
                  value={newStoreForm.address}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, address: e.target.value, marketArea: e.target.value })}
                  className={`w-full text-xs p-2.5 rounded-xl border ${
                    isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-105 shadow-md cursor-pointer"
                >
                  Create & Open Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
