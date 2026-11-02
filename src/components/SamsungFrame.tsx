import React, { ReactNode } from 'react';
import { Wifi, Signal, Battery, Smartphone, Maximize2, QrCode } from 'lucide-react';

interface SamsungFrameProps {
  isFrameMode: boolean;
  onToggleFrameMode: () => void;
  onOpenMobileLaunch: () => void;
  children: ReactNode;
}

export const SamsungFrame: React.FC<SamsungFrameProps> = ({
  isFrameMode,
  onToggleFrameMode,
  onOpenMobileLaunch,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-start antialiased selection:bg-sky-500 selection:text-white transition-colors">
      {/* Desktop mode header banner */}
      <div className="hidden lg:flex w-full items-center justify-between px-6 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 transition-colors">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Samsung Galaxy A57 Experience
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 dark:text-slate-400">
            Super AMOLED 120Hz · Android 15 · One UI 7
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick QR Launch on Real Phone */}
          <button
            onClick={onOpenMobileLaunch}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer font-medium"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Scan QR to Open on Your Samsung Phone</span>
          </button>

          <button
            onClick={onToggleFrameMode}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{isFrameMode ? 'Expand to Full Width' : 'Show Samsung Phone Frame'}</span>
          </button>
        </div>
      </div>

      <div
        className={`w-full transition-all duration-300 ${
          isFrameMode
            ? 'lg:my-8 lg:max-w-[430px] lg:rounded-[48px] lg:border-[8px] lg:border-slate-800 lg:shadow-2xl lg:shadow-sky-950/30 lg:overflow-hidden lg:ring-1 lg:ring-slate-700/60'
            : 'max-w-2xl mx-auto'
        }`}
      >
        {/* Realistic Android / One UI Status Bar (visible inside frame mode) */}
        {isFrameMode && (
          <div className="hidden lg:flex items-center justify-between px-7 pt-3 pb-1 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-[11px] font-medium tracking-tight select-none border-b border-slate-100 dark:border-transparent">
            {/* Time */}
            <span className="font-semibold text-slate-800 dark:text-slate-200">12:45</span>

            {/* Samsung Infinity-O Camera Punch-Hole */}
            <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 shadow-inner" />

            {/* Status Icons: 5G, WiFi, Battery */}
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">5G</span>
              <Signal className="w-3 h-3 text-slate-600 dark:text-slate-300" />
              <Wifi className="w-3 h-3 text-slate-600 dark:text-slate-300" />
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-mono">92%</span>
                <Battery className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* Inner App Container */}
        <div className="w-full bg-slate-50 dark:bg-slate-950 min-h-screen relative flex flex-col transition-colors">
          {children}
        </div>
      </div>
    </div>
  );
};
