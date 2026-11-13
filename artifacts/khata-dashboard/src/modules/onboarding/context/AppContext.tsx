import { createContext, useContext, useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { getShop, getMe, getGetMeQueryKey, type AuthSession } from '@workspace/api-client-react';
import type { ShopProfile, Language, ShopType } from '../types/shop';
import type { Product } from '../types/inventory';
import type { Customer } from '../types/customer';
import { amoghApiClient, toProfile, asLanguage } from '../services/api';
import { translations } from '../i18n/translations';
import { generateRohanVoiceConfig } from '../services/exportVoice';

export type ViewMode = 'onboarding' | 'profile' | 'inventory' | 'khata' | 'integration';
type NewCustomer = Omit<Customer, 'id' | 'createdAt' | 'transactions' | 'outstandingBalance' | 'lastTransactionDate'> & { initialBalance?: string };
type NewProduct = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

function useProvider(session: AuthSession) {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [currentView, setCurrentView] = useState<ViewMode>(session.shop ? 'profile' : 'onboarding');
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('khata_app_language');
      if (saved === 'kn' || saved === 'hi' || saved === 'en') return saved as Language;
    } catch {}
    return asLanguage(session.shop?.preferred_language);
  });
  const [theme, setTheme] = useState<'white' | 'black'>('white');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    const handleLangChange = (e: any) => {
      const newLang = e?.detail;
      if (newLang === 'kn' || newLang === 'hi' || newLang === 'en') {
        setLanguageState(newLang);
      }
    };
    window.addEventListener('khata_language_change', handleLangChange);
    return () => window.removeEventListener('khata_language_change', handleLangChange);
  }, []);

  const snapshot = useQuery({
    queryKey: ['website1', session.user.id, session.shop?.id],
    enabled: !!session.shop,
    queryFn: async () => {
      const [shop, customers, products] = await Promise.all([
        getShop({ credentials: 'include' }), amoghApiClient.getCustomers(), amoghApiClient.getProducts(),
      ]);
      return { shop, customers, products };
    },
    refetchInterval: 30_000, staleTime: 0,
  });
  const rawProfile = toProfile(snapshot.data?.shop ?? session.shop, session.user);
  const shopProfile = useMemo(() => ({
    ...rawProfile,
    preferredLanguage: language,
  }), [rawProfile, language]);
  const customers = snapshot.data?.customers ?? [];
  const products = snapshot.data?.products ?? [];
  const outstandingCustomers = customers.filter(c => c.outstandingBalance > 0);
  // Display-only aggregates. Authoritative balances are calculated exclusively by FastAPI.
  const totalOutstanding = outstandingCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const voiceConfig = useMemo(
    () => generateRohanVoiceConfig(shopProfile, products, language), [shopProfile, products, language],
  );
  const health = useQuery({ queryKey: ['website1-health'], queryFn: () => amoghApiClient.checkHealth(), refetchInterval: 30_000 });
  const refresh = async () => {
    // Invalidate dashboard lists/details as well as Website 1 so navigation shows committed records.
    await qc.invalidateQueries({ predicate: query => query.queryKey[0] !== getGetMeQueryKey()[0] });
    const identity = await getMe({ credentials: 'include' });
    qc.setQueryData(getGetMeQueryKey(), identity);
  };
  async function perform<T>(action: () => Promise<T>): Promise<T> {
    if (busyRef.current) throw new Error('Another save is still running.');
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = await action();
      // A refetch failure must not turn an already committed mutation into a retry.
      await refresh().catch(() => setError('Saved to PostgreSQL, but refreshing failed. Reload to view the committed record.'));
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The server could not save this change.');
      throw e;
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }
  const unsupported = (message: string) => { setError(message); };
  return {
    language, setLanguage: (lang: Language) => {
      setLanguageState(lang);
      try {
        localStorage.setItem('khata_app_language', lang);
        window.dispatchEvent(new CustomEvent('khata_language_change', { detail: lang }));
      } catch {}
      if (session.shop) {
        void amoghApiClient.updateLanguage(lang).catch(() => {});
      }
    },
    theme, setTheme, toggleTheme: () => setTheme(t => t === 'white' ? 'black' : 'white'),
    t: translations[language], shopProfile, stores: session.shop ? [shopProfile] : [],
    addStore: async (_data: unknown): Promise<ShopProfile> => {
      const message = 'Multiple shops per account are not supported by the shared backend. Your current shop has not changed.';
      unsupported(message); throw new Error(message);
    },
    switchStore: (_id: string) => unsupported('This account uses its single authenticated shop.'),
    updateShopProfile: (updates: Partial<ShopProfile>) => perform(async () => {
      await amoghApiClient.saveShopProfile({ ...shopProfile, ...updates, preferredLanguage: language });
    }),
    completeOnboarding: (profile: ShopProfile, _initialProducts?: Product[]) => perform(async () => {
      await amoghApiClient.saveShopProfile(profile);
      setCurrentView('profile');
    }).then(() => navigate('/')),
    products,
    addProduct: (product: NewProduct) => perform(async () => { await amoghApiClient.saveProduct(product); }),
    updateProduct: (id: string, updates: Partial<Product>) => perform(async () => {
      const previous = products.find(p => p.id === id);
      if (!previous) throw new Error('Product not found. Refresh the catalog.');
      await amoghApiClient.saveProduct({ ...previous, ...updates }, id);
    }),
    deleteProduct: async (_id: string) => {
      const message = 'Product deletion has no shared API contract. Edit availability instead; no product was deleted.';
      unsupported(message); throw new Error(message);
    },
    loadPresetCatalog: async (_type: ShopType) => unsupported('Automatic demo catalog imports are disabled. Add real products in Catalog.'),
    customers, outstandingCustomers, totalOutstanding,
    addCustomer: (data: NewCustomer) => perform(() => amoghApiClient.createCustomer(data)),
    recordKhataTransaction: (id: string, type: 'credit' | 'payment', amount: string, description: string) =>
      perform(async () => { await amoghApiClient.recordKhataTransaction(id, type, amount, description); }),
    resetAllData: () => unsupported('Demo resets are disabled. No server or local records were deleted.'),
    currentView, setCurrentView, voiceConfig, busy, error,
    clearError: () => setError(''),
    loading: !!session.shop && snapshot.isLoading,
    loadError: snapshot.error,
    retryLoad: () => void snapshot.refetch(),
    backendStatus: health.data,
  };
}
type AppContextType = ReturnType<typeof useProvider>;
const AppContext = createContext<AppContextType | null>(null);
export function AppProvider({ session, children }: { session: AuthSession; children: ReactNode }) {
  const value = useProvider(session);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('Website 1 requires its shared-session provider.');
  return context;
}
