import React from "react";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/language-selector";

/**
 * High-fidelity Kirana Theme components replicating the authentic Indian Kirana
 * store UI/UX shown in the reference design.
 */

// 1. Logo with glowing golden woven Kirana basket
export function KiranaLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f59e0b] via-[#d97706] to-[#b45309] shadow-md shadow-amber-950/40 p-1.5 border border-amber-300/30">
        {/* Glowing Kirana Basket Icon */}
        <svg viewBox="0 0 40 40" className="h-full w-full text-amber-50 drop-shadow" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Basket Handle */}
          <path d="M14 16C14 11 16.5 8 20 8C23.5 8 26 11 26 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          {/* Basket Body */}
          <path d="M7 16H33L30 31C29.8 32.2 28.8 33 27.5 33H12.5C11.2 33 10.2 32.2 10 31L7 16Z" fill="#fbbf24" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          {/* Woven Crosshatch Lines */}
          <path d="M11 21H29M12 26H28M15 16L18 33M20 16V33M25 16L22 33" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
          {/* Sparkles */}
          <circle cx="9" cy="11" r="1.5" fill="#fef08a" className="animate-pulse" />
          <circle cx="31" cy="10" r="1.2" fill="#fef08a" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="font-display text-2xl font-black tracking-wider text-[#fffdfa] drop-shadow-sm leading-tight">
          KHATA
        </span>
        <span className="text-[11px] font-medium tracking-wide text-amber-200/80">
          Digital Khata for Kirana Shops
        </span>
      </div>
    </div>
  );
}

// 2. Auspicious Lord Ganesha Emblem
export function GaneshaEmblem({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#fef3c7] via-[#fde68a] to-[#f59e0b] border-2 border-[#b45309]/30 shadow-inner p-1.5", className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full text-[#78350f]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* Ganesha Traditional Line Art */}
        {/* Crown (Mukut) */}
        <path d="M42 22L50 12L58 22H42Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
        <path d="M50 12V6" stroke="#b45309" strokeWidth="2.5" />
        <circle cx="50" cy="5" r="2" fill="#b45309" />
        {/* Head & Tilak */}
        <path d="M35 30C35 22 65 22 65 30" strokeWidth="3.5" />
        <path d="M47 25H53M46 28H54M50 25V33" stroke="#b91c1c" strokeWidth="2" />
        {/* Ears */}
        <path d="M35 30C23 28 20 42 28 48C33 51 36 44 36 38" strokeWidth="3" fill="#fef3c7" />
        <path d="M65 30C77 28 80 42 72 48C67 51 64 44 64 38" strokeWidth="3" fill="#fef3c7" />
        {/* Trunk (Sond) curving to the left with Modak */}
        <path d="M44 34C44 46 47 56 42 66C38 72 30 72 28 66C26 60 33 58 35 60" strokeWidth="3.5" />
        {/* Tusk */}
        <path d="M57 42L63 43" strokeWidth="3" />
        {/* Eyes */}
        <circle cx="43" cy="31" r="1.5" fill="#78350f" />
        <circle cx="57" cy="31" r="1.5" fill="#78350f" />
        {/* Modak in trunk */}
        <circle cx="34" cy="59" r="3" fill="#d97706" stroke="#78350f" strokeWidth="1.5" />
        {/* Bell / Diya pedestal */}
        <path d="M38 76C42 74 58 74 62 76L64 82C64 84 36 84 36 82L38 76Z" fill="#b45309" stroke="#78350f" strokeWidth="2" />
      </svg>
    </div>
  );
}

// 3. Traditional Shop Signboard
export function KiranaSignboard({ shopName, className }: { shopName?: string; className?: string }) {
  return (
    <div className={cn("relative flex items-center gap-3.5 rounded-2xl bg-gradient-to-b from-[#fcf7ec] via-[#f7ebd4] to-[#f0dfc2] px-5 py-3 border-2 border-[#b89562] shadow-md shadow-stone-900/10", className)}>
      <GaneshaEmblem className="h-12 w-12 md:h-14 md:w-14" />
      <div className="flex flex-col">
        <h1 className="font-serif text-lg md:text-2xl font-bold tracking-tight text-[#29180d] drop-shadow-sm font-['Playfair_Display',_Georgia,_serif]">
          {shopName || "Sri Ganesh Kirana Stores"}
        </h1>
        <p className="text-xs md:text-sm font-medium text-[#6e4e37] tracking-wide">
          Groceries • Daily Needs • Household Items
        </p>
      </div>
    </div>
  );
}

