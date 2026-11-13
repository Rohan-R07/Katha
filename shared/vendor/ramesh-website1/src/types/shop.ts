export type Language = 'kn' | 'hi' | 'en';

export type ShopType = 
  | 'kirana' 
  | 'vegetable_fruit' 
  | 'dairy_sweets' 
  | 'bakery' 
  | 'pharmacy' 
  | 'general';

export interface ShopProfile {
  id: string;
  name: string;
  shopkeeperName: string;
  shopType: ShopType;
  primaryPhone: string;
  altPhone: string;
  email?: string;
  address: string;
  marketArea: string;
  pincode: string;
  upiId: string;
  gstNumber?: string;
  preferredLanguage: Language;
  isOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  voiceLocale: string;
}

export const languageOptions: LanguageOption[] = [
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', voiceLocale: 'kn-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', voiceLocale: 'hi-IN' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', voiceLocale: 'en-IN' },
];

