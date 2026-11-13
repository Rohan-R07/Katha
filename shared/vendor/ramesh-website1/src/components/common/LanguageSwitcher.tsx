import React from 'react';
import { useApp } from '../../context/AppContext';
import { Language, languageOptions } from '../../types/shop';
import { Languages } from 'lucide-react';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false }) => {
  const { language, setLanguage } = useApp();

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : 'p-1 bg-slate-100 rounded-xl border border-slate-200'}`}>
      {!compact && (
        <div className="flex items-center gap-1 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <Languages className="w-3.5 h-3.5 text-amber-600" />
          <span>Lang</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {languageOptions.map((opt) => {
          const isSelected = language === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code as Language)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/50'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
              title={`Switch language to ${opt.name} (${opt.nativeName})`}
            >
              <span>{opt.nativeName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

