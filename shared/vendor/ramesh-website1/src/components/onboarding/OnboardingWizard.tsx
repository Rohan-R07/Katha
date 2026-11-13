import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShopType, Language, languageOptions } from '../../types/shop';
import { 
  Store, 
  Mic, 
  Package, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  Download, 
  Phone, 
  ShieldCheck,
  ShoppingBag,
  Volume2
} from 'lucide-react';
import { speechService } from '../../services/speech';
import { downloadVoiceConfigJson } from '../../services/exportVoice';

export const OnboardingWizard: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    shopProfile, 
    completeOnboarding, 
    products, 
    voiceConfig, 
    t 
  } = useApp();

  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    name: shopProfile.name || 'Sri Manjunatha Kirana & General Stores',
    shopkeeperName: shopProfile.shopkeeperName || 'Basavaraj Gowda',
    shopType: (shopProfile.shopType || 'kirana') as ShopType,
    primaryPhone: shopProfile.primaryPhone || '9845012345',
    altPhone: shopProfile.altPhone || '9845098765',
    email: shopProfile.email || 'manjunatha.kirana@gmail.com',
    address: shopProfile.address || 'Main Market Road, Near Gandhi Circle, Malleshwaram',
    marketArea: shopProfile.marketArea || 'Bangalore West',
    pincode: shopProfile.pincode || '560003',
    upiId: shopProfile.upiId || 'manjunathakirana@okaxis',
    gstNumber: shopProfile.gstNumber || '29ABCDE1234F1Z5',
  });

  const [testSpeechPlaying, setTestSpeechPlaying] = useState(false);

  const shopTypes: { id: ShopType; label: string; icon: string; desc: string }[] = [
    { id: 'kirana', label: 'Kirana & Provision Store', icon: '🏪', desc: 'Grains, oils, dals, spices, daily staples' },
    { id: 'vegetable_fruit', label: 'Vegetables & Fruits', icon: '🥦', desc: 'Per-KG loose produce & seasonal fruits' },
    { id: 'dairy_sweets', label: 'Dairy & Sweets', icon: '🥛', desc: 'Milk pouches, curd, paneer, mithai' },
    { id: 'bakery', label: 'Bakery & Confectionery', icon: '🍞', desc: 'Bread, rusks, cakes, snacks' },
    { id: 'pharmacy', label: 'Medical & Chemist', icon: '💊', desc: 'Medicines, hygiene, cosmetics' },
    { id: 'general', label: 'General / Variety Store', icon: '🛒', desc: 'Stationery, plastics, gifts, household items' },
  ];

  const handleTestSpeech = async (lang: Language) => {
    setTestSpeechPlaying(true);
    await speechService.speakBillAnnouncement(245, lang, formData.name || 'Khata AI');
    setTestSpeechPlaying(false);
  };

  const handleSubmit = async () => {
    await completeOnboarding({
      ...shopProfile,
      ...formData,
      preferredLanguage: language,
      isOnboarded: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto w-full">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold mb-3 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Project Khata • Website 1: Shop Onboarding & Profile</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t.welcomeTitle}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            {t.welcomeSubtitle}
          </p>
        </div>

        {/* Wizard Steps Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Step Progress Tracker */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                {step}
              </span>
              <span className="font-bold text-sm">
                {step === 1 && t.step1Title}
                {step === 2 && t.step2Title}
                {step === 3 && t.step3Title}
                {step === 4 && t.step4Title}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <span>Step {step} of 4</span>
              <div className="flex gap-1 ml-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-all ${
                      i <= step ? 'bg-amber-400' : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* STEP 1: Language & Voice Selection */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Mic className="w-5 h-5 text-amber-600" />
                    <span>{t.selectLanguage}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.languageHint}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {languageOptions.map((opt) => {
                    const isSelected = language === opt.code;
                    return (
                      <div
                        key={opt.code}
                        onClick={() => setLanguage(opt.code)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-400/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{opt.flag}</span>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-600" />}
                        </div>
                        <div className="mt-3">
                          <div className="text-lg font-black text-slate-900">{opt.nativeName}</div>
                          <div className="text-xs font-semibold text-slate-500">{opt.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">{opt.voiceLocale}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Voice Preview Box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-900">
                        Test Voice Announcement (TTS)
                      </div>
                      <div className="text-[11px] text-amber-700">
                        {language === 'kn' && 'ಕನ್ನಡ: ಒಟ್ಟು ಬಿಲ್ ಮೊತ್ತ 245 ರೂಪಾಯಿಗಳು.'}
                        {language === 'hi' && 'हिंदी: कुल बिल राशि 245 रुपये है।'}
                        {language === 'en' && 'English: Your total bill is 245 Rupees.'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTestSpeech(language)}
                    disabled={testSpeechPlaying}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{testSpeechPlaying ? 'Playing Audio...' : 'Play Sample Voice'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Shop & Merchant Information */}
            {step === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-amber-600" />
                    <span>{t.step2Title}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter shop profile, category, and persistent contact information.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.shopName} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold"
                      placeholder="e.g. Sri Manjunatha Kirana Stores"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.shopkeeperName} *
                    </label>
                    <input
                      type="text"
                      value={formData.shopkeeperName}
                      onChange={(e) => setFormData({ ...formData, shopkeeperName: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-semibold"
                      placeholder="e.g. Basavaraj Gowda"
                      required
                    />
                  </div>

                  {/* Primary & Alternative Phone Numbers (Mandatory constraint) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t.primaryMobile} *</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.primaryPhone}
                      onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono"
                      placeholder="10-digit mobile number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-600" />
                        <span>{t.altMobile} *</span>
                      </div>
                      <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1 rounded">Mandatory for Follow-up</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.altPhone}
                      onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono"
                      placeholder="Alternative mobile number (Spouse / Partner)"
                      required
                    />
                  </div>

                  {/* UPI ID */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.upiId} *
                    </label>
                    <input
                      type="text"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono font-medium"
                      placeholder="e.g. manjunathakirana@okaxis"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t.gstOptional}
                    </label>
                    <input
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono uppercase"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                    />
                  </div>

                  {/* Market Area & PIN */}
                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.address}
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                        placeholder="Street, Landmark, Market Area"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {t.pincode}
                      </label>
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono"
                        placeholder="560003"
                      />
                    </div>
                  </div>
                </div>

                {/* Shop Category Selection */}
                <div className="pt-3 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-2">
                    {t.shopType}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {shopTypes.map((type) => {
                      const isSelected = formData.shopType === type.id;
                      return (
                        <div
                          key={type.id}
                          onClick={() => setFormData({ ...formData, shopType: type.id })}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="text-xl mb-1">{type.icon}</div>
                          <div className="text-xs font-extrabold text-slate-900">{type.label}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">{type.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Dynamic Inventory Catalog Preset */}
            {step === 3 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-600" />
                    <span>{t.step3Title}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Your store will be loaded with {products.length} pre-configured high-velocity items with Per-KG and Per-Unit pricing.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-72 overflow-y-auto space-y-2">
                  {products.map((prod, idx) => (
                    <div
                      key={prod.id}
                      className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-400 font-mono w-4">{idx + 1}</span>
                        <div>
                          <div className="font-bold text-slate-900">{prod.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {prod.nameKannada || prod.nameHindi} • Category: {prod.category}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-amber-800">
                          ₹{prod.pricePerUnit} / {prod.unit}
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          prod.pricingType === 'per_kg' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {prod.pricingType === 'per_kg' ? 'Per-KG Loose' : 'Per-Unit Pkt'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-900">
                    <span className="font-bold">Dynamic Inventory Ready:</span> You can freely add new products, edit pricing, manage weights (e.g. 250g, 500g, 1kg), and delete items at any time in the inventory tab.
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Voice & Central FastAPI Ready */}
            {step === 4 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span>{t.step4Title}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    All components are ready for Amogh’s FastAPI backend and Rohan’s AI Voice Assistant.
                  </p>
                </div>

                {/* Handover summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Rohan Voice Card */}
                  <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Mic className="w-4 h-4 text-amber-700" />
                        <span>Rohan’s Voice Assistant</span>
                      </span>
                      <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-1.5 py-0.5 rounded font-bold">
                        {voiceConfig.speechLocale}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Vocabulary Items: <span className="font-bold">{voiceConfig.catalogDictionary.length}</span></div>
                      <div>Language: <span className="font-bold uppercase">{language}</span></div>
                      <div>Weight Parsers: <span className="font-bold">250g, 500g, 1kg, 2kg, 5kg</span></div>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadVoiceConfigJson(voiceConfig)}
                      className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download khata_voice_config.json</span>
                    </button>
                  </div>

                  {/* Amogh FastAPI Backend Card */}
                  <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-blue-700" />
                        <span>Amogh’s FastAPI & DB</span>
                      </span>
                      <span className="text-[10px] bg-blue-200 text-blue-900 font-mono px-1.5 py-0.5 rounded font-bold">
                        FastAPI 0.115+
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Target Host: <span className="font-bold font-mono">http://localhost:8000</span></div>
                      <div>Central DB: <span className="font-bold">PostgreSQL</span></div>
                      <div>Fallbacks: <span className="font-bold text-emerald-700">Reactive Local Sync</span></div>
                    </div>
                    <div className="mt-3 p-2 bg-white rounded border border-blue-200 text-[11px] text-blue-800">
                      ✓ Zero independent backends created. Strictly uses shared contract.
                    </div>
                  </div>
                </div>

                {/* Final Checklist */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Shop: {formData.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Owner: {formData.shopkeeperName} | Primary: {formData.primaryPhone} | Alt: {formData.altPhone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>UPI ID: {formData.upiId} | Language: {language.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Navigation Buttons */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 border border-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                >
                  <span>{t.saveAndContinue}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Launch Shop Dashboard</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

