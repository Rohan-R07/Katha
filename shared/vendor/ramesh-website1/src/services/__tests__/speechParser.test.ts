import { describe, it, expect } from 'vitest';
import { parseSpokenOrder } from '../speech';
import { kiranaSeedProducts } from '../seedData';

describe('Voice Speech Order Parser - Kannada, Hindi, English', () => {
  it('correctly parses spoken order in English with fractional weights', () => {
    const transcript = '2 kg sugar, 1 packet maggi, 500g toor dal';
    const { matchedItems, unmatchedSegments } = parseSpokenOrder(transcript, kiranaSeedProducts, 'en');

    expect(unmatchedSegments).toHaveLength(0);
    expect(matchedItems.length).toBeGreaterThanOrEqual(3);

    // Verify Sugar: 2kg @ ₹44 = ₹88
    const sugar = matchedItems.find((i) => i.productId === 'prod_1');
    expect(sugar).toBeDefined();
    expect(sugar?.quantity).toBe(2);
    expect(sugar?.calculatedPrice).toBe(88);

    // Verify Maggi: 1 packet @ ₹14 = ₹14
    const maggi = matchedItems.find((i) => i.productId === 'prod_5');
    expect(maggi).toBeDefined();
    expect(maggi?.calculatedPrice).toBe(14);

    // Verify Toor Dal: 500g (0.5kg) @ ₹165/kg = ₹82.5
    const toorDal = matchedItems.find((i) => i.productId === 'prod_2');
    expect(toorDal).toBeDefined();
    expect(toorDal?.quantity).toBe(0.5);
    expect(toorDal?.calculatedPrice).toBe(82.5);
  });

  it('correctly parses regional Kannada voice order', () => {
    const transcript = 'ಎರಡು ಕೆಜಿ ಸಕ್ಕರೆ, ಒಂದು ಪ್ಯಾಕೆಟ್ ಮ್ಯಾಗಿ, ಅರ್ಧ ಕೆಜಿ ತೊಗರಿ ಬೇಳೆ';
    const { matchedItems } = parseSpokenOrder(transcript, kiranaSeedProducts, 'kn');

    expect(matchedItems.length).toBeGreaterThanOrEqual(3);

    const sugar = matchedItems.find((i) => i.productId === 'prod_1');
    expect(sugar).toBeDefined();
    expect(sugar?.quantity).toBe(2);

    const dal = matchedItems.find((i) => i.productId === 'prod_2');
    expect(dal).toBeDefined();
    expect(dal?.quantity).toBe(0.5);
  });

  it('correctly parses regional Hindi voice order', () => {
    const transcript = 'दो किलो चीनी, एक पैकेट मैगी, आधा किलो दाल';
    const { matchedItems } = parseSpokenOrder(transcript, kiranaSeedProducts, 'hi');

    expect(matchedItems.length).toBeGreaterThanOrEqual(3);

    const sugar = matchedItems.find((i) => i.productId === 'prod_1');
    expect(sugar).toBeDefined();
    expect(sugar?.quantity).toBe(2);
  });
});

