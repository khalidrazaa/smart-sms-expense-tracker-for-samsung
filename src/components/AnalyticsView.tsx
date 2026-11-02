import React, { useMemo } from 'react';
import {
  PieChart,
  Banknote,
  Landmark,
  Award,
} from 'lucide-react';
import { ExpenseCategory, FinancialSummary, Transaction } from '../types';
import { getCategoryIcon } from './TransactionList';

interface AnalyticsViewProps {
  transactions: Transaction[];
  summary: FinancialSummary;
  currency: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  summary,
  currency,
}) => {
  // Category breakdown for debits
  const categoryStats = useMemo(() => {
    const map: { [key in ExpenseCategory]?: number } = {};
    let totalDebit = 0;

    for (const t of transactions) {
      if (t.type === 'debit') {
        map[t.category] = (map[t.category] || 0) + t.amount;
        totalDebit += t.amount;
      }
    }

    const items = Object.entries(map).map(([cat, amount]) => ({
      category: cat as ExpenseCategory,
      amount: amount as number,
      percentage: totalDebit > 0 ? ((amount as number) / totalDebit) * 100 : 0,
    }));

    items.sort((a, b) => b.amount - a.amount);
    return { items, totalDebit };
  }, [transactions]);

  // Top spending vendors
  const topVendors = useMemo(() => {
    const map: { [key: string]: { amount: number; count: number } } = {};

    for (const t of transactions) {
      if (t.type === 'debit') {
        const v = t.vendor.trim();
        if (!map[v]) {
          map[v] = { amount: 0, count: 0 };
        }
        map[v].amount += t.amount;
        map[v].count += 1;
      }
    }

    return Object.entries(map)
      .map(([vendor, data]) => ({ vendor, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  const savingsRate =
    summary.totalCredits > 0
      ? Math.max(
          0,
          Math.round(
            ((summary.totalCredits - summary.totalDebits) / summary.totalCredits) * 100
          )
        )
      : 0;

  return (
    <div className="space-y-4">
      {/* Overview Metric Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 transition-colors shadow-sm">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Financial Health
          </span>
          <span className="text-sky-600 dark:text-sky-400 font-bold">
            {savingsRate}% Net Savings Rate
          </span>
        </div>

        {/* Visual Progress Bar: Debits vs Credits */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              style={{
                width: `${
                  summary.totalCredits + summary.totalDebits > 0
                    ? (summary.totalDebits /
                        (summary.totalCredits + summary.totalDebits)) *
                      100
                    : 50
                }%`,
              }}
              className="bg-rose-500 h-full transition-all duration-500"
              title="Spendings"
            />
            <div
              style={{
                width: `${
                  summary.totalCredits + summary.totalDebits > 0
                    ? (summary.totalCredits /
                        (summary.totalCredits + summary.totalDebits)) *
                      100
                    : 50
                }%`,
              }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title="Earnings"
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Spent: {currency}{summary.totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Earned: {currency}{summary.totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Cash vs Bank Spending Split */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 transition-colors shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <Banknote className="w-4 h-4" />
            <span>Cash Spending</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {currency}
            {summary.totalCashSpent.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-[10px] text-slate-500">
            Manual cash records
          </p>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 transition-colors shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-medium">
            <Landmark className="w-4 h-4" />
            <span>Bank SMS Spending</span>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
            {currency}
            {summary.totalBankSpent.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-[10px] text-slate-500">
            Auto-parsed from SMS
          </p>
        </div>
      </div>

      {/* Spending by Category Breakdown */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <PieChart className="w-4 h-4 text-sky-500 dark:text-sky-400" />
          Spending by Category
        </h3>

        {categoryStats.items.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            No debit expenses recorded yet.
          </p>
        ) : (
          <div className="space-y-3">
            {categoryStats.items.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      {getCategoryIcon(item.category)}
                    </span>
                    {item.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {currency}
                      {item.amount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono w-9 text-right">
                      {item.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.percentage}%` }}
                    className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Merchants */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 transition-colors shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          Top Spending Merchants
        </h3>

        {topVendors.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            No merchant data available yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {topVendors.map((v, i) => (
              <div
                key={v.vendor}
                className="py-2.5 flex items-center justify-between gap-2 text-xs first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {v.vendor}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {v.count} transaction{v.count > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  -{currency}
                  {v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
