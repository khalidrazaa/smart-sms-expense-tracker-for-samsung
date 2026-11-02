import React from 'react';
import { Smartphone, Moon, Sun, ShieldCheck, RefreshCw, QrCode } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isFrameMode: boolean;
  onToggleFrameMode: () => void;
  currency: string;
  onChangeCurrency: (c: string) => void;
  onOpenSmsSync: () => void;
  onOpenMobileLaunch: () => void;
}

const CURRENCIES = [
  { symbol: '₹', code: 'INR', label: 'INR (₹)' },
  { symbol: '$', code: 'USD', label: 'USD ($)' },
  { symbol: '€', code: 'EUR', label: 'EUR (€)' },
  { symbol: '£', code: 'GBP', label: 'GBP (£)' },
  { symbol: 'AED', code: 'AED', label: 'AED' },
];

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleTheme,
  isFrameMode,
  onToggleFrameMode,
  currency,
  onChangeCurrency,
  onOpenSmsSync,
  onOpenMobileLaunch,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 transition-colors">
      <div className="flex items-center justify-between gap-3">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/20 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                SpendTracker
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 px-1.5 py-0.2 rounded">
                Samsung A57
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
              SMS & Cash Ledger
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Quick QR / Mobile button */}
          <button
            onClick={onOpenMobileLaunch}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 text-xs font-semibold border border-sky-200 dark:border-sky-800/60 transition-colors"
            title="Open on your Samsung Galaxy A57 phone"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phone QR</span>
          </button>

          {/* Currency Dropdown Selector */}
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => onChangeCurrency(e.target.value)}
              className="appearance-none bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold py-1.5 pl-2.5 pr-6 rounded-lg border border-slate-200 dark:border-slate-700/80 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer transition-colors"
              title="Select Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.symbol}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
              <span className="text-[10px]">▼</span>
            </div>
          </div>

          {/* Quick SMS Sync Trigger */}
          <button
            onClick={onOpenSmsSync}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center min-w-[34px] min-h-[34px]"
            title="Read / Sync SMS"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Frame Preview Switch (visible on larger screens) */}
          <button
            onClick={onToggleFrameMode}
            className="hidden lg:flex p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors items-center justify-center min-w-[34px] min-h-[34px]"
            title={isFrameMode ? 'Switch to Full Screen' : 'Preview Samsung A57 Frame'}
          >
            <Smartphone className={`w-4 h-4 ${isFrameMode ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
          </button>

          {/* Dark / Light Mode Switch */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center min-w-[34px] min-h-[34px]"
            title="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
};
