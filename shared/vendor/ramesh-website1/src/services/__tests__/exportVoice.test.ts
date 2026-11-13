import { describe, it, expect } from 'vitest';
import { generateRohanVoiceConfig } from '../exportVoice';
import { initialShopProfile, kiranaSeedProducts } from '../seedData';

describe('Rohan AI Voice Assistant Export Specification', () => {
  it('generates a compliant voice configuration for speech services', () => {
    const config = generateRohanVoiceConfig(initialShopProfile, kiranaSeedProducts, 'kn');

    expect(config.preferredLanguage).toBe('kn');
    expect(config.speechLocale).toBe('kn-IN');
    expect(config.shopId).toBe(initialShopProfile.id);
    expect(config.endpoints.parseVoiceOrder).toContain('/api/voice/parse-order');

    // Vocabulary dictionary contains all products
    expect(config.catalogDictionary.length).toBe(kiranaSeedProducts.length);

    // Verify Sugar contains Kannada and Hindi spoken aliases
    const sugarVocab = config.catalogDictionary.find((c) => c.canonicalName.includes('Sugar'));
    expect(sugarVocab).toBeDefined();
    expect(sugarVocab?.aliases).toContain('sakkare');
    expect(sugarVocab?.aliases).toContain('cheeni');

    // Verify weight multipliers
    const halfKg = config.weightParameters.find((w) => w.multiplier === 0.5);
    expect(halfKg).toBeDefined();
    expect(halfKg?.spokenAliases).toContain('adha');
    expect(halfKg?.spokenAliases).toContain('500g');
  });
});

