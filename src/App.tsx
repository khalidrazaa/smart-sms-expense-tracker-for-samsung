import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { FinancialSummaryCard } from './components/FinancialSummaryCard';
import { TransactionList } from './components/TransactionList';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { AddManualModal } from './components/AddManualModal';
import { SmsSyncModal } from './components/SmsSyncModal';
import { MobileLaunchModal } from './components/MobileLaunchModal';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { BottomNavigation, ActiveTab } from './components/BottomNavigation';
import { SamsungFrame } from './components/SamsungFrame';
import { useTransactions } from './hooks/useTransactions';
import { Transaction } from './types';

export default function App() {
  const {
    transactions,
    currency,
    setCurrency,
    hapticsEnabled,
    setHapticsEnabled,
    triggerHaptic,
    summary,
    addTransaction,
    addParsedSmsList,
    updateTransaction,
    deleteTransaction,
    resetToSample,
    clearAll,
    exportToCsv,
    exportToJson,
  } = useTransactions();

  const [activeTab, setActiveTab] = useState<ActiveTab>('ledger');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') !== 'light';
  });
  const [isFrameMode, setIsFrameMode] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState<boolean>(false);
  const [isMobileLaunchOpen, setIsMobileLaunchOpen] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Sync dark class on document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleTheme = () => {
    triggerHaptic(15);
    setIsDarkMode((prev) => !prev);
  };

  const handleToggleFrameMode = () => {
    triggerHaptic(15);
    setIsFrameMode((prev) => !prev);
  };

  const handleAddManualTransaction = (txn: Omit<Transaction, 'id' | 'createdAt'>) => {
    addTransaction(txn);
    try {
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#0284c7', '#38bdf8', '#10b981'],
      });
    } catch {
      // ignore
    }
  };

  const handleImportParsedList = (list: any[]) => {
    const added = addParsedSmsList(list);
    if (added > 0) {
      try {
        confetti({
          particleCount: 40,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#0284c7', '#38bdf8', '#6366f1'],
        });
      } catch {
        // ignore
      }
    }
    return added;
  };

  return (
    <SamsungFrame
      isFrameMode={isFrameMode}
      onToggleFrameMode={handleToggleFrameMode}
      onOpenMobileLaunch={() => setIsMobileLaunchOpen(true)}
    >
      {/* Top Application Bar */}
      <Header
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        isFrameMode={isFrameMode}
        onToggleFrameMode={handleToggleFrameMode}
        currency={currency}
        onChangeCurrency={setCurrency}
        onOpenSmsSync={() => {
          triggerHaptic(15);
          setIsSmsModalOpen(true);
        }}
        onOpenMobileLaunch={() => {
          triggerHaptic(15);
          setIsMobileLaunchOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 pb-24 max-w-lg mx-auto w-full space-y-4">
        {/* TAB 1: LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Top Financial Hero Card */}
            <FinancialSummaryCard
              summary={summary}
              currency={currency}
              onOpenAddModal={() => {
                triggerHaptic(20);
                setIsAddModalOpen(true);
              }}
              onOpenSmsSync={() => {
                triggerHaptic(15);
                setIsSmsModalOpen(true);
              }}
            />

            {/* Transaction Ledger List */}
            <TransactionList
              transactions={transactions}
              currency={currency}
              onSelectTransaction={(txn) => {
                triggerHaptic(15);
                setSelectedTransaction(txn);
              }}
              onOpenAddModal={() => {
                triggerHaptic(20);
                setIsAddModalOpen(true);
              }}
            />
          </div>
        )}

        {/* TAB 2: ANALYTICS & INSIGHTS */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-150">
            <AnalyticsView
              transactions={transactions}
              summary={summary}
              currency={currency}
            />
          </div>
        )}

        {/* TAB 3: SMS SYNC & READER */}
        {activeTab === 'sms' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2 transition-colors shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                <span className="text-2xl">💬</span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                SMS Transaction Sync Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Read financial SMS messages from your bank on Samsung A57, simulate incoming debit/credit alerts, or import backups.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsSmsModalOpen(true)}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  Open SMS Reader & Simulator
                </button>
              </div>
            </div>

            {/* Quick overview of latest SMS transactions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Recent SMS Records ({transactions.filter((t) => t.paymentMode === 'sms').length})
                </span>
                <button
                  onClick={() => setIsSmsModalOpen(true)}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
                >
                  Sync New SMS
                </button>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-sm">
                {transactions
                  .filter((t) => t.paymentMode === 'sms')
                  .slice(0, 5)
                  .map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTransaction(t)}
                      className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {t.vendor}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {t.accountDetails || 'Bank A/c'} · {t.comment || 'SMS Alert'}
                        </div>
                      </div>
                      <div
                        className={`font-mono font-bold shrink-0 ${
                          t.type === 'debit' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {t.type === 'debit' ? '-' : '+'}
                        {currency}
                        {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & BACKUP */}
        {activeTab === 'settings' && (
          <div className="animate-in fade-in duration-150">
            <SettingsView
              currency={currency}
              onChangeCurrency={setCurrency}
              hapticsEnabled={hapticsEnabled}
              onToggleHaptics={() => {
                triggerHaptic(20);
                setHapticsEnabled(!hapticsEnabled);
              }}
              onExportCsv={exportToCsv}
              onExportJson={exportToJson}
              onResetSample={resetToSample}
              onClearAll={clearAll}
              onOpenMobileLaunch={() => setIsMobileLaunchOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={(tab) => {
          triggerHaptic(15);
          setActiveTab(tab);
        }}
        onOpenAddModal={() => {
          triggerHaptic(20);
          setIsAddModalOpen(true);
        }}
      />

      {/* Modals & Sheets */}
      <AddManualModal
        isOpen={isAddModalOpen}
        currency={currency}
        onClose={() => setIsAddModalOpen(false)}
        onAddTransaction={handleAddManualTransaction}
      />

      <SmsSyncModal
        isOpen={isSmsModalOpen}
        currency={currency}
        onClose={() => setIsSmsModalOpen(false)}
        onImportParsedList={handleImportParsedList}
      />

      <MobileLaunchModal
        isOpen={isMobileLaunchOpen}
        onClose={() => setIsMobileLaunchOpen(false)}
      />

      <TransactionDetailModal
        transaction={selectedTransaction}
        currency={currency}
        onClose={() => setSelectedTransaction(null)}
        onUpdate={updateTransaction}
        onDelete={deleteTransaction}
      />
    </SamsungFrame>
  );
}
