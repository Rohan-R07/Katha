import { Language } from './shop';

export interface VoiceVocabularyItem {
  canonicalName: string;
  aliases: string[];
  category: string;
  unit: string;
  defaultPrice: number;
}

export interface RohanVoiceConfig {
  version: string;
  generatedAt: string;
  shopId: string;
  shopName: string;
  shopkeeperName: string;
  preferredLanguage: Language;
  speechLocale: string; // 'kn-IN' | 'hi-IN' | 'en-IN'
  fallbackLocale: string;
  amoghApiBaseUrl: string;
  endpoints: {
    parseVoiceOrder: string;
    verifyProduct: string;
    confirmBill: string;
  };
  supportedUnits: {
    unit: string;
    spokenAliases: string[];
  }[];
  weightParameters: {
    label: string;
    multiplier: number;
    spokenAliases: string[];
  }[];
  catalogDictionary: VoiceVocabularyItem[];
  ttsSettings: {
    voiceRate: number;
    voicePitch: number;
    billingAnnouncementTemplate: string;
    paymentSuccessTemplate: string;
  };
}

export interface VoiceParsedItem {
  matchedProductId?: string;
  rawItemName: string;
  quantity: number;
  unit: string;
  confidence: number;
  pricePerUnit?: number;
  calculatedPrice?: number;
}

export interface VoiceParseResponse {
  transcript: string;
  languageDetected: string;
  parsedItems: VoiceParsedItem[];
  unmatchedPhrases: string[];
  confidence: number;
}

