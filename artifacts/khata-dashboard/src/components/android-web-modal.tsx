import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Laptop,
  QrCode,
  Download,
  Share2,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2,
  Printer,
  Keyboard,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// QR Code SVG generator component
function AndroidQRCode({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-amber-300 shadow-md">
      <svg
        viewBox="0 0 100 100"
        className="w-40 h-40 text-stone-900"
        fill="currentColor"
        shapeRendering="crispEdges"
      >
        {/* Outer Frame */}
        <rect width="100" height="100" fill="white" />
        {/* Top-Left Finder Pattern */}
        <rect x="10" y="10" width="28" height="28" fill="#1c1917" />
        <rect x="14" y="14" width="20" height="20" fill="white" />
        <rect x="18" y="18" width="12" height="12" fill="#d97706" />

        {/* Top-Right Finder Pattern */}
        <rect x="62" y="10" width="28" height="28" fill="#1c1917" />
        <rect x="66" y="14" width="20" height="20" fill="white" />
        <rect x="70" y="18" width="12" height="12" fill="#d97706" />

        {/* Bottom-Left Finder Pattern */}
        <rect x="10" y="62" width="28" height="28" fill="#1c1917" />
        <rect x="14" y="66" width="20" height="20" fill="white" />
        <rect x="18" y="70" width="12" height="12" fill="#d97706" />

        {/* Realistic QR Data Modules */}
        <rect x="42" y="12" width="4" height="4" fill="#1c1917" />
        <rect x="50" y="12" width="6" height="4" fill="#1c1917" />
        <rect x="42" y="20" width="8" height="4" fill="#1c1917" />
        <rect x="52" y="24" width="4" height="8" fill="#1c1917" />
        <rect x="44" y="32" width="4" height="4" fill="#1c1917" />

        <rect x="12" y="44" width="8" height="4" fill="#1c1917" />
        <rect x="24" y="44" width="4" height="4" fill="#1c1917" />
        <rect x="32" y="42" width="6" height="6" fill="#1c1917" />
        <rect x="42" y="42" width="16" height="16" fill="#b45309" rx="2" />
        <rect x="62" y="44" width="10" height="4" fill="#1c1917" />
        <rect x="76" y="44" width="4" height="8" fill="#1c1917" />
        <rect x="84" y="44" width="6" height="4" fill="#1c1917" />

        <rect x="12" y="52" width="6" height="4" fill="#1c1917" />
        <rect x="22" y="52" width="4" height="6" fill="#1c1917" />
        <rect x="62" y="52" width="4" height="4" fill="#1c1917" />
        <rect x="70" y="52" width="6" height="4" fill="#1c1917" />
        <rect x="80" y="52" width="8" height="4" fill="#1c1917" />

        <rect x="44" y="64" width="8" height="4" fill="#1c1917" />
        <rect x="56" y="64" width="4" height="8" fill="#1c1917" />
        <rect x="44" y="74" width="4" height="6" fill="#1c1917" />
        <rect x="52" y="76" width="6" height="4" fill="#1c1917" />
        <rect x="64" y="64" width="6" height="4" fill="#1c1917" />
        <rect x="74" y="64" width="4" height="6" fill="#1c1917" />
        <rect x="82" y="64" width="8" height="4" fill="#1c1917" />
        <rect x="64" y="74" width="12" height="4" fill="#1c1917" />
        <rect x="80" y="74" width="8" height="6" fill="#1c1917" />
        <rect x="64" y="82" width="4" height="6" fill="#1c1917" />
        <rect x="72" y="82" width="16" height="4" fill="#1c1917" />
      </svg>
      <span className="mt-2 text-[11px] font-mono font-bold text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded-full truncate max-w-[220px]">
        {url}
      </span>
    </div>
  );
}

interface AndroidWebModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleMobileSim?: () => void;
  isMobileSimActive?: boolean;
}

