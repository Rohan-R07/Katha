// Security & Validation Helpers for Project Khata

/**
 * Validates whether a phone number is a valid 10-digit Indian mobile number.
 * Typical Indian cellular format: starts with 6, 7, 8, or 9 followed by 9 digits.
 */
export function isValidIndianMobile(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return /^[6-9]\d{9}$/.test(digits);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return /^[6-9]\d{9}$/.test(digits.substring(2));
  }
  return false;
}

/**
 * Sanitizes user input string against XSS injections and trims whitespace.
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // remove direct html tag characters
    .trim();
}

/**
 * Generates an official Google Pay / NPCI Unified Payments Interface (UPI) Intent URI.
 * Allows customers to open GPay, PhonePe, Paytm, or BHIM directly.
 */
export function generateUpiIntentUri(params: {
  upiId: string;
  merchantName: string;
  amount: number;
  billNumber: string;
}): string {
  const cleanUpi = encodeURIComponent(params.upiId.trim());
  const cleanName = encodeURIComponent(params.merchantName.trim());
  const cleanAmount = params.amount.toFixed(2);
  const cleanNote = encodeURIComponent(`Khata_Bill_${params.billNumber}`);

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}`;
}

/**
 * Generates an official Google Maps search query link for the Kirana shop's market location.
 */
export function generateGoogleMapsSearchUrl(address: string, marketArea: string, pincode: string): string {
  const query = encodeURIComponent(`${address}, ${marketArea}, ${pincode}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

