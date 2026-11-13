import { Bill, DispatchedMessage } from '../types/billing';
import { ShopProfile } from '../types/shop';
import { Customer } from '../types/customer';

// Clean and sanitize phone number for WhatsApp link
export function sanitizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

// Generate formatted WhatsApp invoice text for customer
export function generateCustomerInvoiceText(
  shop: ShopProfile,
  bill: Bill,
  outstandingDue?: number
): string {
  const itemsText = bill.items
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}*\n   ಅಳತೆ/Qty: ${item.quantity} ${item.unit} | ₹${item.unitPrice} → *₹${item.calculatedPrice}*`
    )
    .join('\n');

  let text = `🏪 *${shop.name.toUpperCase()}*\n`;
  text += `📍 ${shop.address}, ${shop.marketArea} (PIN: ${shop.pincode})\n`;
  text += `📞 ಅಂಗಡಿ Ph: ${shop.primaryPhone} | Alt: ${shop.altPhone}\n`;
  if (shop.gstNumber) text += `📋 GST: ${shop.gstNumber}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🧾 *ಡಿಜಿಟಲ್ ಬಿಲ್ ರಸೀದಿ / BILL: ${bill.billNumber}*\n`;
  text += `📅 ದಿನಾಂಕ/Date: ${new Date(bill.createdAt).toLocaleString()}\n`;
  if (bill.customerName) text += `👤 ಗ್ರಾಹಕರು/Customer: *${bill.customerName}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*ಖರೀದಿಸಿದ ಸರಕುಗಳು / ITEMS:*\n\n${itemsText}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 ಮೂಲ ಮೊತ್ತ/Subtotal: ₹${bill.subtotal}\n`;
  if (bill.discount > 0) text += `🏷️ ರಿಯಾಯಿತಿ/Discount: -₹${bill.discount}\n`;
  text += `💵 *ಒಟ್ಟು ಅಂತಿಮ ಮೊತ್ತ / TOTAL: ₹${bill.total}*\n`;
  text += `💳 ಪಾವತಿ ವಿಧಾನ / Mode: *${bill.paymentMethod.toUpperCase()}* (${bill.paymentStatus === 'completed' ? 'PAID ✅ ಪಾವತಿಯಾಗಿದೆ' : 'ADDED TO KHATA 📝 ಖಾತೆಗೆ ಬರೆಯಲಾಗಿದೆ'})\n`;

  if (outstandingDue !== undefined && outstandingDue > 0) {
    text += `\n⚠️ *ಒಟ್ಟು ಬಾಕಿ ಮೊತ್ತ / TOTAL KHATA DUE:* *₹${outstandingDue}*\n`;
  }

  text += `\n✨ UPI ಮೂಲಕ ಪಾವತಿಸಿ: *${shop.upiId}*\n`;
  text += `🙏 *ನಮ್ಮ ಅಂಗಡಿಗೆ ಭೇಟಿ ನೀಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು! Visit Again.*`;

  return text;
}

// Automated payment completion message sent to customer's REGISTERED PRIMARY NUMBER
export function generateCustomerPaymentSuccessText(
  shop: ShopProfile,
  bill: Bill,
  remainingBalance?: number
): string {
  let text = `✅ *ಪಾವತಿ ದೃಢೀಕರಣ / PAYMENT CONFIRMED*\n`;
  text += `🏪 *${shop.name}*\n\n`;
  text += `ಗೌರವಾನ್ವಿತ ಗ್ರಾಹಕರಾದ ${bill.customerName || 'ಗ್ರಾಹಕರೇ'},\n`;
  text += `ಬಿಲ್ ನಂ *#${bill.billNumber}* ಗಾಗಿ *₹${bill.total}* ಪಾವತಿಯು *${bill.paymentMethod.toUpperCase()}* ಮೂಲಕ ಯಶಸ್ವಿಯಾಗಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.\n\n`;
  if (remainingBalance !== undefined && remainingBalance > 0) {
    text += `📊 ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಉಳಿದ ಬಾಕಿ ಮೊತ್ತ: *₹${remainingBalance}*\n\n`;
  } else if (remainingBalance === 0) {
    text += `🎉 ನಿಮ್ಮ ಎಲ್ಲಾ ಖಾತಾ ಬಾಕಿ ಚುಕ್ತಾ ಆಗಿದೆ (₹0)!\n\n`;
  }
  text += `ಸಕಾಲಿಕ ಪಾವತಿಗೆ ಧನ್ಯವಾದಗಳು! 🙏\n`;
  text += `ಸಂಪರ್ಕ: ${shop.primaryPhone}`;
  return text;
}

