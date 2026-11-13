/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ShopProfile, Language, ShopType } from '../types/shop';
import { Product } from '../types/inventory';
import { Customer, KhataTransaction } from '../types/customer';
import { Bill, DispatchedMessage } from '../types/billing';
import { BackendStatus, amoghApiClient } from '../services/api';
import { storage } from '../services/storage';
import { translations } from '../i18n/translations';
import { dispatchClosedLoopMessages } from '../services/whatsapp';
import { generateRohanVoiceConfig } from '../services/exportVoice';
import { RohanVoiceConfig } from '../types/voice';
import { kiranaSeedProducts } from '../services/seedData';

type ViewMode = 
  | 'billing' 
  | 'inventory' 
  | 'khata' 
  | 'reports' 
  | 'profile' 
  | 'integration' 
  | 'onboarding';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'white' | 'black';
  setTheme: (theme: 'white' | 'black') => void;
  toggleTheme: () => void;
  t: typeof translations['en'];
  shopProfile: ShopProfile;
  stores: ShopProfile[];
  addStore: (storeData: Omit<ShopProfile, 'id' | 'createdAt' | 'updatedAt' | 'isOnboarded'>) => Promise<ShopProfile>;
  switchStore: (storeId: string) => void;
  updateShopProfile: (profile: Partial<ShopProfile>) => Promise<void>;
  completeOnboarding: (profile: ShopProfile, initialProducts?: Product[]) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  loadPresetCatalog: (shopType: ShopType) => Promise<void>;
  customers: Customer[];
  outstandingCustomers: Customer[];
  totalOutstanding: number;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'transactions' | 'outstandingBalance' | 'lastTransactionDate'> & { initialBalance?: number }) => Promise<Customer>;
  recordKhataTransaction: (customerId: string, type: 'credit' | 'payment', amount: number, description: string) => Promise<void>;
  bills: Bill[];
  createBill: (billData: Omit<Bill, 'id' | 'createdAt' | 'billNumber'>) => Promise<Bill>;
  dispatchedMessages: DispatchedMessage[];
  backendStatus: BackendStatus;
  checkBackendHealth: () => Promise<void>;
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  voiceConfig: RohanVoiceConfig;
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => storage.getLanguage());
  const [theme, setThemeState] = useState<'white' | 'black'>(() => storage.getTheme());
  const [stores, setStores] = useState<ShopProfile[]>(() => storage.getStores());
  const [shopProfile, setShopProfile] = useState<ShopProfile>(() => {
    const allStores = storage.getStores();
    const activeId = storage.getActiveStoreId();
    const match = allStores.find((s) => s.id === activeId);
    return match || storage.getShopProfile();
  });
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(() => storage.getCustomers());
  const [bills, setBills] = useState<Bill[]>(() => storage.getBills());
  const [dispatchedMessages, setDispatchedMessages] = useState<DispatchedMessage[]>(() => storage.getDispatchedMessages());
  const [currentView, setCurrentView] = useState<ViewMode>(() => 
    shopProfile.isOnboarded ? 'billing' : 'onboarding'
  );
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    isConnected: false,
    lastChecked: 'Checking...',
    endpoint: amoghApiClient.getBaseUrl(),
  });

  // Apply pure white or pure black theme to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'black') {
        document.documentElement.classList.add('dark');
        document.body.style.backgroundColor = '#000000';
        document.body.style.color = '#ffffff';
      } else {
        document.documentElement.classList.remove('dark');
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#0f172a';
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'white' ? 'black' : 'white';
    setThemeState(next);
    storage.setTheme(next);
  };

  const setTheme = (next: 'white' | 'black') => {
    setThemeState(next);
    storage.setTheme(next);
  };

  // Add new store
  const addStore = async (
    storeData: Omit<ShopProfile, 'id' | 'createdAt' | 'updatedAt' | 'isOnboarded'>
  ): Promise<ShopProfile> => {
    const newStore: ShopProfile = {
      ...storeData,
      id: `shop_${Date.now()}`,
      isOnboarded: true,
      preferredLanguage: language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedStores = [...stores, newStore];
    setStores(updatedStores);
    storage.saveStores(updatedStores);
    setShopProfile(newStore);
    storage.saveShopProfile(newStore);
    storage.setActiveStoreId(newStore.id);
    await amoghApiClient.saveShopProfile(newStore);
    return newStore;
  };

  // Switch between existing stores
  const switchStore = (storeId: string) => {
    const target = stores.find((s) => s.id === storeId);
    if (target) {
      setShopProfile(target);
      storage.saveShopProfile(target);
      storage.setActiveStoreId(target.id);
    }
  };

  // Current translation object
  const t = useMemo(() => translations[language] || translations.en, [language]);

  // Outstanding customers calculation (Mandatory constraint)
  const outstandingCustomers = useMemo(() => {
    return customers.filter((c) => c.outstandingBalance > 0);
  }, [customers]);

  const totalOutstanding = useMemo(() => {
    return outstandingCustomers.reduce((acc, c) => acc + c.outstandingBalance, 0);
  }, [outstandingCustomers]);

  // Voice configuration for Rohan's AI assistant
  const voiceConfig = useMemo(() => {
    return generateRohanVoiceConfig(shopProfile, products, language);
  }, [shopProfile, products, language]);

  // Check Amogh's FastAPI backend status on mount and periodically
  const checkBackendHealth = async () => {
    const status = await amoghApiClient.checkHealth();
    setBackendStatus(status);
  };

  useEffect(() => {
    let isMounted = true;
    const runCheck = async () => {
      const status = await amoghApiClient.checkHealth();
      if (isMounted) {
        setBackendStatus(status);
      }
    };
    void runCheck();
    const interval = setInterval(runCheck, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update language handler
  const setLanguage = async (newLang: Language) => {
    setLanguageState(newLang);
    storage.setLanguage(newLang);
    setShopProfile((prev) => {
      const updated = { ...prev, preferredLanguage: newLang, updatedAt: new Date().toISOString() };
      storage.saveShopProfile(updated);
      return updated;
    });
    await amoghApiClient.updateLanguage(newLang);
  };

  // Update shop profile
  const updateShopProfile = async (updates: Partial<ShopProfile>) => {
    const updated: ShopProfile = {
      ...shopProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setShopProfile(updated);
    storage.saveShopProfile(updated);
    const updatedStores = stores.map((s) => (s.id === updated.id ? updated : s));
    setStores(updatedStores);
    storage.saveStores(updatedStores);
    await amoghApiClient.saveShopProfile(updated);
  };

  // Complete onboarding
  const completeOnboarding = async (newProfile: ShopProfile, initialProductsList?: Product[]) => {
    const finalProfile = {
      ...newProfile,
      isOnboarded: true,
      updatedAt: new Date().toISOString(),
    };
    setShopProfile(finalProfile);
    storage.saveShopProfile(finalProfile);
    await amoghApiClient.saveShopProfile(finalProfile);

    if (initialProductsList && initialProductsList.length > 0) {
      setProducts(initialProductsList);
      storage.saveProducts(initialProductsList);
    }

    setCurrentView('billing');
  };

  // Product management
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...productData,
      emoji: productData.emoji || '📦',
      id: `prod_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newProduct, ...products];
    setProducts(updated);
    storage.saveProducts(updated);
    await amoghApiClient.createProduct(newProduct);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const updated = products.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    setProducts(updated);
    storage.saveProducts(updated);
    const target = updated.find((p) => p.id === id);
    if (target) {
      await amoghApiClient.updateProduct(id, target);
    }
  };

  const deleteProduct = async (id: string) => {
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    storage.saveProducts(updated);
    await amoghApiClient.deleteProduct(id);
  };

  const loadPresetCatalog = async (_shopType: ShopType) => {
    // For now we use rich Kirana seed products
    setProducts(kiranaSeedProducts);
    storage.saveProducts(kiranaSeedProducts);
  };

  // Customer & Khata management
  const addCustomer = async (
    custData: Omit<Customer, 'id' | 'createdAt' | 'transactions' | 'outstandingBalance' | 'lastTransactionDate'> & { initialBalance?: number }
  ): Promise<Customer> => {
    const initBal = custData.initialBalance || 0;
    const initialTxs: KhataTransaction[] = [];
    if (initBal > 0) {
      initialTxs.push({
        id: `tx_init_${Date.now()}`,
        customerId: `cust_${Date.now()}`,
        type: 'credit',
        amount: initBal,
        balanceAfter: initBal,
        description: 'Opening Khata Balance',
        date: new Date().toISOString(),
        recordedBy: shopProfile.shopkeeperName,
      });
    }

    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: custData.name,
      primaryPhone: custData.primaryPhone,
      altPhone: custData.altPhone,
      altPhoneLabel: custData.altPhoneLabel || 'Emergency / Family',
      address: custData.address || '',
      creditLimit: custData.creditLimit || 5000,
      outstandingBalance: initBal,
      lastTransactionDate: new Date().toISOString(),
      transactions: initialTxs,
      createdAt: new Date().toISOString(),
    };

    const updated = [newCustomer, ...customers];
    setCustomers(updated);
    storage.saveCustomers(updated);
    await amoghApiClient.createCustomer(newCustomer);
    return newCustomer;
  };

  const recordKhataTransaction = async (
    customerId: string,
    type: 'credit' | 'payment',
    amount: number,
    description: string
  ) => {
    const targetCustomer = customers.find((c) => c.id === customerId);
    if (!targetCustomer) return;

    const newBalance =
      type === 'credit'
        ? targetCustomer.outstandingBalance + amount
        : Math.max(0, targetCustomer.outstandingBalance - amount);

    const newTx: KhataTransaction = {
      id: `tx_${Date.now()}`,
      customerId,
      type,
      amount,
      balanceAfter: newBalance,
      description,
      date: new Date().toISOString(),
      recordedBy: shopProfile.shopkeeperName,
    };

    const updatedCustomer: Customer = {
      ...targetCustomer,
      outstandingBalance: newBalance,
      lastTransactionDate: new Date().toISOString(),
      transactions: [newTx, ...targetCustomer.transactions],
    };

    const updatedCustomers = customers.map((c) => (c.id === customerId ? updatedCustomer : c));
    setCustomers(updatedCustomers);
    storage.saveCustomers(updatedCustomers);
    await amoghApiClient.recordKhataTransaction(customerId, newTx);
  };

  // Bill creation & closed-loop messaging flow
  const createBill = async (billData: Omit<Bill, 'id' | 'createdAt' | 'billNumber'>): Promise<Bill> => {
    const billCount = bills.length + 1001;
    const newBill: Bill = {
      ...billData,
      id: `bill_${Date.now()}`,
      billNumber: `KH-${billCount}`,
      createdAt: new Date().toISOString(),
      customerMessageSent: true,
      managerMessageSent: true,
    };

    // Deduct stock for inventory items
    const updatedProducts = products.map((prod) => {
      const billedItem = newBill.items.find((item) => item.productId === prod.id);
      if (billedItem) {
        const deductedQty =
          billedItem.weightInKg !== undefined ? billedItem.weightInKg : billedItem.quantity;
        return {
          ...prod,
          stockQuantity: Math.max(0, prod.stockQuantity - deductedQty),
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });
    setProducts(updatedProducts);
    storage.saveProducts(updatedProducts);

    // If payment method is Khata, record as customer credit
    let targetCustomer = customers.find((c) => c.id === newBill.customerId);
    if (newBill.paymentMethod === 'khata' && targetCustomer) {
      await recordKhataTransaction(
        targetCustomer.id,
        'credit',
        newBill.total,
        `Bill #${newBill.billNumber} (${newBill.items.length} items)`
      );
      // reload updated target customer for message
      targetCustomer = {
        ...targetCustomer,
        outstandingBalance: targetCustomer.outstandingBalance + newBill.total,
      };
    }

    // Save bill
    const updatedBills = [newBill, ...bills];
    setBills(updatedBills);
    storage.saveBills(updatedBills);
    await amoghApiClient.saveBill(newBill);

    // Closed-loop automated messaging
    const newMessages = dispatchClosedLoopMessages(newBill, shopProfile, targetCustomer);
    const updatedMessages = [...newMessages, ...dispatchedMessages];
    setDispatchedMessages(updatedMessages);
    storage.saveDispatchedMessages(updatedMessages);

    // Dispatch to Amogh's notification queue
    await amoghApiClient.dispatchClosedLoopNotifications({
      billId: newBill.id,
      customerPhone: newBill.customerPrimaryPhone || targetCustomer?.primaryPhone || '',
      managerPhone: shopProfile.primaryPhone,
      totalAmount: newBill.total,
      paymentMethod: newBill.paymentMethod,
      customerMessage: newMessages[0]?.messageText || '',
      managerMessage: newMessages[1]?.messageText || '',
    });

    return newBill;
  };

  const resetAllData = () => {
    storage.resetToDefaults();
    window.location.reload();
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        theme,
        setTheme,
        toggleTheme,
        t,
        shopProfile,
        stores,
        addStore,
        switchStore,
        updateShopProfile,
        completeOnboarding,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        loadPresetCatalog,
        customers,
        outstandingCustomers,
        totalOutstanding,
        addCustomer,
        recordKhataTransaction,
        bills,
        createBill,
        dispatchedMessages,
        backendStatus,
        checkBackendHealth,
        currentView,
        setCurrentView,
        voiceConfig,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
