import { UnitType } from './inventory';

export type PaymentMethod = 'cash' | 'upi' | 'khata';
export type PaymentStatus = 'completed' | 'credit' | 'pending';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productNameKannada?: string;
  productNameHindi?: string;
  unit: UnitType;
  quantity: number; // e.g. 2 packets or 1.5 kg
  weightInKg?: number; // for per-kg items (e.g. 0.5 kg for 500g)
  unitPrice: number;
  calculatedPrice: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId?: string;
  customerName?: string;
  customerPrimaryPhone?: string;
  customerAltPhone?: string; // Persistent visibility requirement
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  voiceTranscript?: string;
  createdAt: string;
  customerMessageSent?: boolean;
  managerMessageSent?: boolean;
}

export interface DispatchedMessage {
  id: string;
  billId: string;
  type: 'customer_receipt' | 'manager_alert';
  recipientRole: 'Customer' | 'Shop Manager';
  recipientName: string;
  recipientPhone: string;
  messageText: string;
  channel: 'WhatsApp' | 'SMS';
  sentAt: string;
  status: 'sent' | 'pending';
}

