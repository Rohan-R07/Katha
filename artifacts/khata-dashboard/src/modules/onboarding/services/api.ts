/** Website 1 adapter. The shared generated client and server ledger own all data. */
import {
  getMe, getShop, createShop, updateShop, listCustomers, createCustomer,
  listProducts, createProduct, updateProduct, listCategories, createCategory,
  createTransaction, healthCheck,
  type Shop, type Customer as ApiCustomer, type Product as ApiProduct,
} from '@workspace/api-client-react';
import type { ShopProfile, Language, ShopType } from '../types/shop';
import type { Product } from '../types/inventory';
import type { Customer } from '../types/customer';

export const API_BASE_URL = '';
export interface BackendStatus {
  isConnected: boolean;
  lastChecked: string;
  endpoint: string;
  error?: string;
  latencyMs?: number;
}
const options = { credentials: 'include' as const };

export function decimalInput(value: string | number): string {
  const text = String(value).trim();
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(text)) {
    throw new Error('Enter a non-negative amount with at most 12 whole digits and two decimal places.');
  }
  const [whole, fraction = ''] = text.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export function toProfile(shop: Shop | null, owner: { name: string; email: string; mobile_number: string }): ShopProfile {
  const details = shop?.profile_details;
  return {
    id: shop?.id ?? '', name: shop?.shop_name ?? '', shopkeeperName: details?.shopkeeper_name || owner.name,
    shopType: (shop?.shop_type?.toLowerCase() || 'kirana') as ShopType,
    primaryPhone: shop?.contact_number || owner.mobile_number, altPhone: details?.alternate_phone ?? '',
    email: details?.email ?? owner.email, address: shop?.address ?? '',
    marketArea: details?.market_area ?? '', pincode: details?.pincode ?? '', upiId: details?.upi_id ?? '',
    gstNumber: details?.gst_number ?? '', preferredLanguage: asLanguage(shop?.preferred_language),
    isOnboarded: !!shop, createdAt: shop?.created_at ?? '', updatedAt: shop?.created_at ?? '',
  };
}
export function asLanguage(value?: string): Language {
  return value === 'kn' || value === 'hi' ? value : 'en';
}
export function toCustomer(customer: ApiCustomer): Customer {
  return {
    id: customer.id, name: customer.customer_name, primaryPhone: customer.mobile_number,
    altPhone: customer.contact_details?.alternate_phone ?? '',
    altPhoneLabel: customer.contact_details?.alternate_phone_label ?? '',
    address: customer.address, creditLimit: Number(customer.contact_details?.credit_limit ?? '0'),
    outstandingBalance: Number(customer.balance), lastTransactionDate: customer.created_at,
    transactions: [], createdAt: customer.created_at,
  };
}
export function toProduct(product: ApiProduct): Product {
  const d = product.catalog_details;
  return {
    id: product.id, name: product.product_name, category: product.category_name ?? '',
    pricePerUnit: Number(product.price), priceDecimal: product.price,
    nameKannada: d?.name_kannada ?? '', nameHindi: d?.name_hindi ?? '',
    pricingType: d?.pricing_type ?? 'per_unit', unit: d?.unit ?? 'piece',
    stockQuantity: d?.stock_quantity ?? 0, minStockAlert: d?.min_stock_alert ?? 0,
    barcode: d?.barcode ?? '', voiceKeywords: d?.voice_keywords ?? [], isAvailable: d?.is_available ?? true,
    emoji: d?.emoji ?? '', createdAt: product.created_at, updatedAt: product.created_at,
  };
}

// Keep only operation hashes and random keys, scoped to the authenticated user.
// An ambiguous network failure retains the same key even after a page reload.
async function retrySafe<T>(scope: string, payload: unknown, commit: (key: string) => Promise<T>): Promise<T> {
  const me = await getMe(options);
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  const hash = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  const storageKey = `khata:website1:${me.user.id}:${scope}:${hash}`;
  let key = sessionStorage.getItem(storageKey);
  if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(storageKey, key); }
  const result = await commit(key);
  sessionStorage.removeItem(storageKey);
  return result;
}

