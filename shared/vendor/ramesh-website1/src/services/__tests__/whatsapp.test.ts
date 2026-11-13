import { describe, it, expect } from 'vitest';
import { 
  sanitizePhoneNumber, 
  generateCustomerInvoiceText, 
  dispatchClosedLoopMessages, 
  createWhatsAppUrl 
} from '../whatsapp';
import { initialShopProfile, initialBills, initialCustomers } from '../seedData';

describe('WhatsApp Closed-Loop Invoicing & Dual Messaging', () => {
  it('correctly sanitizes Indian mobile numbers into international format', () => {
    expect(sanitizePhoneNumber('9845012345')).toBe('919845012345');
    expect(sanitizePhoneNumber('+91 98450-12345')).toBe('919845012345');
    expect(sanitizePhoneNumber('919845012345')).toBe('919845012345');
  });

  it('generates direct WhatsApp URL with URL-encoded parameters', () => {
    const url = createWhatsAppUrl('9845012345', 'Hello Kirana Bill');
    expect(url).toContain('https://wa.me/919845012345?text=Hello%20Kirana%20Bill');
  });

  it('generates itemized Kirana bill text with shop name and UPI ID', () => {
    const bill = initialBills[0];
    const text = generateCustomerInvoiceText(initialShopProfile, bill, 0);

    expect(text).toContain(initialShopProfile.name.toUpperCase());
    expect(text).toContain(initialShopProfile.upiId);
    expect(text).toContain(bill.billNumber);
    expect(text).toContain(`₹${bill.total}`);
  });

  it('MANDATORY: dispatches automated WhatsApp messages to BOTH Primary AND Alternate numbers', () => {
    const bill = initialBills[0];
    const customer = initialCustomers[0]; // has both primary and altPhone

    const dispatched = dispatchClosedLoopMessages(bill, initialShopProfile, customer);

    // Expect at least 3 messages:
    // 1. To Customer Primary Number
    // 2. To Customer Alternate Number (Family/Spouse)
    // 3. To Shop Manager Alert
    expect(dispatched.length).toBeGreaterThanOrEqual(3);

    const primaryMsg = dispatched.find((m) => m.recipientPhone === (bill.customerPrimaryPhone || customer.primaryPhone));
    expect(primaryMsg).toBeDefined();

    const targetAltPhone = bill.customerAltPhone || customer.altPhone;
    const altMsg = dispatched.find((m) => m.recipientPhone === targetAltPhone);
    expect(altMsg).toBeDefined();
    expect(altMsg?.messageText).toContain('ಕುಟುಂಬದ ರಸೀದಿ ಮಾಹಿತಿ');

    const managerMsg = dispatched.find((m) => m.recipientRole === 'Shop Manager');
    expect(managerMsg).toBeDefined();
  });
});
