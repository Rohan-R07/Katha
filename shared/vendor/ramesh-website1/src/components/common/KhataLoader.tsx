import React from 'react';
import { Sparkles } from 'lucide-react';

interface KhataSplashLoaderProps {
  message?: string;
  subMessage?: string;
}

export const KhataSplashLoader: React.FC<KhataSplashLoaderProps> = ({
  message = 'ಖಾತಾ AI ಆರಂಭವಾಗುತ್ತಿದೆ...',
  subMessage = 'Kirana Voice OS is Loading • Amogh FastAPI & Rohan Voice Ready',
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex flex-col items-center justify-center p-6 text-white text-center">
      {/* Central Glowing Kirana Emblem */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-white/30 blur-xl animate-pulse scale-125" />
        <div className="relative w-24 h-24 rounded-3xl bg-white text-amber-700 flex items-center justify-center shadow-2xl animate-gentle-pulse">
          <span className="text-4xl font-black">ಖಾ</span>
        </div>
      </div>

      {/* Main Title & Tagline */}
      <div className="flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-xs mb-3 border border-white/30">
        <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
        <span>Project Khata • Website 1</span>
      </div>

      <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md">
        {message}
      </h2>
      <p className="text-xs sm:text-sm text-yellow-100 font-semibold mt-1.5 max-w-md">
        {subMessage}
      </p>

      {/* Animated Sound Wave Bars */}
      <div className="flex items-center gap-1.5 h-10 mt-6">
        <div className="w-1.5 bg-white rounded-full audio-bar-1" />
        <div className="w-1.5 bg-yellow-200 rounded-full audio-bar-2" />
        <div className="w-1.5 bg-white rounded-full audio-bar-3" />
        <div className="w-1.5 bg-yellow-200 rounded-full audio-bar-4" />
        <div className="w-1.5 bg-white rounded-full audio-bar-5" />
      </div>

      <div className="text-[11px] font-mono text-white/80 mt-6">
        ಕನ್ನಡ • हिंदी • English Voice Engine
      </div>
    </div>
  );
};

export const KhataSkeletonCard: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl animate-shimmer" />
          <div className="space-y-1.5">
            <div className="w-24 h-3.5 rounded-md animate-shimmer" />
            <div className="w-36 h-4 rounded-md animate-shimmer" />
          </div>
        </div>
        <div className="w-14 h-5 rounded-full animate-shimmer" />
      </div>
      <div className="w-full h-10 rounded-xl animate-shimmer" />
      <div className="flex justify-between pt-2">
        <div className="w-20 h-4 rounded-md animate-shimmer" />
        <div className="w-16 h-4 rounded-md animate-shimmer" />
      </div>
    </div>
  );
};

export const KhataSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dim = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return (
    <div className={`${dim} border-2 border-amber-600 border-t-transparent rounded-full animate-spin`} />
  );
};

