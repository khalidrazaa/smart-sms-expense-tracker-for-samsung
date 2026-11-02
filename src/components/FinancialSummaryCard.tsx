import React from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote, Landmark, MessageSquareText, PlusCircle } from 'lucide-react';
import { FinancialSummary } from '../types';

interface FinancialSummaryCardProps {
  summary: FinancialSummary;
  currency: string;
  onOpenAddModal: () => void;
  onOpenSmsSync: () => void;
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  summary,
  currency,
  onOpenAddModal,
  onOpenSmsSync,
}) => {
  const isNetPositive = summary.netBalance >= 0;

  return (
    <div className="space-y-3">
      {/* Primary Hero Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-slate-800 p-5 shadow-lg shadow-black/20 text-white transition-colors">
        {/* Subtle decorative glow */}
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-sky-500/15 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span className="uppercase tracking-wider text-[11px] font-semibold text-slate-300">
              Total Net Balance
            </span>
            <span className="text-[11px] text-slate-400">
              {summary.transactionCount} records tracked
            </span>
          </div>

          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums">
              {isNetPositive ? '' : '-'}
              {currency}
              {Math.abs(summary.netBalance).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                isNetPositive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {isNetPositive ? 'Surplus' : 'Deficit'}
            </span>
          </div>

          {/* Quick Stats Grid: Total Spent vs Total Earned */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-800">
            {/* Debit / Spending */}
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <span className="w-4 h-4 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <ArrowDownRight className="w-3 h-3" />
                </span>
                <span className="text-[11px]">Total Debited</span>
              </div>
              <div className="text-sm font-bold text-rose-400 font-mono tabular-nums">
                -{currency}
                {summary.totalDebits.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>

            {/* Credit / Earning */}
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <ArrowUpRight className="w-3 h-3" />
                </span>
                <span className="text-[11px]">Total Credited</span>
              </div>
              <div className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
                +{currency}
                {summary.totalCredits.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Secondary Breakdown: Cash vs Bank Balance */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-300 bg-slate-950/70 rounded-lg px-3 py-1.5 border border-slate-850">
            <div className="flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-amber-400" />
              <span>Cash in Hand:</span>
              <span className="font-semibold text-slate-100 font-mono tabular-nums">
                {currency}
                {summary.cashBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div className="flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-sky-400" />
              <span>Bank A/Cs:</span>
              <span className="font-semibold text-slate-100 font-mono tabular-nums">
                {currency}
                {summary.bankBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onOpenSmsSync}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all cursor-pointer min-h-[44px]"
        >
          <MessageSquareText className="w-4 h-4" />
          <span>Read / Sync SMS</span>
        </button>

        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-[0.98] text-slate-800 dark:text-slate-100 text-xs font-semibold border border-slate-200 dark:border-slate-700/80 shadow-sm transition-all cursor-pointer min-h-[44px]"
        >
          <PlusCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span>+ Add Cash Spend</span>
        </button>
      </div>
    </div>
  );
};