// 4. Scalloped Red and Cream Awning (Kirana Chhappar)
export function KiranaAwning({ className }: { className?: string }) {
  // 12 scalloped alternating stripes (Red & Cream)
  const stripes = Array.from({ length: 14 });
  return (
    <div className={cn("relative w-full h-11 flex overflow-hidden select-none drop-shadow-md", className)}>
      {stripes.map((_, i) => {
        const isRed = i % 2 === 0;
        return (
          <div
            key={i}
            className="flex-1 relative flex flex-col items-center"
            style={{
              background: isRed
                ? "linear-gradient(to bottom, #991b1b 0%, #b91c1c 70%, #dc2626 100%)"
                : "linear-gradient(to bottom, #fef3c7 0%, #fef8ee 70%, #fffbeb 100%)",
            }}
          >
            {/* Subtle light sheen highlight */}
            <div className="absolute inset-x-0 top-0 h-1 bg-white/20" />
            {/* Bottom Scallop curve */}
            <div
              className="absolute -bottom-2 w-full h-4 rounded-b-full shadow-sm"
              style={{
                backgroundColor: isRed ? "#dc2626" : "#fffbeb",
                boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// 5. Authentic Kirana Shop Backdrop (Awning, Signboard, Hanging Snacks, Jars, UPI QR)
export function KiranaStoreHeader({
  shopName,
  language = "English",
  userName = "Sri Ganesh Kirana",
  onLogout,
  onLanguageChange,
  onOpenAndroid,
}: {
  shopName?: string;
  language?: string;
  userName?: string;
  onLogout?: () => void;
  onLanguageChange?: () => void;
  onOpenAndroid?: () => void;
}) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden mb-6 bg-gradient-to-r from-[#3e2417] via-[#5c3722] to-[#3a2014] border border-[#78462a]/50 shadow-xl">
      {/* Background Kirana Shelves illustration */}
      <div className="absolute inset-0 opacity-25 pointer-events-none mix-blend-overlay">
        {/* Subtle shelf background texture */}
        <div className="w-full h-full bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      {/* Top Scalloped Awning */}
      <KiranaAwning className="z-10" />

      {/* Main Storefront Area */}
      <div className="relative px-4 py-4 md:px-8 md:py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Hanging Snack Strip (Kurkure / Chips / Namkeen packets hanging on clip) */}
        <div className="hidden lg:flex items-center gap-2 pl-2">
          <div className="flex flex-col items-center gap-1.5 p-1 rounded-md bg-black/20 border border-white/10 shadow-sm">
            <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">Snacks</span>
            {/* Mini hanging packet visual */}
            <div className="w-9 h-6 rounded bg-gradient-to-br from-amber-500 to-red-600 shadow-sm flex items-center justify-center text-[8px] font-black text-white">CHIPS</div>
            <div className="w-9 h-6 rounded bg-gradient-to-br from-orange-500 to-amber-600 shadow-sm flex items-center justify-center text-[8px] font-black text-white">NAMKEEN</div>
            <div className="w-9 h-6 rounded bg-gradient-to-br from-red-600 to-orange-700 shadow-sm flex items-center justify-center text-[8px] font-black text-white">KURKURE</div>
          </div>
        </div>

        {/* Center: Signboard */}
        <div className="flex-1 flex justify-center max-w-xl w-full">
          <KiranaSignboard shopName={shopName} className="w-full justify-center" />
        </div>

        {/* Right: Glass Spice Jars + UPI QR standee + Actions */}
        <div className="flex items-center gap-3">
          {/* Glass Jars (Illustrated Shelf items) */}
          <div className="hidden xl:flex items-center gap-1.5 p-1.5 rounded-lg bg-black/20 border border-white/10">
            <div className="flex flex-col items-center">
              <div className="w-5 h-2 rounded-t bg-amber-200/50" />
              <div className="w-6 h-7 rounded-b-md bg-gradient-to-b from-amber-300/30 to-amber-500/50 border border-amber-200/40 flex items-center justify-center text-[9px]">🫚</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-5 h-2 rounded-t bg-red-200/50" />
              <div className="w-6 h-7 rounded-b-md bg-gradient-to-b from-red-400/30 to-red-600/50 border border-red-200/40 flex items-center justify-center text-[9px]">🌶️</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-5 h-2 rounded-t bg-yellow-200/50" />
              <div className="w-6 h-7 rounded-b-md bg-gradient-to-b from-yellow-300/30 to-yellow-500/50 border border-yellow-200/40 flex items-center justify-center text-[9px]">🍬</div>
            </div>
          </div>

          {/* UPI Accepted Here Standee */}
          <div className="hidden sm:flex flex-col items-center bg-white rounded-lg p-1.5 border border-stone-300 shadow-md text-stone-900 select-none">
            <div className="flex items-center gap-1 px-1">
              <span className="text-[10px] font-black text-[#15803d]">UPI</span>
              <span className="text-[8px] font-bold text-stone-500 leading-none">Accepted Here</span>
            </div>
            {/* Realistic QR pattern */}
            <div className="w-10 h-10 bg-stone-900 rounded p-1 flex items-center justify-center my-0.5">
              <svg viewBox="0 0 24 24" className="w-full h-full text-white" fill="currentColor">
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4 4h4v4h-4v-4zm4-4h4v4h-4v-4z" />
              </svg>
            </div>
          </div>

          {/* Top Floating Controls: Android App, Language, Notification, User */}
          <div className="flex items-center gap-2">
            {/* Android & Web App Modal Button */}
            {onOpenAndroid && (
              <button
                type="button"
                onClick={onOpenAndroid}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs font-bold h-8 px-2.5 rounded-full shadow-xs transition-colors"
                title="Android App & Web Facility"
              >
                <span>📱</span>
                <span className="hidden md:inline">Android & Web</span>
              </button>
            )}

            {/* Language Selector Dropdown */}
            <LanguageSelector className="bg-black/40 hover:bg-black/60 text-white border-white/20 text-xs h-8 px-2.5 rounded-full" compact />

            {/* Notification Bell */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black/40 border border-white/20 text-white/90 shadow-sm cursor-pointer hover:bg-black/60 transition-colors">
              <span className="text-sm">🔔</span>
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-stone-900" />
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-black/40 border border-white/20 backdrop-blur text-white text-xs font-semibold shadow-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3b82f6] text-white text-[11px] font-bold">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline">{userName}</span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out"
                  className="ml-1 text-[10px] text-red-300 hover:text-red-100 hover:underline"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. Burlap / Gunny Grain Sacks Graphic (Basmati Rice + Toor Dal)
export function GrainSacksGraphic({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-end justify-center select-none pt-2", className)}>
      <div className="relative flex items-end gap-1">
        {/* Rice Sack (Basmati) */}
        <div className="relative flex flex-col items-center">
          {/* Overflowing Rice grains */}
          <div className="relative z-10 -mb-2 w-14 h-4 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center shadow-inner">
            <div className="w-12 h-2.5 rounded-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:3px_3px]" />
          </div>
          {/* Burlap sack bag */}
          <div className="w-16 h-18 rounded-t-lg rounded-b-2xl bg-gradient-to-b from-[#b89562] via-[#9c7949] to-[#7d5f35] p-2 flex flex-col items-center justify-center shadow-lg border border-[#6b502c]">
            <span className="text-[9px] font-black text-stone-950 uppercase tracking-wider bg-amber-200/60 px-1 rounded">RICE</span>
            <div className="w-10 h-0.5 bg-stone-900/30 my-1" />
            <span className="text-[7px] font-bold text-stone-900">BASMATI</span>
          </div>
        </div>

        {/* Dal / Pulses Sack */}
        <div className="relative flex flex-col items-center -ml-3">
          {/* Overflowing yellow Dal grains */}
          <div className="relative z-10 -mb-2 w-12 h-3.5 rounded-full bg-amber-200 border border-amber-300 flex items-center justify-center shadow-inner">
            <div className="w-10 h-2 rounded-full bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:2px_2px]" />
          </div>
          {/* Burlap sack bag */}
          <div className="w-14 h-15 rounded-t-lg rounded-b-2xl bg-gradient-to-b from-[#a38354] via-[#8c6c3e] to-[#6e512b] p-1.5 flex flex-col items-center justify-center shadow-md border border-[#59401f]">
            <span className="text-[8px] font-black text-amber-950 uppercase tracking-wider bg-amber-100/50 px-1 rounded">DAL</span>
            <span className="text-[6px] font-semibold text-stone-900">TOOR</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 7. AI Voice Assistant Pill Badge
export function VoiceAssistantBadge({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-stone-900/80 to-stone-800/80 border border-amber-500/40 shadow-md backdrop-blur", className)}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-amber-200 truncate">AI Voice Assistant</span>
        <span className="text-[10px] text-amber-400/80 font-medium">(Coming Soon)</span>
      </div>
    </div>
  );
}

// 8. Visual Kirana Product Mini Icons (Rice, Sugar, Tea, Milk, Bread, Eggs, Flour, Oil, Dal, Soap, Detergent)
export function KiranaProductIcon({ name, className }: { name: string; className?: string }) {
  const n = (name || "").toLowerCase();

  // Rice / Basmati
  if (n.includes("rice") || n.includes("chawal")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fef3c7] border border-[#fde68a] text-base shadow-2xs", className)} title="Rice">
        🌾
      </span>
    );
  }

  // Sugar
  if (n.includes("sugar") || n.includes("sakkar") || n.includes("cheeni")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-white border border-stone-200 text-base shadow-2xs", className)} title="Sugar">
        🍚
      </span>
    );
  }

  // Tea / Chai
  if (n.includes("tea") || n.includes("chai") || n.includes("coffee")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#ffedd5] border border-[#fed7aa] text-base shadow-2xs", className)} title="Tea">
        ☕
      </span>
    );
  }

  // Milk / Doodh / Dairy
  if (n.includes("milk") || n.includes("doodh") || n.includes("curd") || n.includes("dahi")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#eff6ff] border border-[#dbeafe] text-base shadow-2xs", className)} title="Milk">
        🥛
      </span>
    );
  }

  // Bread / Pav / Roti
  if (n.includes("bread") || n.includes("pav") || n.includes("bun")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fef3c7] border border-[#fde68a] text-base shadow-2xs", className)} title="Bread">
        🍞
      </span>
    );
  }

  // Eggs / Anda
  if (n.includes("egg") || n.includes("anda")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fefce8] border border-[#fef08a] text-base shadow-2xs", className)} title="Eggs">
        🥚
      </span>
    );
  }

  // Wheat Flour / Atta / Maida
  if (n.includes("wheat") || n.includes("flour") || n.includes("atta") || n.includes("maida")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fef9c3] border border-[#fef08a] text-base shadow-2xs", className)} title="Flour">
        🥣
      </span>
    );
  }

  // Cooking Oil / Ghee
  if (n.includes("oil") || n.includes("tel") || n.includes("ghee")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fef08a]/60 border border-[#fde047] text-base shadow-2xs", className)} title="Cooking Oil">
        🧴
      </span>
    );
  }

  // Dal / Pulses / Toor / Moong / Chana
  if (n.includes("dal") || n.includes("toor") || n.includes("pulse") || n.includes("chana") || n.includes("moong")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fef3c7] border border-[#fde68a] text-base shadow-2xs", className)} title="Dal / Pulses">
        🍲
      </span>
    );
  }

  // Soap / Bath / Lux / Lifebuoy
  if (n.includes("soap") || n.includes("sabun") || n.includes("lux") || n.includes("dettol")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fce7f3] border border-[#fbcfe8] text-base shadow-2xs", className)} title="Soap">
        🧼
      </span>
    );
  }

  // Detergent / Surf / Surf Excel / Tide / Powder
  if (n.includes("detergent") || n.includes("surf") || n.includes("tide") || n.includes("washing") || n.includes("powder")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#dbeafe] border border-[#bfdbfe] text-base shadow-2xs", className)} title="Detergent">
        🫧
      </span>
    );
  }

  // Biscuits / Cookies
  if (n.includes("biscuit") || n.includes("cookie") || n.includes("parle")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fed7aa] border border-[#fdba74] text-base shadow-2xs", className)} title="Biscuits">
        🍪
      </span>
    );
  }

  // Spices / Masala / Chilli / Haldi
  if (n.includes("masala") || n.includes("spice") || n.includes("chilli") || n.includes("haldi") || n.includes("salt") || n.includes("namak")) {
    return (
      <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#fee2e2] border border-[#fecaca] text-base shadow-2xs", className)} title="Spices">
        🧂
      </span>
    );
  }

  // Default Grocery item
  return (
    <span className={cn("inline-flex items-center justify-center h-7 w-7 rounded-md bg-[#f5f5f4] border border-stone-200 text-base shadow-2xs", className)} title={name}>
      🛒
    </span>
  );
}

// 9. Row of visual product icons extracted from an item list
export function KiranaProductRowIcons({ items }: { items: Array<{ product_name?: string }> }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="inline-flex items-center gap-1 shrink-0">
      {items.slice(0, 3).map((it, idx) => (
        <KiranaProductIcon key={idx} name={it.product_name || ""} />
      ))}
      {items.length > 3 && (
        <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1 py-0.5 rounded">
          +{items.length - 3}
        </span>
      )}
    </div>
  );
}