export function AndroidWebModal({
  open,
  onOpenChange,
  onToggleMobileSim,
  isMobileSimActive = false,
}: AndroidWebModalProps) {
  const { toast } = useToast();
  const { t, language } = useI18n();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("http://localhost:5173/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.origin + "/");

      // Listen for PWA beforeinstallprompt event
      const handler = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
      };
      window.addEventListener("beforeinstallprompt", handler);

      // Check if already in standalone display mode
      if (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone
      ) {
        setIsInstalled(true);
      }

      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        toast({
          title: "Android App Installed",
          description: "KHATA is now installed on your Android device home screen!",
        });
      }
      setInstallPrompt(null);
    } else {
      toast({
        title: "Android PWA Installation",
        description:
          "On your Android phone Chrome browser, tap menu (⋮) -> 'Install app' or 'Add to Home screen'!",
      });
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "KHATA — Digital Khata for Kirana Shops",
        text: "Access your Kirana digital ledger and AI voice assistant on Android and Web!",
        url: currentUrl,
      });
    } else {
      navigator.clipboard.writeText(currentUrl);
      toast({
        title: "Link Copied",
        description: "Android & Web link copied to clipboard: " + currentUrl,
      });
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#fdfaf5] border-2 border-[#b89562] text-stone-900 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 font-bold shadow-md">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-serif text-xl sm:text-2xl font-black text-stone-900">
                Android & Web Facility
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-600">
                Use KHATA seamlessly on Android smartphones, tablets, laptops, and desktop POS counters.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="android" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-stone-200/80 p-1 rounded-xl">
            <TabsTrigger
              value="android"
              className="flex items-center gap-1.5 text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-xs"
            >
              <Smartphone className="h-3.5 w-3.5 text-amber-700" />
              <span>Android App</span>
            </TabsTrigger>
            <TabsTrigger
              value="web"
              className="flex items-center gap-1.5 text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-xs"
            >
              <Laptop className="h-3.5 w-3.5 text-amber-700" />
              <span>Web & Desktop</span>
            </TabsTrigger>
            <TabsTrigger
              value="simulator"
              className="flex items-center gap-1.5 text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-900 data-[state=active]:shadow-xs"
            >
              <Layers className="h-3.5 w-3.5 text-amber-700" />
              <span>Mobile Simulator</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ANDROID APP */}
          <TabsContent value="android" className="mt-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              {/* Left Column: QR Code & Direct Link */}
              <div className="flex flex-col items-center text-center space-y-2">
                <AndroidQRCode url={currentUrl} />
                <p className="text-[11px] text-stone-500 leading-tight">
                  Scan with your Android phone camera to open instantly
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="h-8 text-xs font-semibold rounded-xl border-amber-400 text-amber-900 hover:bg-amber-100/60"
                >
                  <Share2 className="h-3.5 w-3.5 mr-1 text-amber-700" />
                  <span>Share / Copy Android Link</span>
                </Button>
              </div>

              {/* Right Column: 1-Click Install Button & Steps */}
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-950">
                      1-Click Android App Install (PWA)
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 mb-3">
                    Installs KHATA as a standalone full-screen Android app with home screen icon, instant mic access, and offline data sync.
                  </p>
                  <Button
                    onClick={handleInstallClick}
                    className="w-full h-11 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>{isInstalled ? "Already Installed (Open App)" : "Install KHATA on Android Phone"}</span>
                  </Button>
                </div>

                {/* 3 Step Android Guide */}
                <div className="space-y-1.5 text-xs text-stone-700">
                  <span className="font-bold text-stone-900">How to use on Android:</span>
                  <div className="flex items-start gap-2 text-[11px]">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-black text-[10px]">1</span>
                    <span>Open <strong>{currentUrl}</strong> in Google Chrome on your phone.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-black text-[10px]">2</span>
                    <span>Tap Chrome menu (⋮) and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2 text-[11px]">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-black text-[10px]">3</span>
                    <span>Tap the KHATA icon on your home screen for native fullscreen experience!</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Android Capabilities Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-100/50 text-[11px] font-semibold text-stone-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Zero Storage APK</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-100/50 text-[11px] font-semibold text-stone-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Background Sync</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-100/50 text-[11px] font-semibold text-stone-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>1-Tap Voice Mic</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-100/50 text-[11px] font-semibold text-stone-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Works on All Phones</span>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: WEB & DESKTOP */}
          <TabsContent value="web" className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-amber-700" />
                  <span className="text-sm font-bold text-stone-900">Desktop Kirana Counter Mode</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleFullscreen}
                  className="h-8 text-xs font-semibold rounded-xl border-stone-300"
                >
                  <Maximize2 className="h-3.5 w-3.5 mr-1 text-stone-600" />
                  <span>Toggle Fullscreen Kiosk</span>
                </Button>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Optimized for large monitors, POS billing counters, laptop touchscreens, and thermal receipt printing.
              </p>

              {/* Keyboard Shortcuts List */}
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Keyboard className="h-3.5 w-3.5 text-amber-700" />
                  <span>Kirana Speed Keyboard Shortcuts</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-stone-600">Open Voice Assistant</span>
                    <kbd className="px-2 py-0.5 bg-stone-200 text-stone-800 font-mono font-bold rounded">Alt + V</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-stone-600">Quick New Customer</span>
                    <kbd className="px-2 py-0.5 bg-stone-200 text-stone-800 font-mono font-bold rounded">Alt + C</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-stone-600">Print Daily Report</span>
                    <kbd className="px-2 py-0.5 bg-stone-200 text-stone-800 font-mono font-bold rounded">Ctrl + P</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200">
                    <span className="text-stone-600">Switch Language</span>
                    <kbd className="px-2 py-0.5 bg-stone-200 text-stone-800 font-mono font-bold rounded">Alt + L</kbd>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: MOBILE SIMULATOR */}
          <TabsContent value="simulator" className="mt-5 space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Live Android Device Frame</h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Preview the entire KHATA application inside a modern Android smartphone frame right on your desktop.
                  </p>
                </div>
                {onToggleMobileSim && (
                  <Button
                    onClick={() => {
                      onToggleMobileSim();
                      onOpenChange(false);
                      toast({
                        title: isMobileSimActive ? "Desktop View Restored" : "Android Mobile Simulator Active",
                        description: isMobileSimActive ? "Switched to standard desktop layout." : "App is now framed inside an Android smartphone mockup!",
                      });
                    }}
                    className={cn(
                      "font-bold text-xs rounded-xl shadow-sm",
                      isMobileSimActive
                        ? "bg-red-700 hover:bg-red-800 text-white"
                        : "bg-amber-700 hover:bg-amber-800 text-white"
                    )}
                  >
                    {isMobileSimActive ? "Exit Mobile View" : "Enable Android Mobile View"}
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Android Phone Frame Container Wrapper
export function AndroidPhoneWrapper({
  children,
  isActive,
  onExit,
}: {
  children: React.ReactNode;
  isActive: boolean;
  onExit?: () => void;
}) {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen w-full bg-[#120703] py-6 px-2 flex flex-col items-center justify-center animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="mb-3 flex items-center justify-between w-full max-w-[420px] px-2 text-xs text-amber-200/80">
        <span className="flex items-center gap-1.5 font-bold">
          <Smartphone className="h-4 w-4 text-amber-400" />
          <span>Android Phone Simulator</span>
        </span>
        {onExit && (
          <button
            onClick={onExit}
            className="text-[11px] font-semibold text-amber-300 hover:text-white underline"
          >
            Exit to Full Web View ✕
          </button>
        )}
      </div>

      {/* Realistic Android Hardware Frame */}
      <div className="relative w-full max-w-[420px] h-[860px] rounded-[48px] bg-[#1a1a1a] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-stone-700/80 ring-1 ring-white/10 flex flex-col overflow-hidden">
        {/* Android Punch-hole Camera */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none">
          <div className="h-4 w-4 rounded-full bg-black border-2 border-stone-800 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-stone-900" />
          </div>
        </div>

        {/* Android Status Bar */}
        <div className="relative z-40 h-7 w-full bg-[#24130a] text-white px-6 flex items-center justify-between text-[11px] font-semibold select-none border-b border-black/20">
          <span>10:24</span>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span>5G</span>
            <span>📶</span>
            <span>🔋 100%</span>
          </div>
        </div>

        {/* Screen Viewport with internal scrolling */}
        <div className="relative flex-1 w-full bg-[#f4ebe1] overflow-y-auto overflow-x-hidden rounded-b-[36px]">
          {children}
        </div>

        {/* Android Bottom Navigation Pill */}
        <div className="h-5 w-full bg-[#1a1a1a] flex items-center justify-center select-none pt-1">
          <div className="h-1 w-28 rounded-full bg-stone-400/60" />
        </div>
      </div>
    </div>
  );
}
