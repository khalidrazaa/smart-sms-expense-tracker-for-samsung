import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else {
      setShowGuide(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/40">
        <Check className="w-4 h-4 shrink-0" />
        <span>Installed on Samsung Galaxy as Standalone PWA</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstall}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 active:scale-[0.98] transition-all min-h-[44px] cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>Install App on Samsung Galaxy</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-sky-400">
              <Smartphone className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">
                Install on Samsung Galaxy
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              To add SpendTracker directly to your Samsung phone home screen:
            </p>
            <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside bg-slate-950 p-3 rounded-xl border border-slate-850">
              <li>Tap the browser menu <strong>(⋮ or ≡)</strong> in Chrome or Samsung Internet.</li>
              <li>Select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
              <li>Tap <strong>"Install"</strong> to place the icon next to your SMS app!</li>
            </ol>
            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
