import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { PersistentKhataAlertBar } from './components/common/PersistentKhataAlertBar';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { VoiceBillingTerminal } from './components/billing/VoiceBillingTerminal';
import { InventoryList } from './components/inventory/InventoryList';
import { OutstandingCustomersList } from './components/khata/OutstandingCustomersList';
import { RevenueReporting } from './components/reports/RevenueReporting';
import { ShopProfileView } from './components/profile/ShopProfileView';
import { IntegrationHandoverHub } from './components/integration/IntegrationHandoverHub';
import { KhataSplashLoader } from './components/common/KhataLoader';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainLayout: React.FC = () => {
  const { currentView, theme } = useApp();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isInitialLoading) {
    return <KhataSplashLoader />;
  }

  // If currently in Onboarding mode, show the full onboarding flow
  if (currentView === 'onboarding') {
    return <OnboardingWizard />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        theme === 'black'
          ? 'dark bg-black text-white selection:bg-amber-800 selection:text-white'
          : 'bg-white text-slate-900 selection:bg-amber-200 selection:text-amber-900'
      } animate-fadeIn`}
    >
      {/* Top Navbar */}
      <Navbar />

      {/* MANDATORY CONSTRAINT: Persistent Contact Visibility Alert Bar */}
      <PersistentKhataAlertBar />

      {/* Main View Container */}
      <main className="flex-1 w-full animate-fadeIn">
        {currentView === 'billing' && <VoiceBillingTerminal />}
        {currentView === 'inventory' && <InventoryList />}
        {currentView === 'khata' && <OutstandingCustomersList />}
        {currentView === 'reports' && <RevenueReporting />}
        {currentView === 'profile' && <ShopProfileView />}
        {currentView === 'integration' && <IntegrationHandoverHub />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ErrorBoundary>
  );
}
