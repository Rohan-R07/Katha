import { ShopProfile, Language } from '../types/shop';
import { Product } from '../types/inventory';
import { Customer } from '../types/customer';
import { Bill, DispatchedMessage } from '../types/billing';
import { initialShopProfile, kiranaSeedProducts, initialCustomers, initialBills } from './seedData';

const STORAGE_KEYS = {
  SHOP_PROFILE: 'khata_shop_profile',
  LANGUAGE: 'khata_language_preference',
  THEME: 'khata_theme_preference',
  STORES: 'khata_stores_list',
  ACTIVE_STORE_ID: 'khata_active_store_id',
  PRODUCTS: 'khata_inventory_products',
  CUSTOMERS: 'khata_customers_ledger',
  BILLS: 'khata_sales_bills',
  MESSAGES: 'khata_dispatched_messages',
};

export const storage = {
  getTheme(): 'white' | 'black' {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === 'white' || stored === 'black') {
      return stored;
    }
    return 'white'; // Default to pure crisp white background as requested
  },

  setTheme(theme: 'white' | 'black'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  getStores(): ShopProfile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STORES);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error reading stores list:', e);
      }
    }
    return [initialShopProfile];
  },

  saveStores(stores: ShopProfile[]): void {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
  },

  getActiveStoreId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_STORE_ID) || initialShopProfile.id;
  },

  setActiveStoreId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_STORE_ID, id);
  },

  getLanguage(): Language {
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (stored === 'kn' || stored === 'hi' || stored === 'en') {
      return stored;
    }
    return 'kn'; // Default to Kannada as requested in Kirana context
  },

  setLanguage(lang: Language): void {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  },

  getShopProfile(): ShopProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.SHOP_PROFILE);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error reading shop profile:', e);
      }
    }
    return initialShopProfile;
  },

  saveShopProfile(profile: ShopProfile): void {
    localStorage.setItem(STORAGE_KEYS.SHOP_PROFILE, JSON.stringify(profile));
  },

  getProducts(): Product[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error reading products:', e);
      }
    }
    return kiranaSeedProducts;
  },

  saveProducts(products: Product[]): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (raw) {
      try {
        const parsed: Customer[] = JSON.parse(raw);
        if (!parsed.some((c) => c.id === 'cust_demo')) {
          const demoCust = initialCustomers.find((c) => c.id === 'cust_demo');
          if (demoCust) return [demoCust, ...parsed];
        }
        return parsed;
      } catch (e) {
        console.error('Error reading customers:', e);
      }
    }
    return initialCustomers;
  },

  saveCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  },

  getBills(): Bill[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error reading bills:', e);
      }
    }
    return initialBills;
  },

  saveBills(bills: Bill[]): void {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  },

  getDispatchedMessages(): DispatchedMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error('Error reading messages:', e);
      }
    }
    return [];
  },

  saveDispatchedMessages(messages: DispatchedMessage[]): void {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  },

  resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.SHOP_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.LANGUAGE);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.BILLS);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  }
};

