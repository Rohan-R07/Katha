import { ShopProfile, Language } from '../types/shop';
import { Product } from '../types/inventory';
import { RohanVoiceConfig, VoiceVocabularyItem } from '../types/voice';
import { API_BASE_URL } from './api';

export function generateRohanVoiceConfig(
  shop: ShopProfile,
  products: Product[],
  language: Language
): RohanVoiceConfig {
  const speechLocale = language === 'kn' ? 'kn-IN' : language === 'hi' ? 'hi-IN' : 'en-IN';

  const catalogDictionary: VoiceVocabularyItem[] = products.map((p) => {
    const aliases = new Set<string>();
    aliases.add(p.name.toLowerCase());
    if (p.nameKannada) aliases.add(p.nameKannada.toLowerCase());
    if (p.nameHindi) aliases.add(p.nameHindi.toLowerCase());
    (p.voiceKeywords || []).forEach((k) => aliases.add(k.toLowerCase()));

    return {
      canonicalName: p.name,
      aliases: Array.from(aliases),
      category: p.category,
      unit: p.unit,
      defaultPrice: p.pricePerUnit,
    };
  });

  return {
    version: '2.0.0-khata-production',
    generatedAt: new Date().toISOString(),
    shopId: shop.id,
    shopName: shop.name,
    shopkeeperName: shop.shopkeeperName,
    preferredLanguage: language,
    speechLocale,
    fallbackLocale: 'en-IN',
    amoghApiBaseUrl: API_BASE_URL,
    endpoints: {
      parseVoiceOrder: `${API_BASE_URL}/api/voice/parse-order`,
      verifyProduct: `${API_BASE_URL}/api/inventory/verify`,
      confirmBill: `${API_BASE_URL}/api/billing/invoices`,
    },
    supportedUnits: [
      { unit: 'kg', spokenAliases: ['kg', 'kilo', 'kilogram', 'ಕೆಜಿ', 'ಕಿಲೋ', 'किलो', 'किलोग्राम'] },
      { unit: 'gram', spokenAliases: ['g', 'gm', 'gram', 'grams', 'ಗ್ರಾಂ', 'ಗ್ರಾಮ್', 'ग्राम'] },
      { unit: 'packet', spokenAliases: ['pkt', 'packet', 'packets', 'ಪ್ಯಾಕೆಟ್', 'पैकेट'] },
      { unit: 'piece', spokenAliases: ['pc', 'piece', 'pieces', 'ಪೀಸ್', 'ಟುಕ್ಡಾ', 'नग'] },
      { unit: 'litre', spokenAliases: ['l', 'ltr', 'litre', 'litres', 'ಲೀಟರ್', 'लीटर'] },
      { unit: 'pouch', spokenAliases: ['pouch', 'pouches', 'ಪೌಚ್', 'पाउच'] },
      { unit: 'bottle', spokenAliases: ['bottle', 'bottles', 'ಬಾಟಲ್', 'बोतल'] },
      { unit: 'box', spokenAliases: ['box', 'boxes', 'ಡಬ್ಬ', 'ಪೆಟ್ಟಿಗೆ', 'डिब्बा'] },
    ],
    weightParameters: [
      { label: 'Quarter KG / 250g', multiplier: 0.25, spokenAliases: ['250g', 'paavu', 'pao', 'ಕಾಲು ಕೆಜಿ', 'पाव किलो'] },
      { label: 'Half KG / 500g', multiplier: 0.5, spokenAliases: ['500g', 'adha', 'ardha', 'ಅರ್ಧ ಕೆಜಿ', 'आधा किलो'] },
      { label: '1 KG', multiplier: 1.0, spokenAliases: ['1kg', 'one kg', 'ondh kilo', 'ಒಂದು ಕೆಜಿ', 'एक किलो'] },
      { label: '2 KG', multiplier: 2.0, spokenAliases: ['2kg', 'two kg', 'eradu kilo', 'ಎರಡು ಕೆಜಿ', 'दो किलो'] },
      { label: '5 KG', multiplier: 5.0, spokenAliases: ['5kg', 'five kg', 'aidhu kilo', 'ಐದು ಕೆಜಿ', 'पांच किलो'] },
    ],
    catalogDictionary,
    ttsSettings: {
      voiceRate: 0.95,
      voicePitch: 1.0,
      billingAnnouncementTemplate:
        language === 'kn'
          ? '{shopName}. ಒಟ್ಟು ಬಿಲ್ ಮೊತ್ತ {total} ರೂಪಾಯಿಗಳು. ದಯವಿಟ್ಟು ಯುಪಿಐ ಅಥವಾ ನಗದು ಮೂಲಕ ಪಾವತಿಸಿ.'
          : language === 'hi'
          ? '{shopName}. कुल बिल राशि {total} रुपये है। कृपया यूपीआई या कैश से भुगतान करें।'
          : '{shopName}. Your total bill is {total} Rupees. Please pay via UPI or Cash.',
      paymentSuccessTemplate:
        language === 'kn'
          ? '{amount} ರೂಪಾಯಿ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ಧನ್ಯವಾದಗಳು!'
          : language === 'hi'
          ? '{amount} रुपये का भुगतान सफलतापूर्वक प्राप्त हुआ। धन्यवाद!'
          : 'Payment of {amount} Rupees received successfully. Thank you!',
    },
  };
}

export function downloadVoiceConfigJson(config: RohanVoiceConfig): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `rohan_voice_config_${config.preferredLanguage}_${config.shopId}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

