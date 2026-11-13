import { useEffect, type ReactNode } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/app-shell';
import { ErrorState } from '@/components/khata-ui';
import { I18nProvider } from '@/lib/i18n';
import NotFound from '@/pages/not-found';
import { LoginPage, RegisterPage, SetupPage } from '@/pages/auth';
import Overview from '@/pages/overview';
import Customers from '@/pages/customers';
import CustomerDetail from '@/pages/customer-detail';
import Transactions from '@/pages/transactions';
import Reports from '@/pages/reports';
import Products from '@/pages/products';
import Settings from '@/pages/settings';
import { errorStatus } from '@/lib/khata';
import WebsiteOne from '@/modules/onboarding';

const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (err, query) => {
      // Session expired mid-use: drop everything and re-check auth.
      if (errorStatus(err) === 401 && query.queryKey[0] !== getGetMeQueryKey()[0]) {
        queryClient.clear();
      }
    },
  }),
  defaultOptions: {
    queries: { retry: (n, e) => errorStatus(e) !== 401 && errorStatus(e) !== 404 && n < 2, refetchOnWindowFocus: true, staleTime: 5_000 },
  },
});

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => navigate(to, { replace: true }), [to, navigate]);
  return null;
}

function Splash() {
  return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" /></div>;
}

function Gate() {
  const [loc] = useLocation();
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000 } });

  if (me.isLoading) return <Splash />;
  const unauth = me.isError && errorStatus(me.error) === 401;
  if (me.isError && !unauth) {
    const notConfigured = (me.error as { data?: { code?: string } } | null)?.data?.code === "backend_not_configured";
    return <div className="min-h-[100dvh] flex items-center justify-center p-6"><div className="w-full max-w-md"><ErrorState error={me.error} title={notConfigured ? "KHATA backend is not connected" : "Can't reach KHATA"} onRetry={() => me.refetch()} /></div></div>;
  }
  if (unauth || !me.data) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route><Redirect to="/login" /></Route>
      </Switch>
    );
  }
  const session = me.data;
  if (!session.shop) {
    if (loc === '/setup/basic') return <SetupPage session={session} />;
    if (loc !== '/setup' && loc !== '/onboarding') return <Redirect to="/setup" />;
    return <WebsiteOne session={session} />;
  }
  if (loc === '/onboarding') return <WebsiteOne session={session} />;
  if (loc === '/login' || loc === '/register' || loc === '/setup') return <Redirect to="/" />;

  return (
    <AppShell session={session}>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/"><Overview session={session} /></Route>
          <Route path="/customers" component={Customers} />
          <Route path="/customers/:id" component={CustomerDetail} />
          <Route path="/transactions" component={Transactions} />
          <Route path="/reports" component={Reports} />
          <Route path="/products" component={Products} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function RouteMetadata() {
  const [location] = useLocation();
  useEffect(() => {
    const names: Record<string, string> = {
      "/": "Overview", "/login": "Sign in", "/register": "Create account", "/setup": "Set up shop",
      "/customers": "Customers", "/transactions": "Transactions", "/reports": "Daily report",
      "/products": "Products", "/settings": "Shop settings",
      "/onboarding": "Shop onboarding & profile", "/setup/basic": "Basic shop setup",
    };
    const title = `${names[location] ?? (location.startsWith("/customers/") ? "Customer khata" : "Page not found")} · KHATA`;
    document.title = title;
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  }, [location]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <RouteMetadata />
            <Gate />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
