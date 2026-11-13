import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Globe, Loader2, Mic, ShieldCheck, Smartphone, Sparkles, Store, Wallet } from "lucide-react";
import { useLogin, useRegister, useCreateShop, useLogout, getGetMeQueryKey, type AuthSession } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KiranaLogo,
  KiranaAwning,
  GaneshaEmblem,
  KiranaSignboard,
  GrainSacksGraphic,
} from "@/components/kirana-theme";
import { LanguageSelector } from "@/components/language-selector";
import { AndroidWebModal } from "@/components/android-web-modal";
import { useI18n } from "@/lib/i18n";
import { errorMessage } from "@/lib/khata";
import { cn } from "@/lib/utils";

function AuthFrame({
  children,
  onOpenAndroid,
}: {
  children: ReactNode;
  onOpenAndroid?: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-x-hidden bg-[#1f1008] text-stone-100 font-sans select-none">
      {/* Background Kirana Shop Photo with Aesthetic Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 filter blur-[1px] transform scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/kirana-bg.jpg')" }}
        aria-hidden
      />
      {/* Gradient Ambient Lighting Overlays */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#1b0d06]/90 via-[#27140a]/80 to-[#120703]/95 pointer-events-none"
        aria-hidden
      />

      {/* Top Scalloped Red-and-Cream Kirana Awning */}
      <div className="relative z-20 w-full shadow-lg">
        <KiranaAwning />
        {/* Top Navbar Row */}
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KiranaLogo />
          </div>
          <div className="flex items-center gap-3">
            {onOpenAndroid && (
              <Button
                type="button"
                onClick={onOpenAndroid}
                variant="outline"
                className="h-8 px-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Smartphone className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Android & Web</span>
                <span className="sm:hidden">App</span>
              </Button>
            )}
            <LanguageSelector className="bg-black/40 border-amber-500/30 text-amber-100 hover:bg-black/60 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-4xl">
          {children}
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="relative z-10 w-full border-t border-amber-900/40 bg-black/40 backdrop-blur-xs py-3 px-4 text-center text-xs text-amber-200/60">
        <span>© {new Date().getFullYear()} KHATA — Digital Kirana Platform · Built for Kirana Hackathon</span>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  ...p
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-stone-800">{label}</Label>
      <Input
        id={id}
        className="h-11 bg-white border-stone-300 text-stone-900 focus-visible:ring-amber-600 rounded-xl"
        aria-invalid={!!error}
        data-testid={`input-${id}`}
        {...p}
      />
      {error ? (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      ) : hint ? (
        <p className="text-xs text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

function useAuthSuccess() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  return (s: AuthSession) => {
    qc.clear();
    qc.setQueryData(getGetMeQueryKey(), s);
    navigate(s.shop ? "/" : "/setup");
  };
}

export function LoginPage() {
  const login = useLogin();
  const done = useAuthSuccess();
  const { t } = useI18n();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const handleDemoSignIn = () => {
    setEmail("amogh@kirana.com");
    setPassword("password123");
    setErr(null);
    login.mutate(
      { data: { email: "amogh@kirana.com", password: "password123" } },
      { onSuccess: done, onError: (x) => setErr(errorMessage(x, "Demo sign-in failed.")) }
    );
  };

  return (
    <AuthFrame onOpenAndroid={() => setShowAndroidModal(true)}>
      <AndroidWebModal open={showAndroidModal} onOpenChange={setShowAndroidModal} />
      {!showLoginForm ? (
        /* FIRST INTERFACE: SPLASH / HERO SCREEN WITH LOGO & ENTRY BUTTONS */
        <div className="flex flex-col items-center text-center space-y-8 animate-in fade-in duration-300">
          {/* Glowing Animated Kirana Logo Showcase */}
          <div className="relative group">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-orange-500/30 to-amber-500/20 blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
            <div className="relative flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-[#2a170d]/90 to-[#180a04]/95 border-2 border-amber-500/40 shadow-2xl backdrop-blur-md">
              <img
                src="/khata-logo.svg"
                alt="KHATA Logo"
                className="h-28 w-28 md:h-36 md:w-36 drop-shadow-[0_10px_20px_rgba(245,158,11,0.35)] animate-pulse"
              />
              <div className="mt-4 flex flex-col items-center">
                <span className="font-serif text-3xl md:text-5xl font-black tracking-widest text-[#fffbeb] drop-shadow-md">
                  KHATA
                </span>
                <span className="text-xs md:text-sm font-semibold tracking-wider text-amber-300 uppercase mt-1">
                  Digital Khata for Kirana Shops
                </span>
              </div>
            </div>
          </div>

          {/* Hero Headline & Subheading */}
          <div className="max-w-2xl space-y-3">
            <h1 className="font-serif text-2xl md:text-4xl font-extrabold text-[#fffdfa] leading-tight drop-shadow-sm">
              {t("heroHeading")}
            </h1>
            <p className="text-sm md:text-base text-amber-100/80 leading-relaxed font-normal">
              {t("heroSubheading")}
            </p>
          </div>

          {/* 3 Core Kirana Features Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full max-w-3xl text-left">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-stone-950 font-bold shadow-md">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-amber-200">{t("featureVoiceTitle")}</h2>
                <p className="text-[11px] text-stone-300 leading-snug mt-0.5">{t("featureVoiceDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-stone-950 font-bold shadow-md">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-amber-200">{t("featureLedgerTitle")}</h2>
                <p className="text-[11px] text-stone-300 leading-snug mt-0.5">{t("featureLedgerDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-black/40 border border-amber-500/20 backdrop-blur-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-stone-950 font-bold shadow-md">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-amber-200">{t("featureRemindersTitle")}</h2>
                <p className="text-[11px] text-stone-300 leading-snug mt-0.5">{t("featureRemindersDesc")}</p>
              </div>
            </div>
          </div>

          {/* Entrance CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-lg pt-2">
            {/* Primary Button: Enter Shop / Open Login Form */}
            <Button
              type="button"
              onClick={() => setShowLoginForm(true)}
              className="w-full sm:flex-1 h-12 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 border border-amber-400/30 transition-all transform hover:scale-[1.02]"
              data-testid="button-enter-shop"
            >
              <span>{t("enterShopBtn")}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Accent Button: 1-Click Instant Demo Login */}
            <Button
              type="button"
              onClick={handleDemoSignIn}
              disabled={login.isPending}
              variant="outline"
              className="w-full sm:flex-1 h-12 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-amber-400/60 text-amber-200 hover:text-amber-100 font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
              data-testid="button-quick-demo"
            >
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin text-amber-400" /> : <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />}
              <span className="truncate">{t("instantDemoHeroBtn")}</span>
            </Button>

            {/* Android & Web App Modal Button */}
            <Button
              type="button"
              onClick={() => setShowAndroidModal(true)}
              variant="outline"
              className="w-full sm:w-auto h-12 px-4 bg-black/40 hover:bg-black/60 border border-amber-400/40 text-amber-200 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <Smartphone className="h-4 w-4 text-amber-400" />
              <span>📱 Android & Web</span>
            </Button>
          </div>
        </div>
      ) : (
        /* SECOND INTERFACE: AUTHENTIC KIRANA LOGIN CARD */
        <div className="max-w-md mx-auto rounded-3xl bg-[#fdfaf5] border-2 border-[#b89562] shadow-2xl p-6 sm:p-8 text-stone-900 animate-in fade-in zoom-in-95 duration-200 relative">
          {/* Card Top Awning Accent */}
          <div className="absolute -top-3 left-6 right-6 h-3 rounded-t-xl bg-gradient-to-r from-red-600 via-amber-200 to-red-600 opacity-90" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-200">
            <div className="flex items-center gap-2.5">
              <GaneshaEmblem className="h-10 w-10" />
              <div>
                <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">Sri Ganesh Kirana</h2>
                <p className="text-[11px] text-stone-500 font-medium">Groceries · Daily Needs</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLoginForm(false)}
              className="text-xs font-semibold text-stone-500 hover:text-amber-800 transition-colors flex items-center gap-1"
            >
              <span>{t("backToWelcome")}</span>
            </button>
          </div>

          <div className="mt-4 mb-6">
            <h1 className="font-serif text-2xl font-black text-stone-900">{t("loginTitle")}</h1>
            <p className="text-xs text-stone-600 mt-1">{t("loginSubtitle")}</p>
          </div>

          {/* One-Click Instant Demo Access Box */}
          <div className="mb-5 p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300/80 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>{t("orOneClickDemo")}</span>
              </span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full">
                Pre-loaded Data
              </span>
            </div>
            <Button
              type="button"
              onClick={handleDemoSignIn}
              disabled={login.isPending}
              className="w-full h-10 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
              data-testid="button-demo-signin"
            >
              {login.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t("oneClickDemoBtn")}</span>
            </Button>
          </div>

          <div className="relative flex py-2 items-center my-3">
            <div className="flex-grow border-t border-stone-200" />
            <span className="flex-shrink mx-3 text-[11px] text-stone-400 font-bold uppercase tracking-wider">
              {t("or")}
            </span>
            <div className="flex-grow border-t border-stone-200" />
          </div>

          {/* Email / Password Form */}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              login.mutate(
                { data: { email: email.trim(), password } },
                { onSuccess: done, onError: (x) => setErr(errorMessage(x, "Sign-in failed.")) }
              );
            }}
          >
            <Field
              id="email"
              label={t("emailLabel")}
              type="email"
              autoComplete="email"
              required
              placeholder="amogh@kirana.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              id="password"
              label={t("passwordLabel")}
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {err && (
              <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium" role="alert" data-testid="status-login-error">
                {err}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-md"
              disabled={login.isPending}
              data-testid="button-login"
            >
              {login.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {t("signInBtn")}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-stone-600">
            {t("newShopPrompt")}{" "}
            <Link
              href="/register"
              className="font-bold text-amber-800 underline-offset-4 hover:underline"
              data-testid="link-register"
            >
              {t("createAccountLink")}
            </Link>
          </p>
        </div>
      )}
    </AuthFrame>
  );
}

export function RegisterPage() {
  const reg = useRegister();
  const done = useAuthSuccess();
  const { t } = useI18n();
  const [f, setF] = useState({ name: "", email: "", mobile: "", password: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Your name is required";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email";
    if (!/^\+?[0-9]{10,13}$/.test(f.mobile.trim())) e.mobile = "10 to 13 digits, optional leading +";
    if (f.password.length < 10) e.password = "At least 10 characters";
    setErrs(e);
    if (Object.keys(e).length) return;
    setErr(null);
    reg.mutate(
      { data: { name: f.name.trim(), email: f.email.trim(), mobile_number: f.mobile.trim(), password: f.password } },
      { onSuccess: done, onError: (x) => setErr(errorMessage(x, "Registration failed.")) }
    );
  };

  return (
    <AuthFrame>
      <div className="max-w-md mx-auto rounded-3xl bg-[#fdfaf5] border-2 border-[#b89562] shadow-2xl p-6 sm:p-8 text-stone-900 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-200">
          <GaneshaEmblem className="h-10 w-10" />
          <div>
            <h1 className="font-serif text-2xl font-black text-stone-900">{t("registerTitle")}</h1>
            <p className="text-xs text-stone-600">{t("registerSubtitle")}</p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field id="name" label={t("fullNameLabel")} autoComplete="name" value={f.name} onChange={set("name")} error={errs.name} />
          <Field id="reg-email" label={t("emailLabel")} type="email" autoComplete="email" value={f.email} onChange={set("email")} error={errs.email} />
          <Field id="mobile" label={t("mobileLabel")} inputMode="tel" autoComplete="tel" value={f.mobile} onChange={set("mobile")} error={errs.mobile} />
          <Field
            id="reg-password"
            label={t("passwordLabel")}
            type="password"
            autoComplete="new-password"
            value={f.password}
            onChange={set("password")}
            error={errs.password}
            hint="Minimum 10 characters"
          />

          {err && (
            <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium" role="alert">
              {err}
            </p>
          )}

          <Button type="submit" className="w-full h-11 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl" disabled={reg.isPending} data-testid="button-register">
            {reg.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {t("continueBtn")}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-600">
          {t("alreadyRegisteredPrompt")}{" "}
          <Link href="/login" className="font-bold text-amber-800 underline-offset-4 hover:underline" data-testid="link-login">
            {t("signInBtn")}
          </Link>
        </p>
      </div>
    </AuthFrame>
  );
}

export function SetupPage({ session }: { session: AuthSession }) {
  const create = useCreateShop();
  const logout = useLogout();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const [f, setF] = useState({ shop_name: "", city: "", state: "", contact_number: session.user.mobile_number ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <AuthFrame>
      <div className="max-w-md mx-auto rounded-3xl bg-[#fdfaf5] border-2 border-[#b89562] shadow-2xl p-6 sm:p-8 text-stone-900 animate-in fade-in duration-200">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-200">
          <GaneshaEmblem className="h-10 w-10" />
          <div>
            <h1 className="font-serif text-2xl font-black text-stone-900">{t("setupShopTitle")}</h1>
            <p className="text-xs text-stone-600">Hi {session.user.name.split(" ")[0]}, {t("setupShopSubtitle")}</p>
          </div>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!f.shop_name.trim()) return setErr("Shop name is required");
            setErr(null);
            create.mutate(
              {
                data: {
                  shop_name: f.shop_name.trim(),
                  shop_type: "kirana",
                  city: f.city.trim() || undefined,
                  state: f.state.trim() || undefined,
                  contact_number: f.contact_number.trim() || undefined,
                },
              },
              {
                onSuccess: (shop) => {
                  qc.setQueryData(getGetMeQueryKey(), { ...session, shop });
                  qc.invalidateQueries();
                  navigate("/");
                },
                onError: (x) => setErr(errorMessage(x)),
              }
            );
          }}
        >
          <Field id="shop_name" label={t("shopNameField")} autoFocus maxLength={150} value={f.shop_name} onChange={set("shop_name")} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="city" label={t("cityField")} value={f.city} onChange={set("city")} />
            <Field id="state" label={t("stateField")} value={f.state} onChange={set("state")} />
          </div>
          <Field id="contact_number" label={t("shopContactField")} inputMode="tel" value={f.contact_number} onChange={set("contact_number")} />

          {err && (
            <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-medium" role="alert">
              {err}
            </p>
          )}

          <Button type="submit" className="w-full h-11 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl" disabled={create.isPending} data-testid="button-create-shop">
            {create.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {t("openMyKhataBtn")}
          </Button>
        </form>

        <button
          className="mt-6 w-full text-center text-xs text-stone-500 hover:text-red-700 underline-offset-4 hover:underline"
          onClick={() => logout.mutate(undefined, { onSettled: () => { qc.clear(); navigate("/login"); } })}
          data-testid="button-setup-logout"
        >
          {t("signOutInstead")}
        </button>
      </div>
    </AuthFrame>
  );
}
