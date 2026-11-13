export interface KhataTransaction {
  id: string;
  customerId: string;
  billId?: string;
  type: 'credit' | 'payment'; // credit = udhar taken, payment = jama paid back
  amount: number;
  balanceAfter: number;
  description: string;
  date: string; // ISO string
  recordedBy: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  primaryPhone: string;
  altPhone: string; // Mandatory for persistent contact follow-ups
  altPhoneLabel?: string; // e.g. "Spouse", "Father", "Shop/Office", "Neighbour"
  address?: string;
  creditLimit: number;
  outstandingBalance: number; // positive = customer owes shopkeeper
  lastTransactionDate: string;
  lastReminderSentAt?: string;
  transactions: KhataTransaction[];
  createdAt: string;
}

