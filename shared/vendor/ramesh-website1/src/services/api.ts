import { ShopProfile, Language } from '../types/shop';
import { Product } from '../types/inventory';
import { Customer, KhataTransaction } from '../types/customer';
import { Bill } from '../types/billing';
import { VoiceParseResponse } from '../types/voice';

// Amogh's shared FastAPI backend base URL
export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'http://localhost:8000';

export interface BackendStatus {
  isConnected: boolean;
  lastChecked: string;
  endpoint: string;
  error?: string;
  latencyMs?: number;
}

class AmoghFastApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(newUrl: string) {
    this.baseUrl = newUrl;
  }

  // Healthcheck with Amogh's FastAPI backend
  async checkHealth(): Promise<BackendStatus> {
    const startTime = performance.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2500),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        return {
          isConnected: true,
          lastChecked: new Date().toLocaleTimeString(),
          endpoint: `${this.baseUrl}/api/health`,
          latencyMs,
        };
      }
      return {
        isConnected: false,
        lastChecked: new Date().toLocaleTimeString(),
        endpoint: `${this.baseUrl}/api/health`,
        error: `HTTP ${response.status}: ${response.statusText}`,
        latencyMs,
      };
    } catch (err: any) {
      return {
        isConnected: false,
        lastChecked: new Date().toLocaleTimeString(),
        endpoint: `${this.baseUrl}/api/health`,
        error: err.message || 'FastAPI backend connection refused on ' + this.baseUrl,
      };
    }
  }

  // Shop Profile Endpoints
  async getShopProfile(): Promise<ShopProfile | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/shop/profile`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Fallback to local storage for Shop Profile:', e);
    }
    return null;
  }

  async saveShopProfile(profile: ShopProfile): Promise<ShopProfile> {
    try {
      const res = await fetch(`${this.baseUrl}/api/shop/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Sync fallback for saveShopProfile:', e);
    }
    return profile;
  }

  async updateLanguage(language: Language): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/shop/language`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[FastAPI] Sync fallback for updateLanguage:', e);
      return false;
    }
  }

  // Inventory Endpoints
  async getProducts(): Promise<Product[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/inventory/products`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Fallback to local inventory:', e);
    }
    return null;
  }

  async createProduct(product: Product): Promise<Product> {
    try {
      const res = await fetch(`${this.baseUrl}/api/inventory/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Fallback for createProduct:', e);
    }
    return product;
  }

  async updateProduct(id: string, product: Product): Promise<Product> {
    try {
      const res = await fetch(`${this.baseUrl}/api/inventory/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Fallback for updateProduct:', e);
    }
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/inventory/products/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (e) {
      console.warn('[FastAPI] Fallback for deleteProduct:', e);
      return true;
    }
  }

  // Customer & Persistent Contact / Khata Endpoints
  async getCustomers(): Promise<Customer[] | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/customers`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Fallback to local customer khata:', e);
    }
    return null;
  }

  async createCustomer(customer: Customer): Promise<Customer> {
    try {
      const res = await fetch(`${this.baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Fallback for createCustomer:', e);
    }
    return customer;
  }

  async recordKhataTransaction(customerId: string, tx: KhataTransaction): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/customers/${customerId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tx),
      });
      return res.ok;
    } catch (e) {
      console.warn('[FastAPI] Fallback for recordKhataTransaction:', e);
      return true;
    }
  }

  // Voice Billing & Parsing
  async parseVoiceText(transcript: string, language: Language): Promise<VoiceParseResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/voice/parse-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, language }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Fallback to client-side voice parser:', e);
    }
    return null;
  }

  // Closed-loop Invoicing and Notifications
  async saveBill(bill: Bill): Promise<Bill> {
    try {
      const res = await fetch(`${this.baseUrl}/api/billing/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bill),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('[FastAPI] Fallback for saveBill:', e);
    }
    return bill;
  }

  async dispatchClosedLoopNotifications(payload: {
    billId: string;
    customerPhone: string;
    managerPhone: string;
    totalAmount: number;
    paymentMethod: string;
    customerMessage: string;
    managerMessage: string;
  }): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/notifications/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (e) {
      console.warn('[FastAPI] Fallback for dispatchClosedLoopNotifications:', e);
      return true;
    }
  }
}

export const amoghApiClient = new AmoghFastApiClient();

