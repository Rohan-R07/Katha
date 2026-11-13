import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Home,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Smartphone,
  Store,
  Users,
} from "lucide-react";
import { useLogout, type AuthSession } from "@workspace/api-client-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { GnaniVoiceAssistant } from "@/components/gnani-voice-assistant";
import { LanguageSelector } from "@/components/language-selector";
import { AndroidWebModal, AndroidPhoneWrapper } from "@/components/android-web-modal";
import {
  KiranaLogo,
  KiranaStoreHeader,
  GrainSacksGraphic,
  VoiceAssistantBadge,
} from "@/components/kirana-theme";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return <KiranaLogo className={className} />;
}

function NavLinks({ onNav }: { onNav?: () => void }) {
  const [loc] = useLocation();
  const { t } = useI18n();

  const navItems = [
    { href: "/", label: t("navOverview"), key: "overview", icon: Home },
    { href: "/customers", label: t("navCustomers"), key: "customers", icon: Users },
    { href: "/transactions", label: t("navTransactions"), key: "transactions", icon: ArrowLeftRight },
    { href: "/transactions?tab=purchases", label: t("navPurchases"), key: "purchases", icon: ShoppingCart },
    { href: "/products", label: t("navProducts"), key: "products", icon: Package },
    { href: "/reports", label: t("reportTitle"), key: "reports", icon: BarChart3 },
    { href: "/settings", label: t("settingsTitle"), key: "settings", icon: Store },
    { href: "/onboarding", label: t("navOnboarding"), key: "onboarding", icon: BookOpen },
  ];

  return (
    <nav className="space-y-1.5 px-2">
      {navItems.map(({ href, label, key, icon: Icon }) => {
        const basePath = href.split("?")[0];
        const active = basePath === "/" ? loc === "/" : loc.startsWith(basePath);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNav}
            data-testid={`link-nav-${key}`}
            className={cn(
              "flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
              active
                ? "bg-gradient-to-r from-[#d97706] to-[#b45309] text-stone-950 font-bold shadow-md shadow-amber-950/30"
                : "text-amber-100/75 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-stone-950 stroke-[2.5]" : "text-amber-300/80"
              )}
            />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ session, children }: { session: AuthSession; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [isMobileSimActive, setIsMobileSimActive] = useState(false);
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const logout = useLogout();
  const { t, language } = useI18n();
  const doLogout = () => logout.mutate(undefined, { onSettled: () => { qc.clear(); navigate("/login"); } });

  const langNames: Record<string, string> = {
    en: "English",
    hi: "हिंदी",
    kn: "ಕನ್ನಡ",
  };

  const footer = (
    <div className="border-t border-amber-900/40 pt-3 px-3 space-y-3">
      {/* Android & Web Facility Button */}
      <button
        type="button"
        onClick={() => setShowAndroidModal(true)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-bold transition-all shadow-xs"
      >
        <span className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-amber-400" />
          <span>Android & Web</span>
        </span>
        <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-semibold">
          App
        </span>
      </button>

      {/* Voice Assistant preview badge */}
      <VoiceAssistantBadge />

      {/* Gunny Rice & Dal sacks illustration */}
      <GrainSacksGraphic />

      <div className="pt-2 flex items-center justify-between text-xs text-amber-200/70 border-t border-amber-900/30">
        <span className="font-medium truncate max-w-[130px]">{session.shop?.shop_name || "Kirana"}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-amber-300 hover:text-red-300 hover:bg-white/5"
          onClick={doLogout}
          disabled={logout.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          {logout.isPending ? "..." : t("signOut")}
        </Button>
      </div>
    </div>
  );

  return (
    <AndroidPhoneWrapper
      isActive={isMobileSimActive}
      onExit={() => setIsMobileSimActive(false)}
    >
      <AndroidWebModal
        open={showAndroidModal}
        onOpenChange={setShowAndroidModal}
        onToggleMobileSim={() => setIsMobileSimActive((prev) => !prev)}
        isMobileSimActive={isMobileSimActive}
      />
      <div className="min-h-[100dvh] bg-[#f4ebe1] md:grid md:grid-cols-[250px_1fr]">
        {/* Desktop Wood Plank Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-[100dvh] flex-col justify-between border-r border-[#3a2012] bg-gradient-to-b from-[#24130a] via-[#1b0d06] to-[#120803] text-stone-100 py-5 relative shadow-2xl z-20">
          {/* Subtle wood grain vertical sheen */}
          <div className="absolute inset-y-0 right-0 w-[1px] bg-amber-500/10" aria-hidden />

          <div>
            <div className="mb-6 px-4">
              <Link href="/"><KiranaLogo /></Link>
            </div>
            <div className="flex-1">
              <NavLinks />
            </div>
          </div>

          {footer}
        </aside>

        {/* Mobile Top Header */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-[#3a2012] bg-[#24130a] px-4 h-16 text-white shadow-md">
          <Link href="/"><KiranaLogo className="scale-90 origin-left" /></Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAndroidModal(true)}
              className="flex items-center gap-1 bg-amber-500/20 text-amber-200 border border-amber-400/40 text-xs font-bold h-8 px-2 rounded-full"
            >
              <span>📱</span>
            </button>
            <LanguageSelector compact />
            <Button
              variant="ghost"
              size="icon"
              className="text-amber-100 hover:bg-white/10"
              onClick={() => setOpen(true)}
              aria-label={t("openMenu")}
              data-testid="button-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Mobile Sidebar Drawer */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 bg-gradient-to-b from-[#24130a] via-[#1b0d06] to-[#120803] text-white flex flex-col p-4 border-r border-[#3a2012]">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <KiranaLogo className="mb-6" />
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNav={() => setOpen(false)} />
            </div>
            {footer}
          </SheetContent>
        </Sheet>

        {/* Main App Workspace */}
        <div className="min-w-0 p-3 sm:p-6 lg:p-8 flex flex-col items-center">
          <div className="w-full max-w-[1280px]">
            {/* Kirana Store Awning & Signboard Header */}
            <KiranaStoreHeader
              shopName={session.shop?.shop_name || "Sri Ganesh Kirana Stores"}
              language={langNames[language] || "English"}
              userName={session.user?.name || "Sri Ganesh Kirana"}
              onLogout={doLogout}
              onOpenAndroid={() => setShowAndroidModal(true)}
            />

            {/* Floating Warm Cream Main Card */}
            <main className="min-w-0 rounded-3xl bg-[#fdfaf5] border border-[#e8dfd5] shadow-2xl p-4 sm:p-7 md:p-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AndroidPhoneWrapper>
  );
}
