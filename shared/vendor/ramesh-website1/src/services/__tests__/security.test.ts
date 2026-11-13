import { describe, it, expect } from 'vitest';
import { 
  isValidIndianMobile, 
  sanitizeInput, 
  generateUpiIntentUri, 
  generateGoogleMapsSearchUrl 
} from '../security';

describe('Security & Google Services Integration', () => {
  it('validates 10-digit Indian cellular mobile numbers', () => {
    expect(isValidIndianMobile('9845012345')).toBe(true);
    expect(isValidIndianMobile('8765432109')).toBe(true);
    expect(isValidIndianMobile('7012345678')).toBe(true);
    expect(isValidIndianMobile('6361234567')).toBe(true);
    expect(isValidIndianMobile('+91 9845012345')).toBe(true);

    // Invalid numbers
    expect(isValidIndianMobile('1234567890')).toBe(false); // starts with 1
    expect(isValidIndianMobile('984501234')).toBe(false); // only 9 digits
    expect(isValidIndianMobile('984501234567')).toBe(false); // too long
  });

  it('sanitizes malicious script tags and XSS inputs', () => {
    expect(sanitizeInput('<script>alert("hack")</script>Hello')).toBe('scriptalert("hack")/scriptHello');
    expect(sanitizeInput('   Sri Manjunatha Stores   ')).toBe('Sri Manjunatha Stores');
  });

  it('generates standard Google Pay / NPCI UPI Intent URI', () => {
    const uri = generateUpiIntentUri({
      upiId: 'shop@upi',
      merchantName: 'Sri Manjunatha Kirana',
      amount: 245.5,
      billNumber: 'KH-1001',
    });

    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=shop%40upi');
    expect(uri).toContain('am=245.50');
    expect(uri).toContain('cu=INR');
  });

  it('generates Google Maps query URL for Kirana market navigation', () => {
    const mapsUrl = generateGoogleMapsSearchUrl('Main Road', 'Malleshwaram', '560003');
    expect(mapsUrl).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(mapsUrl).toContain('Malleshwaram');
  });
});

