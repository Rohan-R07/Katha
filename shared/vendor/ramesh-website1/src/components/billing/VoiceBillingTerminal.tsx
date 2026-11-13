import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CartItem, PaymentMethod } from '../../types/billing';
import { Customer } from '../../types/customer';
import { Product } from '../../types/inventory';
import { speechService, parseSpokenOrder } from '../../services/speech';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  QrCode, 
  CreditCard, 
  Banknote, 
  BookOpen, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Sparkles, 
  MessageSquare, 
  AlertCircle, 
  Share2, 
  X, 
  Check, 
  Receipt,
  Radio,
  ExternalLink,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { 
  createWhatsAppUrl, 
  generateCustomerInvoiceText, 
  generateCustomerPaymentSuccessText,
  generateAlternateNumberNotificationText 
} from '../../services/whatsapp';

function generateCartId(productId: string): string {
  return `cart_${Date.now()}_${productId}`;
}

export const VoiceBillingTerminal: React.FC = () => {
  const { 
    products, 
    customers, 
    shopProfile, 
    language, 
    createBill, 
    addProduct,
    addCustomer,
    t 
  } = useApp();

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountAmount] = useState<number>(0);

  // Quick modals for adding Customer & Product right on billing screen
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  const [custForm, setCustForm] = useState({
    name: '',
    primaryPhone: '',
    altPhone: '',
    altPhoneLabel: 'Spouse / Family',
    initialBalance: 0,
    creditLimit: 5000,
  });

  const [prodForm, setProdForm] = useState({
    name: '',
    nameKannada: '',
    nameHindi: '',
    category: 'Staples & Grains',
    pricingType: 'per_unit',
    pricePerUnit: 50,
    unit: 'packet',
    stockQuantity: 50,
    emoji: '🌾',
  });

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name || !custForm.primaryPhone) return;
    const newCust = await addCustomer({
      name: custForm.name,
      primaryPhone: custForm.primaryPhone,
      altPhone: custForm.altPhone || custForm.primaryPhone,
      altPhoneLabel: custForm.altPhoneLabel || 'Family',
      creditLimit: Number(custForm.creditLimit) || 5000,
      initialBalance: Number(custForm.initialBalance) || 0,
      address: 'Market Area',
    });
    setSelectedCustomer(newCust);
    setIsAddCustomerModalOpen(false);
    setCustForm({
      name: '',
      primaryPhone: '',
      altPhone: '',
      altPhoneLabel: 'Spouse / Family',
      initialBalance: 0,
      creditLimit: 5000,
    });
  };

  const handleQuickAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name || !prodForm.pricePerUnit) return;
    await addProduct({
      name: prodForm.name,
      nameKannada: prodForm.nameKannada,
      nameHindi: prodForm.nameHindi,
      category: prodForm.category,
      pricingType: prodForm.pricingType as any,
      pricePerUnit: Number(prodForm.pricePerUnit),
      unit: prodForm.unit as any,
      stockQuantity: Number(prodForm.stockQuantity) || 50,
      minStockAlert: 10,
      emoji: prodForm.emoji || '📦',
      voiceKeywords: [
        prodForm.name.toLowerCase(),
        prodForm.nameKannada?.toLowerCase() || '',
        prodForm.nameHindi?.toLowerCase() || '',
      ].filter(Boolean),
      isAvailable: true,
    });
    setIsAddProductModalOpen(false);
    setProdForm({
      name: '',
      nameKannada: '',
      nameHindi: '',
      category: 'Staples & Grains',
      pricingType: 'per_unit',
      pricePerUnit: 50,
      unit: 'packet',
      stockQuantity: 50,
      emoji: '🌾',
    });
  };

  // Sound box & Voice Announcement
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [soundBoxActive, setSoundBoxActive] = useState(false);

  // Payment & Announcement modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('upi');
  const [completedBill, setCompletedBill] = useState<any | null>(null);
  const [showClosedLoopModal, setShowClosedLoopModal] = useState(false);

  // Quick voice query samples with Kannada, Hindi, and English
  const sampleVoiceQueries = [
    {
      label: 'ಮಾದರಿ 1 (ಕನ್ನಡ)',
      lang: 'kn',
      text: 'ಎರಡು ಕೆಜಿ ಸಕ್ಕರೆ, ಒಂದು ಪ್ಯಾಕೆಟ್ ಮ್ಯಾಗಿ, ಅರ್ಧ ಕೆಜಿ ತೊಗರಿ ಬೇಳೆ, ಒಂದು ಲೀಟರ್ ಎಣ್ಣೆ',
      icon: '🎙️',
    },
    {
      label: 'नमूना 2 (हिंदी)',
      lang: 'hi',
      text: 'दो किलो चीनी, एक पैकेट मैगी, आधा किलो दाल, एक लीटर दूध',
      icon: '🗣️',
    },
    {
      label: 'Sample 3 (English)',
      lang: 'en',
      text: '2 kg sugar, 2 packets maggi, 500g toor dal, 1 litre oil',
      icon: '💬',
    },
  ];

  // Handle Speech Recognition Mic Toggle
  const toggleListening = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    } else {
      setSpeechError(null);
      setIsListening(true);
      speechService.startListening(
        language,
        (text) => {
          setTranscript(text);
          handleProcessSpokenText(text);
          setIsListening(false);
        },
        (err) => {
          setSpeechError(err);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        }
      );
    }
  };

  // Process text into cart items
  const handleProcessSpokenText = (spokenText: string) => {
    const { matchedItems, unmatchedSegments } = parseSpokenOrder(spokenText, products, language);

    if (matchedItems.length > 0) {
      setCartItems((prev) => {
        const combined = [...prev];
        for (const item of matchedItems) {
          const existingIdx = combined.findIndex((c) => c.productId === item.productId);
          if (existingIdx >= 0) {
            combined[existingIdx].quantity += item.quantity;
            combined[existingIdx].calculatedPrice += item.calculatedPrice;
          } else {
            combined.push(item);
          }
        }
        return combined;
      });
    }

    if (unmatchedSegments.length > 0) {
      setSpeechError(`Could not identify: "${unmatchedSegments.join(', ')}". Try adding manually.`);
    }
  };

  // Manual Add Product to Cart
  const handleAddProductDirectly = (product: Product) => {
    const existingIdx = cartItems.findIndex((c) => c.productId === product.id);
    if (existingIdx >= 0) {
      handleUpdateQuantity(cartItems[existingIdx].id, 1);
    } else {
      const defaultQty = 1;
      const calculatedPrice = product.pricePerUnit * defaultQty;
      const newItem: CartItem = {
        id: generateCartId(product.id),
        productId: product.id,
        productName: product.name,
        productNameKannada: product.nameKannada,
        productNameHindi: product.nameHindi,
        unit: product.unit,
        quantity: defaultQty,
        weightInKg: product.pricingType === 'per_kg' ? 1 : undefined,
        unitPrice: product.pricePerUnit,
        calculatedPrice,
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  // Update Cart Quantity
  const handleUpdateQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const product = products.find((p) => p.id === item.productId);
            const newQty = Math.max(0.1, Math.round((item.quantity + delta) * 10) / 10);
            const unitPrice = product ? product.pricePerUnit : item.unitPrice;
            return {
              ...item,
              quantity: newQty,
              weightInKg: item.weightInKg !== undefined ? newQty : undefined,
              calculatedPrice: Math.round(unitPrice * newQty * 100) / 100,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove Item
  const handleRemoveItem = (cartItemId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== cartItemId));
  };

  // Totals calculation
  const subtotal = Math.round(cartItems.reduce((acc, item) => acc + item.calculatedPrice, 0) * 100) / 100;
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Announce Final Bill via Web SpeechSynthesis (Voice TTS)
  const handleAnnounceBill = async () => {
    if (grandTotal <= 0) return;
    setIsAnnouncing(true);
    await speechService.speakBillAnnouncement(grandTotal, language, shopProfile.name);
    setIsAnnouncing(false);
  };

  // Complete Payment and Trigger Closed-Loop Automated Messaging
  const handleCompleteCheckout = async () => {
    if (cartItems.length === 0 || grandTotal <= 0) return;

    // Build bill payload
    const bill = await createBill({
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || 'Cash Customer',
      customerPrimaryPhone: selectedCustomer?.primaryPhone || '9845000000',
      customerAltPhone: selectedCustomer?.altPhone || '',
      items: cartItems,
      subtotal,
      discount: discountAmount,
      total: grandTotal,
      paymentMethod: selectedPaymentMethod,
      paymentStatus: selectedPaymentMethod === 'khata' ? 'credit' : 'completed',
      voiceTranscript: transcript || undefined,
    });

    // Sound Box speaker announcement simulation
    setSoundBoxActive(true);
    await speechService.speakPaymentSuccess(grandTotal, language, selectedCustomer?.name);
    setTimeout(() => setSoundBoxActive(false), 4000);

    setCompletedBill(bill);
    setIsPaymentModalOpen(false);
    setShowClosedLoopModal(true);
    setCartItems([]);
    setTranscript('');
  };

  // Dual WhatsApp Dispatch: Open both Primary AND Alternate numbers
  const handleDispatchBothWhatsApp = () => {
    if (!completedBill) return;

    const custPriText =
      completedBill.paymentStatus === 'completed'
        ? generateCustomerPaymentSuccessText(shopProfile, completedBill, selectedCustomer?.outstandingBalance)
        : generateCustomerInvoiceText(shopProfile, completedBill, selectedCustomer?.outstandingBalance);

    const custAltText = generateAlternateNumberNotificationText(shopProfile, completedBill, selectedCustomer || undefined);

    const priUrl = createWhatsAppUrl(completedBill.customerPrimaryPhone || '', custPriText);
    const altUrl = completedBill.customerAltPhone
      ? createWhatsAppUrl(completedBill.customerAltPhone, custAltText)
      : null;

    window.open(priUrl, '_blank');
    if (altUrl) {
      setTimeout(() => window.open(altUrl, '_blank'), 600);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28">
      {/* Top Banner: Indian Kirana Voice OS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t.voiceTerminalTitle}</span>
              <span className="text-xl">🏪</span>
            </h1>
            <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>ಹಳ್ಳಿ & ನಗರದ ಸುಲಭ ಧ್ವನಿ ಬಿಲ್</span>
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Speak items naturally in Kannada, Hindi, or English. Automatic weight calculations, regional audio announcement, and instant WhatsApp receipts sent to BOTH primary and alternate numbers.
          </p>
        </div>

        {/* Kirana Sound Box Speaker Indicator */}
        <div className={`p-2.5 rounded-2xl border flex items-center gap-3 transition-all ${
          soundBoxActive 
            ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg animate-pulse'
            : 'bg-white text-slate-800 border-slate-200 shadow-xs'
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            soundBoxActive ? 'bg-white text-emerald-600' : 'bg-amber-100 text-amber-800'
          }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-wider text-slate-500">
              ಖಾತಾ ಧ್ವನಿ ಪೆಟ್ಟಿಗೆ
            </div>
            <div className="text-xs font-black">
              {soundBoxActive ? '🔊 ಪಾವತಿ ಅನೌನ್ಸ್ ಆಗುತ್ತಿದೆ...' : 'Khata SoundBox Active'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Large Touch-Friendly Voice Mic & Visual Grocery Tiles */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Giant Glowing Mic Card */}
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden border-2 border-amber-400">
            {/* Background Decorative Rings */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-48 h-48 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>ಭಾಷೆ / Lang: {language.toUpperCase()}</span>
                  </span>
                  {isListening && (
                    <span className="flex items-center gap-1.5 text-xs font-bold bg-rose-600 px-3 py-1 rounded-full animate-pulse shadow-md">
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>ಆಲಿಸಲಾಗುತ್ತಿದೆ / Listening...</span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleProcessSpokenText(transcript)}
                  disabled={!transcript}
                  className="text-xs font-black bg-white text-slate-900 hover:bg-yellow-200 px-4 py-1.5 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {t.parseList}
                </button>
              </div>

              {/* Central Glowing Mic Button */}
              <div className="flex flex-col items-center justify-center py-5">
                <div className="relative">
                  {isListening && (
                    <div className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping scale-150" />
                  )}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl ${
                      isListening
                        ? 'bg-rose-600 text-white ring-8 ring-rose-300 scale-110 animate-pulse'
                        : 'bg-white text-amber-700 hover:scale-105 ring-8 ring-white/30 hover:ring-white/50'
                    }`}
                    title={isListening ? 'Stop listening' : 'Start voice recognition'}
                  >
                    {isListening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-base sm:text-lg font-black text-white drop-shadow-md">
                    {isListening ? 'ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಆಲಿಸಲಾಗುತ್ತಿದೆ... ಮಾತನಾಡಿ!' : 'ಮೈಕ್ ಒತ್ತಿ ಸರಕುಗಳ ಹೆಸರನ್ನು ಧ್ವನಿಯಲ್ಲಿ ಹೇಳಿ'}
                  </p>
                  <p className="text-xs sm:text-sm text-yellow-100 font-semibold mt-1">
                    ಉದಾಹರಣೆಗೆ: "೨ ಕೆಜಿ ಸಕ್ಕರೆ, ೧ ಪ್ಯಾಕೆಟ್ ಮ್ಯಾಗಿ, ಅರ್ಧ ಕೆಜಿ ತೊಗರಿ ಬೇಳೆ"
                  </p>
                </div>
              </div>

              {/* Spoken words input display */}
              <div className="mt-2">
                <div className="relative">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleProcessSpokenText(transcript);
                    }}
                    placeholder="ಹೇಳಿದ ಮಾತುಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ..."
                    className="w-full bg-white text-slate-900 text-xs sm:text-sm px-4 py-3 rounded-2xl border-2 border-white/60 focus:outline-none focus:ring-4 focus:ring-yellow-300 font-semibold shadow-inner"
                  />
                  {transcript && (
                    <button
                      onClick={() => setTranscript('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 text-xs font-bold p-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {speechError && (
                  <div className="mt-2.5 bg-rose-950/80 text-white text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 border border-rose-400">
                    <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                    <span>{speechError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Voice Query Samples (Click to simulate real speech commands) */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{t.sampleVoicePrompts} (1-ಟ್ಯಾಪ್ ಪರೀಕ್ಷೆ)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">ಕ್ಲಿಕ್ ಮಾಡಿ ಧ್ವನಿ ಆರ್ಡರ್ ನೀಡಿ</span>
            </div>
            <div className="space-y-2">
              {sampleVoiceQueries.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTranscript(sample.text);
                    handleProcessSpokenText(sample.text);
                  }}
                  className="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50/60 transition-all flex items-center justify-between text-xs group cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{sample.icon}</span>
                    <div>
                      <span className="font-extrabold text-slate-900 block group-hover:text-amber-800">
                        {sample.label}
                      </span>
                      <span className="text-slate-600 font-mono text-[11px] mt-0.5 block">
                        "{sample.text}"
                      </span>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400 group-hover:text-amber-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* VISUAL GROCERY CATALOG TILES (Ultra-accessible for village & common shopkeepers) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>ನಮ್ಮ ಕಿರಾಣಿ ಸಾಮಾನುಗಳು (1-ಟಚ್ ಆಡ್)</span>
                  <span>🧺</span>
                </h2>
                <p className="text-[11px] text-slate-500">
                  ಗ್ರಾಮೀಣ ಮತ್ತು ನಗರದ ಅಂಗಡಿಯವರಿಗೆ ಸುಲಭವಾದ ಚಿತ್ರ ಸಹಿತ ಸಾಮಗ್ರಿಗಳ ಪಟ್ಟಿ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ಹೊಸ ಸಾಮಾನು (Add Item)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddProductDirectly(product)}
                  className="p-3 rounded-2xl border-2 border-slate-100 hover:border-amber-500 hover:bg-amber-50/50 text-left transition-all cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl p-1 bg-amber-50 rounded-xl group-hover:scale-110 transition-transform">
                      {product.emoji || '📦'}
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      /{product.unit}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="font-black text-slate-900 text-xs truncate">
                      {product.name}
                    </div>
                    {product.nameKannada && (
                      <div className="text-[11px] font-bold text-amber-800 truncate">
                        {product.nameKannada}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                    <span className="font-black text-slate-900 text-sm">
                      ₹{product.pricePerUnit}
                    </span>
                    <span className="w-6 h-6 rounded-lg bg-amber-600 group-hover:bg-amber-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      +
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Current Bill & Customer Context with Dual Phone */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-5 shadow-sm flex flex-col justify-between min-h-[580px]">
            <div>
              {/* Header: Customer Select & Persistent Contact info */}
              <div className="border-b border-slate-200 pb-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>{t.cartItems} ({cartItems.length})</span>
                  </span>
                  {cartItems.length > 0 && (
                    <button
                      onClick={() => setCartItems([])}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      ಖಾಲಿ ಮಾಡಿ (Clear)
                    </button>
                  )}
                </div>

                {/* Customer Selector dropdown with persistent numbers */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedCustomer?.id || ''}
                      onChange={(e) => {
                        const cust = customers.find((c) => c.id === e.target.value) || null;
                        setSelectedCustomer(cust);
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold bg-white text-slate-900 shadow-2xs"
                    >
                      <option value="">👤 ಗ್ರಾಹಕರನ್ನು ಆಯ್ಕೆಮಾಡಿ (Select Customer)</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} • Pri: {c.primaryPhone} | Alt: {c.altPhone} {c.outstandingBalance > 0 ? `(ಬಾಕಿ: ₹${c.outstandingBalance})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerModalOpen(true)}
                    className="px-3 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-black shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Add New Customer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">+ ಗ್ರಾಹಕ (Add User)</span>
                  </button>
                </div>

                {/* MANDATORY PERSISTENT DISPLAY: If customer has outstanding balance */}
                {selectedCustomer && (
                  <div className="mt-2.5 bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-300 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between font-black text-rose-900 mb-1">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>ಹಳೆ ಖಾತಾ ಬಾಕಿ (Existing Due):</span>
                      </span>
                      <span className="text-rose-700 font-black text-base">
                        ₹{selectedCustomer.outstandingBalance}
                      </span>
                    </div>

                    {/* Both Primary AND Alternate Phone prominently displayed */}
                    <div className="text-[11px] text-slate-700 space-y-1 font-mono pt-1.5 border-t border-rose-200">
                      <div className="flex justify-between">
                        <span>ನೋಂದಾಯಿತ ಸಂಖ್ಯೆ (Primary):</span>
                        <span className="font-bold text-blue-700">{selectedCustomer.primaryPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ಪರ್ಯಾಯ ಸಂಖ್ಯೆ ({selectedCustomer.altPhoneLabel || 'ಕುಟುಂಬ'}):</span>
                        <span className="font-bold text-amber-800">{selectedCustomer.altPhone}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                {cartItems.length === 0 ? (
                  <div className="py-14 text-center text-slate-400">
                    <div className="text-4xl mb-2">🛒</div>
                    <p className="text-xs font-bold text-slate-600">ಬಿಲ್ ಖಾಲಿಯಾಗಿದೆ (Cart is empty)</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      ಮೈಕ್ ಒತ್ತಿ ಮಾತನಾಡಿ ಅಥವಾ ಕೆಳಗಿನ ಸಾಮಾನುಗಳನ್ನು ಒತ್ತಿ
                    </p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1 mr-2">
                        <div className="font-black text-slate-900 text-xs sm:text-sm">
                          {item.productName}
                        </div>
                        {item.productNameKannada && (
                          <div className="text-[11px] font-bold text-amber-800">
                            {item.productNameKannada}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ದರ: ₹{item.unitPrice}/{item.unit}
                        </div>
                      </div>

                      {/* Quantity Controller with fast village weight steppers */}
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-1 shadow-2xs">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-slate-900 px-1 text-xs min-w-[32px] text-center font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Calculated Amount */}
                      <div className="text-right ml-3 min-w-[60px]">
                        <div className="font-black text-slate-900 text-sm">
                          ₹{item.calculatedPrice}
                        </div>
                      </div>

                      {/* Remove item */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 ml-2 p-1 cursor-pointer"
                        title="ತೆಗೆದುಹಾಕಿ (Remove)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Billing Summary & Actions Footer */}
            <div className="pt-4 border-t-2 border-slate-200 mt-4 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                <div className="flex justify-between">
                  <span>ಮೂಲ ಮೊತ್ತ (Subtotal):</span>
                  <span className="font-bold text-slate-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>{t.grandTotal}:</span>
                  <span className="text-amber-700 text-2xl font-black">₹{grandTotal}</span>
                </div>
              </div>

              {/* Action Buttons: Announce Bill TTS & Collect Payment */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAnnounceBill}
                  disabled={grandTotal <= 0 || isAnnouncing}
                  className="py-3 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black rounded-xl border-2 border-amber-300 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                  title="Speak final bill aloud to customer"
                >
                  <Volume2 className={`w-4 h-4 text-amber-600 ${isAnnouncing ? 'animate-pulse' : ''}`} />
                  <span>{isAnnouncing ? 'ಧ್ವನಿ ಪ್ರಕಟಣೆ...' : t.announceFinalBill}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={grandTotal <= 0}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{t.collectPayment}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT COLLECTION MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <span>{t.collectPayment}: ₹{grandTotal}</span>
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3 mb-5">
              <label className="block text-xs font-bold text-slate-700">
                {t.paymentMethod}:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedPaymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs font-black">{t.cash}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('upi')}
                  className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedPaymentMethod === 'upi'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs font-black">{t.upiQr}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('khata')}
                  className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    selectedPaymentMethod === 'khata'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span className="text-xs font-black">{t.khataCredit}</span>
                </button>
              </div>
            </div>

            {/* UPI QR Code Display if UPI is selected */}
            {selectedPaymentMethod === 'upi' && (
              <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-4 text-center mb-4">
                <div className="text-xs font-black text-amber-950 mb-2">
                  {t.scanToPay} (ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಪಾವತಿಸಿ)
                </div>
                <div className="w-44 h-44 bg-white mx-auto rounded-2xl p-2.5 border-2 border-dashed border-amber-400 flex flex-col items-center justify-center shadow-md">
                  <div className="text-[10px] font-mono font-bold text-slate-800 mb-1">
                    UPI: {shopProfile.upiId}
                  </div>
                  <div className="w-32 h-32 bg-slate-900 rounded-xl p-2 flex items-center justify-center text-white">
                    <QrCode className="w-28 h-28 text-amber-300" />
                  </div>
                  <div className="text-xs font-black text-emerald-700 mt-1">
                    ಮೊತ್ತ: ₹{grandTotal}
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 font-semibold mt-2">
                  PhonePe, Google Pay, Paytm, BHIM ಎಲ್ಲಾ UPI ಆಪ್‌ಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ.
                </div>
              </div>
            )}

            {/* Khata Warning if selected */}
            {selectedPaymentMethod === 'khata' && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-xs text-purple-900 mb-4">
                <div className="font-black mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-700" />
                  <span>ಖಾತಾ ಉದ್ದಾರಕ್ಕೆ ₹{grandTotal} ಸೇರಿಸಲಾಗುತ್ತಿದೆ</span>
                </div>
                <p className="text-[11px] text-purple-800">
                  ಗ್ರಾಹಕರು: <strong>{selectedCustomer?.name || 'ಅಪರಿಚಿತ ಗ್ರಾಹಕರು'}</strong>.
                  {!selectedCustomer && (
                    <span className="text-rose-600 block mt-1 font-bold">
                      ⚠️ ಉದ್ದಾರ ದಾಖಲಿಸಲು ದಯವಿಟ್ಟು ನೋಂದಾಯಿತ ಗ್ರಾಹಕರನ್ನು ಆಯ್ಕೆಮಾಡಿ!
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Confirm Payment Button */}
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={handleCompleteCheckout}
                disabled={selectedPaymentMethod === 'khata' && !selectedCustomer}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                <span>ಪಾವತಿ ದೃಢೀಕರಿಸಿ & ವಾಟ್ಸಾಪ್ ರವಾನಿಸಿ (Confirm)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                ರದ್ದುಮಾಡಿ (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSED-LOOP DUAL WHATSAPP MESSAGING MODAL (PRIMARY AND ALTERNATE NUMBERS) */}
      {showClosedLoopModal && completedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                {t.paymentSuccess}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                ಬಿಲ್ ನಂ: {completedBill.billNumber} • ಮೊತ್ತ: ₹{completedBill.total} • ಪಾವತಿ: {completedBill.paymentMethod.toUpperCase()}
              </p>
            </div>

            {/* DUAL WHATSAPP DISPATCH CARDS (Primary AND Alternate Number) */}
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>ಸ್ವಯಂಚಾಲಿತ ವಾಟ್ಸಾಪ್ ಸಂದೇಶ ರವಾನೆ (Dual WhatsApp):</span>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                  Closed-Loop Active
                </span>
              </div>

              {/* 1. TO REGISTERED PRIMARY NUMBER */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs shadow-2xs">
                <div className="flex items-center justify-between font-black text-slate-900 mb-1">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>೧. ನೋಂದಾಯಿತ ನಂಬರ್‌ಗೆ (Primary):</span>
                  </span>
                  <span className="text-[10px] font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {completedBill.customerPrimaryPhone}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 italic">
                  "ಪಾವತಿ ದೃಢೀಕರಣ: {shopProfile.name} ಅಂಗಡಿಯಲ್ಲಿ ₹{completedBill.total} ಯಶಸ್ವಿಯಾಗಿ ಪಾವತಿಯಾಗಿದೆ."
                </p>
                <div className="mt-2.5 flex items-center justify-end">
                  <button
                    onClick={() => {
                      const text = completedBill.paymentStatus === 'completed'
                        ? generateCustomerPaymentSuccessText(shopProfile, completedBill, selectedCustomer?.outstandingBalance)
                        : generateCustomerInvoiceText(shopProfile, completedBill, selectedCustomer?.outstandingBalance);
                      const url = createWhatsAppUrl(completedBill.customerPrimaryPhone || '', text);
                      window.open(url, '_blank');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open WhatsApp (Primary No)</span>
                  </button>
                </div>
              </div>

              {/* 2. MANDATORY: TO ALTERNATE NUMBER (Spouse / Family) */}
              <div className="bg-white p-3 rounded-xl border border-amber-300 text-xs shadow-2xs">
                <div className="flex items-center justify-between font-black text-slate-900 mb-1">
                  <span className="flex items-center gap-1.5 text-amber-900">
                    <MessageSquare className="w-4 h-4 text-amber-600" />
                    <span>೨. ಪರ್ಯಾಯ ನಂಬರ್‌ಗೆ (Alternate - {selectedCustomer?.altPhoneLabel || 'Family'}):</span>
                  </span>
                  <span className="text-[10px] font-mono font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                    {completedBill.customerAltPhone || selectedCustomer?.altPhone || 'Not Configured'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 italic">
                  "ಕುಟುಂಬದ ರಸೀದಿ ಮಾಹಿತಿ: {completedBill.customerName} ಅವರ ಶಾಪಿಂಗ್ ಬಿಲ್ ವಿವರ..."
                </p>
                <div className="mt-2.5 flex items-center justify-end">
                  <button
                    onClick={() => {
                      const altText = generateAlternateNumberNotificationText(shopProfile, completedBill, selectedCustomer || undefined);
                      const altNo = completedBill.customerAltPhone || selectedCustomer?.altPhone || '';
                      if (altNo) {
                        const url = createWhatsAppUrl(altNo, altText);
                        window.open(url, '_blank');
                      } else {
                        alert('Alternate phone number not provided for this customer.');
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open WhatsApp (Alternate No)</span>
                  </button>
                </div>
              </div>

              {/* 3. TO SHOP MANAGER */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between text-slate-800 font-bold">
                  <span>೩. ಅಂಗಡಿ ಮಾಲೀಕರಿಗೆ ಅಲರ್ಟ್ (Manager):</span>
                  <span className="font-mono text-[10px] text-slate-600">{shopProfile.primaryPhone}</span>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Action to Open Both */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDispatchBothWhatsApp}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>ಎರಡೂ ನಂಬರ್‌ಗೆ ವಾಟ್ಸಾಪ್ ತೆರೆಯಿರಿ (Send to BOTH Numbers)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClosedLoopModal(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl cursor-pointer"
              >
                ಮುಂದಿನ ಆರ್ಡರ್ ಆರಂಭಿಸಿ (Next Voice Order)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 rounded-xl text-xl">👤</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">ಹೊಸ ಗ್ರಾಹಕರ ನೋಂದಣಿ (Add New User)</h3>
                  <p className="text-[11px] text-slate-500">Register customer with Primary and Family alternate phone</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ಗ್ರಾಹಕರ ಹೆಸರು (Customer Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar (Teacher)"
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ಮುಖ್ಯ ಮೊಬೈಲ್ (Primary Phone) *</label>
                <input
                  type="tel"
                  required
                  placeholder="9845012345"
                  value={custForm.primaryPhone}
                  onChange={(e) => setCustForm({ ...custForm, primaryPhone: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Receives official WhatsApp Kirana bills</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ಪರ್ಯಾಯ ಮೊಬೈಲ್ (Alternate)</label>
                  <input
                    type="tel"
                    placeholder="9845098765"
                    value={custForm.altPhone}
                    onChange={(e) => setCustForm({ ...custForm, altPhone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ಸಂಬಂಧ (Relation)</label>
                  <select
                    value={custForm.altPhoneLabel}
                    onChange={(e) => setCustForm({ ...custForm, altPhoneLabel: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="Spouse">Spouse / ಪತ್ನಿ</option>
                    <option value="Father">Father / ತಂದೆ</option>
                    <option value="Mother">Mother / ತಾಯಿ</option>
                    <option value="Brother">Brother / ಸಹೋದರ</option>
                    <option value="Family">Family / ಕುಟುಂಬ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ಹಳೆ ಬಾಕಿ (Opening Balance)</label>
                  <input
                    type="number"
                    value={custForm.initialBalance}
                    onChange={(e) => setCustForm({ ...custForm, initialBalance: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ಉದ್ದಾರ ಮಿತಿ (Credit Limit)</label>
                  <input
                    type="number"
                    value={custForm.creditLimit}
                    onChange={(e) => setCustForm({ ...custForm, creditLimit: parseFloat(e.target.value) || 5000 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md cursor-pointer"
                >
                  Save & Select Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD PRODUCT MODAL */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 rounded-xl text-xl">{prodForm.emoji || '📦'}</span>
                <div>
                  <h3 className="font-black text-sm text-slate-900">ಹೊಸ ಸಾಮಾನು ಸೇರಿಸಿ (Add New Item)</h3>
                  <p className="text-[11px] text-slate-500">Quickly add a product to catalog & voice recognition</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddProduct} className="space-y-3">
              {/* Emoji selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ಚಿತ್ರದ ಐಕಾನ್ (Item Icon)</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {['🌾', '🍬', '🥛', '🌻', '🍜', '🥣', '🧂', '🍚', '☕', '🌶️', '🧼', '🍫', '🍞', '🍪', '📦'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setProdForm({ ...prodForm, emoji })}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all ${
                        prodForm.emoji === emoji ? 'bg-amber-500 text-white scale-110 shadow-xs' : 'hover:bg-slate-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ಸಾಮಗ್ರಿಯ ಹೆಸರು (Item Name - English) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sona Masoori Rice (25kg)"
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ಕನ್ನಡದಲ್ಲಿ (Kannada)</label>
                  <input
                    type="text"
                    placeholder="e.g. ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿ"
                    value={prodForm.nameKannada}
                    onChange={(e) => setProdForm({ ...prodForm, nameKannada: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">हिंदी में (Hindi)</label>
                  <input
                    type="text"
                    placeholder="e.g. चावल"
                    value={prodForm.nameHindi}
                    onChange={(e) => setProdForm({ ...prodForm, nameHindi: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ವಿಧ (Pricing Type)</label>
                  <select
                    value={prodForm.pricingType}
                    onChange={(e) => setProdForm({ ...prodForm, pricingType: e.target.value, unit: e.target.value === 'per_kg' ? 'kg' : 'packet' })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="per_unit">Per-Unit (Piece/Packet)</option>
                    <option value="per_kg">Per-KG (Loose/Weight)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ದರ (Price ₹) *</label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={prodForm.pricePerUnit}
                    onChange={(e) => setProdForm({ ...prodForm, pricePerUnit: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold text-amber-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ಅಳತೆ (Unit)</label>
                  <select
                    value={prodForm.unit}
                    onChange={(e) => setProdForm({ ...prodForm, unit: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="packet">packet</option>
                    <option value="kg">kg</option>
                    <option value="gram">gram</option>
                    <option value="piece">piece</option>
                    <option value="pouch">pouch</option>
                    <option value="litre">litre</option>
                    <option value="bottle">bottle</option>
                    <option value="box">box</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ಪ್ರಾರಂಭಿಕ ದಾಸ್ತಾನು (Stock)</label>
                  <input
                    type="number"
                    value={prodForm.stockQuantity}
                    onChange={(e) => setProdForm({ ...prodForm, stockQuantity: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md cursor-pointer"
                >
                  Add Item to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
