import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  Download,
  PackageCheck,
  ShieldCheck,
  Globe,
} from 'lucide-react';

interface MobileLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileLaunchModal: React.FC<MobileLaunchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'instant' | 'apk'>('instant');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Active working URL (Development URL)
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ais-dev-n4ynr4wvoccxpsfowivsv3-978136659349.asia-east1.run.app';

  const pwaBuilderUrl = `https://www.pwabuilder.com?url=${encodeURIComponent(appUrl)}`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(appUrl, {
      width: 240,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate QR Code', err));
  }, [isOpen, appUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Installation on Samsung Galaxy A57
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Already hosted for you — zero server setup required
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cloud Hosting Clarification Banner */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
          <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">No Server Hosting Needed!</span>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed mt-0.5">
              The app is <strong>already hosted 24/7 on Google Cloud</strong> for you. All your transactions and SMS messages stay 100% private in your phone's local storage.
            </p>
          </div>
        </div>

        {/* Mode Selector Segment */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('instant')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'instant'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Option 1: 1-Tap Home Screen (PWA)</span>
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'apk'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Option 2: Android .APK Package</span>
          </button>
        </div>

        {/* TAB 1: INSTANT INSTALL (PWA) */}
        {activeTab === 'instant' && (
          <div className="space-y-3.5 animate-in fade-in">
            <div className="text-center space-y-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Scan with your Samsung A57 <strong>Camera</strong> to open immediately:
              </p>

              <div className="inline-block p-3 rounded-2xl bg-white border border-slate-200 shadow-sm mx-auto">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="Scan to open on Samsung Galaxy A57"
                    className="w-44 h-44 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                    Generating QR...
                  </div>
                )}
              </div>
            </div>

            {/* Direct Link */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Direct URL:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* How it runs without an APK file */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-500" />
                Why this is better than a manual .APK:
              </div>
              <ul className="text-[11px] space-y-1 list-disc list-inside text-slate-500 dark:text-slate-400">
                <li>No security warnings about "Unknown Sources".</li>
                <li>Installs directly onto your phone home screen with app icon.</li>
                <li>Runs full-screen with zero browser address bars.</li>
                <li>Works completely offline even without internet connectivity.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: ANDROID .APK GENERATOR */}
        {activeTab === 'apk' && (
          <div className="space-y-3.5 animate-in fade-in text-xs text-slate-700 dark:text-slate-300">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-sky-500" />
                How to Generate an Android .APK File:
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Because this app is fully PWA compliant (Web App Manifest, standalone orientation, and service worker), Google & Microsoft officially allow you to package it into an Android <strong>.apk</strong> or Google Play Store <strong>.aab</strong> in 1 click using <strong>PWABuilder</strong>.
              </p>
            </div>

            <ol className="space-y-2 list-decimal list-inside bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
              <li>
                Click the button below to open <strong>PWABuilder</strong> (Google's official PWA to APK packaging tool).
              </li>
              <li>
                Your app URL is automatically pre-filled. Tap <strong>"Package for Android"</strong>.
              </li>
              <li>
                Tap <strong>"Download APK"</strong>.
              </li>
              <li>
                Transfer or download the <strong>.apk</strong> file onto your Samsung Galaxy A57 and tap to install!
              </li>
            </ol>

            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 active:scale-98 transition-all"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Generate .APK on PWABuilder (1-Click)</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl"
        >
          Close
        </button>
      </div>
    </div>
  );
};