// Automated notification sent to customer's ALTERNATE NUMBER (Family / Spouse / Emergency)
export function generateAlternateNumberNotificationText(
  shop: ShopProfile,
  bill: Bill,
  customer?: Customer
): string {
  const altRelation = customer?.altPhoneLabel || 'ಕುಟುಂಬದವರು / Family';
  let text = `👨‍👩‍👧 *[ಕುಟುಂಬದ ರಸೀದಿ ಮಾಹಿತಿ / FAMILY RECEIPT]*\n`;
  text += `🏪 *${shop.name}*\n\n`;
  text += `ನಮಸ್ಕಾರ (${altRelation}),\n`;
  text += `ನಿಮ್ಮ ಕುಟುಂಬದ ಸದಸ್ಯರಾದ *${bill.customerName || 'ಗ್ರಾಹಕರು'}* ಅವರ ಅಂಗಡಿ ಖರೀದಿಯ ಅಧಿಕೃತ ರಸೀದಿ ವಿವರ:\n\n`;
  text += `🧾 ಬಿಲ್ ಸಂಖ್ಯೆ: *${bill.billNumber}*\n`;
  text += `💰 ಬಿಲ್ ಮೊತ್ತ: *₹${bill.total}*\n`;
  text += `💳 ಸ್ಥಿತಿ: *${bill.paymentStatus === 'completed' ? 'ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ (PAID ✅)' : 'ಖಾತಾ ಉದ್ದಾರಕ್ಕೆ ಸೇರಿಸಲಾಗಿದೆ (KHATA 📝)'}*\n`;
  if (customer && customer.outstandingBalance > 0) {
    text += `📊 ಉಳಿದ ಒಟ್ಟು ಖಾತಾ ಬಾಕಿ: *₹${customer.outstandingBalance}*\n`;
  }
  text += `\nಅಂಗಡಿ ವಿಳಾಸ: ${shop.address}, ${shop.marketArea}\n`;
  text += `ಅಂಗಡಿ ಮಾಲೀಕರ ಮೊಬೈಲ್: ${shop.primaryPhone}`;
  return text;
}

// Automated payment completion alert sent to shopkeeper / manager
export function generateManagerPaymentAlertText(
  shop: ShopProfile,
  bill: Bill,
  customer?: Customer
): string {
  let text = `🔔 *[ಖಾತಾ AI ಮ್ಯಾನೇಜರ್ ಅಲರ್ಟ್] ಹೊಸ ಪಾವತಿ*\n\n`;
  text += `💰 *ಸ್ವೀಕೃತ ಮೊತ್ತ:* ₹${bill.total}\n`;
  text += `🧾 *ಬಿಲ್ ಸಂಖ್ಯೆ:* ${bill.billNumber}\n`;
  text += `💳 *ವಿಧಾನ:* ${bill.paymentMethod.toUpperCase()}\n`;
  text += `👤 *ಗ್ರಾಹಕರು:* ${bill.customerName || 'Walk-in'}\n`;
  text += `📱 *ನೋಂದಾಯಿತ ಸಂಖ್ಯೆ (Primary):* ${bill.customerPrimaryPhone || customer?.primaryPhone || 'N/A'}\n`;
  text += `📞 *ಪರ್ಯಾಯ ಸಂಖ್ಯೆ (Alternate):* ${bill.customerAltPhone || customer?.altPhone || 'N/A'}\n`;
  if (customer) {
    text += `📊 *ಉಳಿದ ಬಾಕಿ:* ₹${customer.outstandingBalance}\n`;
  }
  text += `⏰ *ಸಮಯ:* ${new Date().toLocaleTimeString()}\n`;
  text += `\nಸ್ಥಿತಿ: Amogh's Central FastAPI & PostgreSQL Synced`;
  return text;
}

// Generate direct WhatsApp click link
export function createWhatsAppUrl(phone: string, text: string): string {
  const cleanNumber = sanitizePhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

// Dispatches closed-loop automated messages to BOTH Primary AND Alternate numbers
export function dispatchClosedLoopMessages(
  bill: Bill,
  shop: ShopProfile,
  customer?: Customer
): DispatchedMessage[] {
  const messages: DispatchedMessage[] = [];
  const now = new Date().toISOString();

  // 1. Message to Customer REGISTERED PRIMARY Number
  const customerPhone = bill.customerPrimaryPhone || customer?.primaryPhone;
  if (customerPhone) {
    const custText =
      bill.paymentStatus === 'completed'
        ? generateCustomerPaymentSuccessText(shop, bill, customer?.outstandingBalance)
        : generateCustomerInvoiceText(shop, bill, customer?.outstandingBalance);

    messages.push({
      id: `msg_cust_pri_${Date.now()}`,
      billId: bill.id,
      type: 'customer_receipt',
      recipientRole: 'Customer',
      recipientName: `${bill.customerName || 'Customer'} (Registered No)`,
      recipientPhone: customerPhone,
      messageText: custText,
      channel: 'WhatsApp',
      sentAt: now,
      status: 'sent',
    });
  }

  // 2. MANDATORY: Message to Customer ALTERNATE Number (Spouse / Family)
  const altPhone = bill.customerAltPhone || customer?.altPhone;
  if (altPhone && altPhone !== customerPhone) {
    const altText = generateAlternateNumberNotificationText(shop, bill, customer);
    messages.push({
      id: `msg_cust_alt_${Date.now() + 1}`,
      billId: bill.id,
      type: 'customer_receipt',
      recipientRole: 'Customer',
      recipientName: `${bill.customerName || 'Customer'} (Alternate No: ${customer?.altPhoneLabel || 'Family'})`,
      recipientPhone: altPhone,
      messageText: altText,
      channel: 'WhatsApp',
      sentAt: now,
      status: 'sent',
    });
  }

  // 3. Alert to Shop Manager
  const managerText = generateManagerPaymentAlertText(shop, bill, customer);
  messages.push({
    id: `msg_mgr_${Date.now() + 2}`,
    billId: bill.id,
    type: 'manager_alert',
    recipientRole: 'Shop Manager',
    recipientName: shop.shopkeeperName,
    recipientPhone: shop.primaryPhone,
    messageText: managerText,
    channel: 'WhatsApp',
    sentAt: now,
    status: 'sent',
  });

  return messages;
}
