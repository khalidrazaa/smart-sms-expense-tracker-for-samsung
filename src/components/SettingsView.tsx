import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  RefreshCw,
  Trash2,
  Vibrate,
  Coins,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  currency: string;
  onChangeCurrency: (c: string) => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onResetSample: () => void;
  onClearAll: () => void;
  onOpenMobileLaunch: () => void;
}

const CURRENCIES = [
  { symbol: '₹', code: 'INR', label: 'Indian Rupee (₹ INR)' },
  { symbol: '$', code: 'USD', label: 'US Dollar ($ USD)' },
  { symbol: '€', code: 'EUR', label: 'Euro (€ EUR)' },
  { symbol: '£', code: 'GBP', label: 'British Pound (£ GBP)' },
  { symbol: 'AED', code: 'AED', label: 'UAE Dirham (AED)' },
  { symbol: 'CAD', code: 'CAD', label: 'Canadian Dollar ($ CAD)' },
  { symbol: 'AUD', code: 'AUD', label: 'Australian Dollar ($ AUD)' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currency,
  onChangeCurrency,
  hapticsEnabled,
  onToggleHaptics,
  onExportCsv,
  onExportJson,
  onResetSample,
  onClearAll,
  onOpenMobileLaunch,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="space-y-4">
      {/* Device & PWA Card */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Samsung Galaxy A57
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Android 15 · One UI 7 · PWA Ready
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
            Active
          </span>
        </div>

        {/* Buttons: Install App + Scan QR to Open */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <PWAInstallButton />

          <button
            onClick={onOpenMobileLaunch}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-sky-500" />
            <span>Open with QR Code on Samsung A57</span>
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 transition-colors shadow-sm">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Preferences & Controls
        </h4>

        {/* Currency Selector */}
        <div>
          <label className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2 mb-1.5">
            <Coins className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            Display Currency
          </label>
          <select
            value={currency}
            onChange={(e) => onChangeCurrency(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.symbol}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Haptic Feedback Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Vibrate className="w-4 h-4 text-sky-500 dark:text-sky-400" />
            <div>
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                Tactile Haptics (Vibration)
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Vibrate on tapping buttons and adding records
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleHaptics}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              hapticsEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                hapticsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Data Export & Management */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors shadow-sm">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Data Backup & Export
        </h4>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onExportCsv}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left transition-colors cursor-pointer group"
          >
            <Download className="w-4 h-4 text-sky-500 dark:text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Export CSV</div>
            <div className="text-[10px] text-slate-500">For Excel & Sheets</div>
          </button>

          <button
            onClick={onExportJson}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left transition-colors cursor-pointer group"
          >
            <Share2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Export JSON</div>
            <div className="text-[10px] text-slate-500">Full backup file</div>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onResetSample}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset to Sample Data
          </button>

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Data
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  onClearAll();
                  setShowClearConfirm(false);
                }}
                className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-bold"
              >
                Confirm Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[11px]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="p-3.5 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-850 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5 transition-colors">
        <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-800 dark:text-slate-200">100% On-Device Privacy</div>
          <p className="text-[11px] leading-relaxed">
            All your financial SMS messages and cash transaction logs are parsed and stored locally in your Samsung browser storage. Zero data leaves your device.
          </p>
        </div>
      </div>
    </div>
  );
};
