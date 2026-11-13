import type { AuthSession } from '@workspace/api-client-react';
import { AppProvider, useApp, type ViewMode } from './context/AppContext';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { ShopProfileView } from './components/profile/ShopProfileView';
import { OutstandingCustomersList } from './components/khata/OutstandingCustomersList';
import { InventoryList } from './components/inventory/InventoryList';
import { downloadVoiceConfigJson } from './services/exportVoice';

function Module() {
  const { currentView, setCurrentView, busy, error, clearError, loading, loadError, retryLoad, voiceConfig, shopProfile, language } = useApp();
  const tabs: { view: ViewMode; label: string }[] = [
    { 
      view: 'profile', 
      label: language === 'kn' ? 'ಅಂಗಡಿ ವಿವರ (Shop Profile)' : language === 'hi' ? 'दुकान विवरण (Shop Profile)' : 'Shop Profile' 
    },
    { 
      view: 'onboarding', 
      label: language === 'kn' ? 'ಆನ್‌ಬೋರ್ಡಿಂಗ್ (Setup)' : language === 'hi' ? 'सेटअप (Setup)' : 'Onboarding Wizard' 
    },
  ];
  if (loading) return <p className="p-8" role="status">Loading your shop from KHATA…</p>;
  if (loadError) return <div className="p-8" role="alert">Could not load shared records. No local demo data was substituted. <button onClick={retryLoad}>Retry</button></div>;
  return (
    <section className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b bg-white p-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <a 
              href={import.meta.env.BASE_URL} 
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-black text-amber-950 transition-all shadow-xs"
            >
              <span>{language === 'kn' ? '← ಖಾತಾ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' : language === 'hi' ? '← खाता डैशबोर्ड' : '← Back to KHATA Dashboard'}</span>
            </a>
            {tabs.filter(tab => shopProfile.id || tab.view === 'onboarding').map(tab => (
              <button 
                key={tab.view} 
                disabled={busy} 
                onClick={() => setCurrentView(tab.view)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  currentView === tab.view 
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/40' 
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      {error && <div className="sticky top-16 z-50 border border-red-300 bg-red-50 p-4 text-sm text-red-900" role="alert">{error} <button onClick={clearError} className="ml-3 underline">Dismiss</button></div>}
      {busy && <p className="px-4 py-2 text-sm" role="status">Saving to the shared backend…</p>}
      <fieldset disabled={busy} className="min-w-0">
        {currentView === 'onboarding' && <OnboardingWizard />}
        {currentView === 'profile' && <ShopProfileView />}
        {currentView === 'khata' && <OutstandingCustomersList />}
        {currentView === 'inventory' && <InventoryList />}
        {currentView === 'integration' && <div className="mx-auto max-w-3xl space-y-4 p-8">
          <h1 className="text-2xl font-bold">Rohan’s voice integration handover</h1>
          <p>The original khata_voice_config.json is preserved unchanged in shared/vendor/ramesh-website1. The export below uses your saved shop, language, and catalog.</p>
          <button onClick={() => downloadVoiceConfigJson(voiceConfig)} className="rounded bg-amber-600 px-4 py-3 font-bold text-white">Download current voice configuration</button>
          <p>Gnani Prisma, Gnani Timbre, invoice billing, stock deductions, and automated WhatsApp delivery are not configured. Browser speech is only Ramesh’s optional onboarding audio preview, not the AI assistant.</p>
          <a href="/api/docs" target="_blank" rel="noreferrer" className="underline">Shared FastAPI documentation</a>
        </div>}
      </fieldset>
    </section>
  );
}

export default function WebsiteOne({ session }: { session: AuthSession }) {
  return <AppProvider key={session.user.id} session={session}><Module /></AppProvider>;
}
