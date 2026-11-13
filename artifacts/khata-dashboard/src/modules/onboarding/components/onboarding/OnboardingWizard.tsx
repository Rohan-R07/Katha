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
import { downloadVoiceConfigJson, generateRohanVoiceConfig } from '../../services/exportVoice';

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
    name: shopProfile.name || '',
    shopkeeperName: shopProfile.shopkeeperName || '',
    shopType: (shopProfile.shopType || 'kirana') as ShopType,
    primaryPhone: shopProfile.primaryPhone || '',
    altPhone: shopProfile.altPhone || '',
    email: shopProfile.email || '',
    address: shopProfile.address || '',
    marketArea: shopProfile.marketArea || '',
    pincode: shopProfile.pincode || '',
    upiId: shopProfile.upiId || '',
    gstNumber: shopProfile.gstNumber || '',
  });

  const [testSpeechPlaying, setTestSpeechPlaying] = useState(false);
  const [validationError, setValidationError] = useState('');
  const validate = () => {
    if (!formData.name.trim() || !formData.shopkeeperName.trim() || !/^\+?[0-9]{10,13}$/.test(formData.primaryPhone)) {
      setValidationError('Enter the shop name, shopkeeper name, and a valid primary mobile number.');
      return false;
    }
    setValidationError('');
    return true;
  };

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
    if (!validate()) { setStep(2); return; }
    try { await completeOnboarding({
      ...shopProfile,
      ...formData,
      preferredLanguage: language,
      isOnboarded: true,
    }); } catch { /* Provider shows the server error; keep entered values for retry. */ }
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
                {step === 1 && (t.step1Title || 'Select Language & Voice Setup')}
                {step === 2 && (t.step2Title || 'Shop Profile Setup')}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <span>Step {step} of 2</span>
              <div className="flex gap-1 ml-2">
                {[1, 2].map((i) => (
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
            {validationError && <p role="alert" className="mb-4 text-sm text-red-700">{validationError}</p>}
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

            {/* Stepper Navigation Buttons */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 border border-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{language === 'kn' ? 'ಹಿಂದಕ್ಕೆ' : language === 'hi' ? 'पीछे' : 'Back'}</span>
                </button>
              ) : (
                <div />
              )}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                >
                  <span>{t.saveAndContinue || 'Save & Continue'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{language === 'kn' ? 'ಖಾತಾ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ' : language === 'hi' ? 'खाता डैशबोर्ड खोलें' : 'Launch Shop Dashboard'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