export const amoghApiClient = {
  getBaseUrl: () => '/api',
  async checkHealth(): Promise<BackendStatus> {
    const start = performance.now();
    try {
      await healthCheck(options);
      return { isConnected: true, lastChecked: new Date().toLocaleTimeString(), endpoint: '/api/healthz', latencyMs: Math.round(performance.now() - start) };
    } catch (error) {
      return { isConnected: false, lastChecked: new Date().toLocaleTimeString(), endpoint: '/api/healthz', error: error instanceof Error ? error.message : 'Backend unavailable' };
    }
  },
  async saveShopProfile(profile: ShopProfile) {
    const me = await getMe(options);
    const previous = me.shop;
    const payload = {
      shop_name: profile.name, shop_type: profile.shopType, address: profile.address,
      city: previous?.city ?? '', state: previous?.state ?? '', contact_number: profile.primaryPhone,
      preferred_language: profile.preferredLanguage,
      profile_details: {
        shopkeeper_name: profile.shopkeeperName, alternate_phone: profile.altPhone, email: profile.email ?? '',
        market_area: profile.marketArea, pincode: profile.pincode, upi_id: profile.upiId, gst_number: profile.gstNumber ?? '',
      },
    };
    const shop = previous ? await updateShop(payload, options) : await createShop(payload, options);
    return toProfile(shop, me.user);
  },
  async updateLanguage(language: Language) {
    const shop = await getShop(options);
    return updateShop({
      shop_name: shop.shop_name, shop_type: shop.shop_type, address: shop.address,
      city: shop.city, state: shop.state, contact_number: shop.contact_number,
      profile_details: shop.profile_details, preferred_language: language,
    }, options);
  },
  async getProducts() { return (await listProducts(undefined, options)).map(toProduct); },
  async getCustomers() { return (await listCustomers(undefined, options)).map(toCustomer); },
  async saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, id?: string) {
    let categoryId: string | null = null;
    if (product.category.trim()) {
      const name = product.category.trim();
      let category = (await listCategories(options)).find(c => c.category_name === name);
      if (!category) {
        try { category = await createCategory({ category_name: name }, options); }
        catch (error) {
          // A competing tab may have created the same category. Only accept a real matching record.
          category = (await listCategories(options)).find(c => c.category_name === name);
          if (!category) throw error;
        }
      }
      categoryId = category.id;
    }
    const payload = {
      product_name: product.name, category_id: categoryId, price: decimalInput(product.priceDecimal ?? product.pricePerUnit),
      catalog_details: {
        name_kannada: product.nameKannada ?? '', name_hindi: product.nameHindi ?? '',
        pricing_type: product.pricingType, unit: product.unit, stock_quantity: product.stockQuantity,
        min_stock_alert: product.minStockAlert, barcode: product.barcode ?? '',
        voice_keywords: product.voiceKeywords, is_available: product.isAvailable, emoji: product.emoji ?? '',
      },
    };
    return toProduct(id ? await updateProduct(id, payload, options) : await createProduct(payload, options));
  },
  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'transactions' | 'outstandingBalance' | 'lastTransactionDate'> & { initialBalance?: string }) {
    const payload = {
      customer_name: data.name, mobile_number: data.primaryPhone, address: data.address ?? '',
      opening_balance: decimalInput(data.initialBalance ?? '0'),
      contact_details: { alternate_phone: data.altPhone, alternate_phone_label: data.altPhoneLabel ?? '', credit_limit: decimalInput(data.creditLimit) },
    };
    return toCustomer(await retrySafe('customer-import', payload, key => createCustomer({ ...payload, idempotency_key: key }, options)));
  },
  async recordKhataTransaction(customerId: string, type: 'credit' | 'payment', amount: string, description: string) {
    const payload = { customer_id: customerId, transaction_type: type, amount: decimalInput(amount), description };
    return retrySafe('ledger-entry', payload, key => createTransaction({ ...payload, idempotency_key: key }, options));
  },
};
