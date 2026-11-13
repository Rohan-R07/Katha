import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { 
  Mic, 
  Package, 
  BookOpen, 
  BarChart3, 
  Store, 
  Terminal, 
  Menu, 
  X, 
  RefreshCw,
  Sparkles,
  Volume2,
  Sun,
  Moon,
  ChevronDown,
  Plus,
  Check,
  Building2
} from 'lucide-react';
import { speechService } from '../../services/speech';
import { ShopType } from '../../types/shop';

export const Navbar: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    shopProfile, 
    stores, 
    addStore, 
    switchStore, 
    theme, 
    toggleTheme, 
    backendStatus, 
    checkBackendHealth, 
    language, 
    t 
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPlayingGuide, setIsPlayingGuide] = useState(false);
  const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false);

  // New Store Form State
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

  const handlePlayAudioGuide = async () => {
    setIsPlayingGuide(true);
    await speechService.speakAudioGuide(language);
    setIsPlayingGuide(false);
  };

  const handleRefreshHealth = async () => {
    setIsRefreshing(true);
    await checkBackendHealth();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCreateNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreForm.name || !newStoreForm.primaryPhone) {
      return;
    }
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
    setIsStoreMenuOpen(false);
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
  };

  const navItems = [
    { id: 'billing', label: t.navBilling, icon: Mic, badge: 'AI Voice' },
    { id: 'inventory', label: t.navInventory, icon: Package },
    { id: 'khata', label: t.navKhata, icon: BookOpen },
    { id: 'reports', label: t.navReports, icon: BarChart3 },
    { id: 'profile', label: t.navProfile, icon: Store },
    { id: 'integration', label: t.navIntegration, icon: Terminal, highlight: true },
  ];

  const isDark = theme === 'black';

  return (
    <>
      <header className={`sticky top-0 z-40 border-b transition-colors duration-200 shadow-xs ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand & Store Selector */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('billing')}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <span className="font-extrabold text-lg tracking-tight">ಖಾ</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {t.appName}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Kirana OS</span>
                    </span>
                  </div>
                  <div className={`text-xs font-semibold truncate max-w-[140px] sm:max-w-[200px] ${
                    isDark ? 'text-zinc-400' : 'text-slate-500'
                  }`}>
                    {shopProfile.name}
                  </div>
                </div>
              </button>

              {/* Multi-Store Switcher Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-700 text-amber-400 hover:bg-zinc-800'
                      : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                  }`}
                  title="Switch Store or Add New Store"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">ಅಂಗಡಿ / Stores ({stores.length})</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                {isStoreMenuOpen && (
                  <div className={`absolute left-0 mt-2 w-64 rounded-2xl shadow-xl border p-2 z-50 animate-fadeIn ${
                    isDark ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-2 py-1">
                      ನಿಮ್ಮ ಅಂಗಡಿಗಳು (Your Stores)
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {stores.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            switchStore(s.id);
                            setIsStoreMenuOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                            s.id === shopProfile.id
                              ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900'
                              : isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="font-extrabold truncate">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{s.shopType} • {s.marketArea || 'City'}</div>
                          </div>
                          {s.id === shopProfile.id && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
                      <button
                        onClick={() => {
                          setIsStoreMenuOpen(false);
                          setIsAddStoreModalOpen(true);
                        }}
                        className="w-full px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ ಹೊಸ ಅಂಗಡಿ ಸೇರಿಸಿ (Add Store)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as any)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-xs'
                        : item.highlight
                        ? isDark ? 'text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700' : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                        : isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : isDark ? 'text-zinc-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {item.badge && !isActive && (
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right: Theme Toggle, Audio Voice Guide, Language, Backend Status */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* WHITE / BLACK THEME TOGGLE BUTTON */}
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-yellow-400 hover:bg-zinc-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
                title={isDark ? 'Switch to Pure White Background' : 'Switch to Pure Black Background'}
                aria-label="Toggle White or Black theme"
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-yellow-400" />
                    <span className="hidden xl:inline text-white font-bold">White Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-700" />
                    <span className="hidden xl:inline font-bold">Black Mode</span>
                  </>
                )}
              </button>

              {/* Amogh's FastAPI connection pill */}
              <div
                onClick={() => setCurrentView('integration')}
                className={`hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-all ${
                  backendStatus.isConnected
                    ? isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700' : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : isDark ? 'bg-amber-950/60 text-amber-300 border-amber-700' : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
                title={`Amogh's FastAPI Backend (${backendStatus.endpoint}). Click for endpoint docs & sync status.`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    backendStatus.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="font-semibold hidden md:inline">
                  FastAPI: {backendStatus.isConnected ? 'Online' : 'Local Fallback'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshHealth();
                  }}
                  className={`p-0.5 rounded ${isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Ping Amogh's FastAPI"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Audio Voice Guide Button */}
              <button
                onClick={handlePlayAudioGuide}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                  isPlayingGuide
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-105'
                }`}
                title="Click to hear spoken voice guide (ಧ್ವನಿ ಮಾರ್ಗದರ್ಶಿ / Voice Guide)"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPlayingGuide ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">
                  {language === 'kn' ? 'ಧ್ವನಿ ಸಹಾಯ' : language === 'hi' ? 'ಆವಾज़ गाइड' : 'Audio Guide'}
                </span>
              </button>

              {/* Language Switcher */}
              <LanguageSwitcher />

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden p-2 rounded-lg ${isDark ? 'text-zinc-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'}`}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className={`lg:hidden border-b px-4 pt-2 pb-4 space-y-1 shadow-lg animate-fadeIn ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-slate-200'
          }`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                    isActive
                      ? 'bg-amber-600 text-white'
                      : isDark ? 'text-zinc-300 hover:bg-zinc-900' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsAddStoreModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-amber-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ ಹೊಸ ಅಂಗಡಿ ಸೇರಿಸಿ (Add Store)</span>
              </button>
            </div>
          </div>
        )}
      </header>

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
      {/* Mobile Bottom Fixed Bar for Kirana Shopkeeper (Thumbs-friendly) */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around py-1.5 px-2 shadow-lg ${
        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <button
          onClick={() => setCurrentView('billing')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-bold ${
            currentView === 'billing' ? 'text-amber-500' : isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-full ${currentView === 'billing' ? 'bg-amber-500/20 text-amber-500' : ''}`}>
            <Mic className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">{t.navBilling}</span>
        </button>

        <button
          onClick={() => setCurrentView('inventory')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-bold ${
            currentView === 'inventory' ? 'text-amber-500' : isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-full ${currentView === 'inventory' ? 'bg-amber-500/20 text-amber-500' : ''}`}>
            <Package className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">{t.navInventory}</span>
        </button>

        <button
          onClick={() => setCurrentView('khata')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-bold ${
            currentView === 'khata' ? 'text-amber-500' : isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-full ${currentView === 'khata' ? 'bg-amber-500/20 text-amber-500' : ''}`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">{t.navKhata}</span>
        </button>

        <button
          onClick={() => setCurrentView('reports')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-xs font-bold ${
            currentView === 'reports' ? 'text-amber-500' : isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}
        >
          <div className={`p-1.5 rounded-full ${currentView === 'reports' ? 'bg-amber-500/20 text-amber-500' : ''}`}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5">{t.navReports}</span>
        </button>
      </div>
    </>
  );
};

