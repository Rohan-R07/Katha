import { Language } from '../types/shop';
import { Product } from '../types/inventory';
import { CartItem } from '../types/billing';

// Locale mappings
export const LANGUAGE_LOCALES: Record<Language, string> = {
  kn: 'kn-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

// Speech Recognition helper
export class SpeechService {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
      }
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  startListening(
    language: Language,
    onResult: (transcript: string) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ) {
    if (!this.recognition) {
      onError('Speech recognition is not supported in this browser. Please use Chrome/Edge or sample voice buttons.');
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    }

    this.recognition.lang = LANGUAGE_LOCALES[language] || 'en-IN';

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError(event.error || 'Speech recognition error occurred');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      onError(e.message || 'Could not start microphone');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Helper to play high-quality Indic audio via backend TTS streaming
  private playTtsAudio(text: string, language: Language): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const audioUrl = `/api/ai/tts?text=${encodeURIComponent(text)}&language=${encodeURIComponent(language)}`;
        const audio = new Audio(audioUrl);
        audio.onended = () => resolve(true);
        audio.onerror = () => resolve(false);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => resolve(false));
        }
      } catch {
        resolve(false);
      }
    });
  }

  // Voice Announcement: Speaks the final bill aloud
  async speakBillAnnouncement(totalAmount: number, language: Language, shopName: string): Promise<void> {
    let text = '';
    if (language === 'kn') {
      text = `${shopName}. ಒಟ್ಟು ಬಿಲ್ ಮೊತ್ತ ${totalAmount} ರೂಪಾಯಿಗಳು. ದಯವಿಟ್ಟು ಯುಪಿಐ ಅಥವಾ ನಗದು ಮೂಲಕ ಪಾವತಿಸಿ.`;
    } else if (language === 'hi') {
      text = `${shopName}. कुल बिल राशि ${totalAmount} रुपये है। कृपया यूपीआई या कैश से भुगतान करें।`;
    } else {
      text = `Thank you for shopping at ${shopName}. Your total bill is ${totalAmount} Rupees. Please pay via UPI or Cash.`;
    }

    // Attempt high quality neural Indic audio first
    const audioPlayed = await this.playTtsAudio(text, language);
    if (audioPlayed) return;

    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis is not supported in this browser or environment.');
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // cancel any active speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_LOCALES[language] || 'en-IN';
      utterance.rate = 0.95; // gentle, clear pace for shopkeeper and customer
      utterance.pitch = 1.0;

      // Find best regional voice if available
      const voices = window.speechSynthesis.getVoices();
      const targetLang = LANGUAGE_LOCALES[language];
      const matchVoice = voices.find((v) => v.lang === targetLang || v.lang.startsWith(language));
      if (matchVoice) {
        utterance.voice = matchVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  // Speaks payment success confirmation
  async speakPaymentSuccess(amount: number, language: Language, customerName?: string): Promise<void> {
    let text = '';
    if (language === 'kn') {
      text = customerName
        ? `${customerName} ಅವರೇ, ${amount} ರೂಪಾಯಿ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ಧನ್ಯವಾದಗಳು!`
        : `${amount} ರೂಪಾಯಿ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ. ಧನ್ಯವಾದಗಳು!`;
    } else if (language === 'hi') {
      text = customerName
        ? `${customerName} जी, ${amount} रुपये का भुगतान सफलतापूर्वक प्राप्त हुआ। धन्यवाद!`
        : `${amount} रुपये का भुगतान सफलतापूर्वक प्राप्त हुआ। धन्यवाद!`;
    } else {
      text = customerName
        ? `Payment of ${amount} Rupees from ${customerName} received successfully. Thank you!`
        : `Payment of ${amount} Rupees received successfully. Thank you!`;
    }

    // Attempt high quality neural Indic audio first
    const audioPlayed = await this.playTtsAudio(text, language);
    if (audioPlayed) return;

    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_LOCALES[language] || 'en-IN';
      utterance.rate = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  // Spoken voice guidance for village and local shopkeepers
  speakAudioGuide(language: Language): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      let text = '';
      if (language === 'kn') {
        text = 'ಖಾತಾ ಎಐಗೆ ಸುಸ್ವಾಗತ. ಸರಕುಗಳನ್ನು ಧ್ವನಿಯ ಮೂಲಕ ಬಿಲ್ ಮಾಡಲು ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ. ಯಾವುದೇ ಗ್ರಾಹಕರ ಬಾಕಿ ವಸೂಲಿಗೆ ಅವರ ಮುಖ್ಯ ಮತ್ತು ಪರ್ಯಾಯ ನಂಬರ್‌ಗೆ ವಾಟ್ಸಾಪ್ ಸಂದೇಶ ಕಳುಹಿಸಿ.';
      } else if (language === 'hi') {
        text = 'खाता एआई में आपका स्वागत है। बोलकर बिल बनाने के लिए माइक दबाएं। ग्राहकों से उधारी वसूलने के लिए उनके मुख्य और दूसरे नंबर पर व्हाट्सएप भेजें।';
      } else {
        text = 'Welcome to Khata AI. Tap the microphone to speak your bill orders. Send WhatsApp invoices to customer primary and alternate mobile numbers for fast recovery.';
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_LOCALES[language] || 'en-IN';
      utterance.rate = 0.95;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const speechService = new SpeechService();

// Local intelligent Voice Order Parser
// Parses spoken statements like "2 kg sugar, 1 packet maggi, 500g toor dal, 1 packet milk"
// or Kannada: "ಎರಡು ಕೆಜಿ ಸಕ್ಕರೆ, ಒಂದು ಪ್ಯಾಕೆಟ್ ಮ್ಯಾಗಿ, ಅರ್ಧ ಕೆಜಿ ತೊಗರಿ ಬೇಳೆ"
export function parseSpokenOrder(
  transcript: string,
  products: Product[],
  _language: Language
): { matchedItems: CartItem[]; unmatchedSegments: string[] } {
  const matchedItems: CartItem[] = [];
  const unmatchedSegments: string[] = [];

  // Normalize delimiters (commas, 'and', 'ಮತ್ತು', 'और', plus, semicolons)
  const segments = transcript
    .toLowerCase()
    .replace(/(?<=^|[^\p{L}\p{N}])(and|ಮತ್ತು|और|\+)(?=[^\p{L}\p{N}]|$)/gui, ',')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const segment of segments) {
    let matched = false;

    // Detect numeric quantity or Kannada/Hindi number words
    let quantity = 1;
    let weightInKg: number | undefined = undefined;

    // Number word replacement using Unicode word boundaries
    let cleanSegment = segment
      .replace(/(?<=^|[^\p{L}\p{N}])(one|ಒಂದು|एक)(?=[^\p{L}\p{N}]|$)/gui, '1')
      .replace(/(?<=^|[^\p{L}\p{N}])(two|ಎರಡು|दो)(?=[^\p{L}\p{N}]|$)/gui, '2')
      .replace(/(?<=^|[^\p{L}\p{N}])(three|ಮೂರು|तीन)(?=[^\p{L}\p{N}]|$)/gui, '3')
      .replace(/(?<=^|[^\p{L}\p{N}])(four|ನಾಲ್ಕು|चार)(?=[^\p{L}\p{N}]|$)/gui, '4')
      .replace(/(?<=^|[^\p{L}\p{N}])(five|ಐದು|पांच)(?=[^\p{L}\p{N}]|$)/gui, '5')
      .replace(/(?<=^|[^\p{L}\p{N}])(ten|ಹತ್ತು|दस)(?=[^\p{L}\p{N}]|$)/gui, '10')
      .replace(/(?<=^|[^\p{L}\p{N}])(adha|ardha|ಅರ್ಧ|आधा)\s*(kg|kilo|ಕೆಜಿ|किलो)?(?=[^\p{L}\p{N}]|$)/gui, '0.5 kg')
      .replace(/(?<=^|[^\p{L}\p{N}])(paavu|pao|ಕಾಲು|पाव)\s*(kg|kilo|ಕೆಜಿ|किलो)?(?=[^\p{L}\p{N}]|$)/gui, '0.25 kg');

    // Extract weight like "500g", "500 g", "250g", "2.5 kg", "2 kg"
    const weightGramsMatch = cleanSegment.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|grams|ಗ್ರಾಂ|ग्राम)(?=[^\p{L}\p{N}]|$)/iu);
    const weightKgMatch = cleanSegment.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|ಕೆಜಿ|किलो)(?=[^\p{L}\p{N}]|$)/iu);
    const plainQtyMatch = cleanSegment.match(/^(\d+(?:\.\d+)?)(?=[^\p{L}\p{N}]|$)/u);

    if (weightGramsMatch) {
      const grams = parseFloat(weightGramsMatch[1]);
      weightInKg = grams / 1000;
      quantity = weightInKg;
    } else if (weightKgMatch) {
      weightInKg = parseFloat(weightKgMatch[1]);
      quantity = weightInKg;
    } else if (plainQtyMatch) {
      quantity = parseFloat(plainQtyMatch[1]);
    }

    // Match against inventory
    for (const product of products) {
      // Build candidate list of strings for this product
      const candidates = [
        product.name.toLowerCase(),
        product.nameKannada?.toLowerCase() || '',
        product.nameHindi?.toLowerCase() || '',
        ...(product.voiceKeywords || []).map((k) => k.toLowerCase()),
      ].filter(Boolean);

      // Check if any candidate keyword exists in this segment
      const isMatch = candidates.some((keyword) => {
        // match exact phrase or significant word
        const words = keyword.split(/\s+/).filter((w) => w.length > 2);
        return cleanSegment.includes(keyword) || words.some((w) => cleanSegment.includes(w));
      });

      if (isMatch) {
        let calculatedPrice = 0;
        if (product.pricingType === 'per_kg') {
          // Weight calculation
          const effectiveKg = weightInKg !== undefined ? weightInKg : quantity;
          calculatedPrice = Math.round(product.pricePerUnit * effectiveKg * 100) / 100;
        } else {
          calculatedPrice = Math.round(product.pricePerUnit * quantity * 100) / 100;
        }

        matchedItems.push({
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          productId: product.id,
          productName: product.name,
          productNameKannada: product.nameKannada,
          productNameHindi: product.nameHindi,
          unit: product.unit,
          quantity: quantity,
          weightInKg: weightInKg,
          unitPrice: product.pricePerUnit,
          calculatedPrice,
        });

        matched = true;
        break;
      }
    }

    if (!matched) {
      unmatchedSegments.push(segment);
    }
  }

  return { matchedItems, unmatchedSegments };
}

