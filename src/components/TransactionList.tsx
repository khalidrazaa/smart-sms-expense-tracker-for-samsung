import React, { useState, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  ShoppingBag,
  Utensils,
  ShoppingCart,
  Receipt,
  Car,
  Film,
  HeartPulse,
  Briefcase,
  Banknote,
  TrendingUp,
  HelpCircle,
  MessageSquare,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { ExpenseCategory, Transaction } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  currency: string;
  onSelectTransaction: (txn: Transaction) => void;
  onOpenAddModal: () => void;
}

export function getCategoryIcon(category: ExpenseCategory) {
  switch (category) {
    case 'Food & Dining':
      return <Utensils className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
    case 'Groceries':
      return <ShoppingCart className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />;
    case 'Shopping':
      return <ShoppingBag className="w-4 h-4 text-pink-500 dark:text-pink-400" />;
    case 'Bills & Utilities':
      return <Receipt className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
    case 'Transport':
      return <Car className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />;
    case 'Entertainment':
      return <Film className="w-4 h-4 text-purple-500 dark:text-purple-400" />;
    case 'Health & Medical':
      return <HeartPulse className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
    case 'Salary & Income':
      return <Briefcase className="w-4 h-4 text-teal-500 dark:text-teal-400" />;
    case 'Cash & ATM':
      return <Banknote className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
    case 'Investment':
      return <TrendingUp className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
    default:
      return <HelpCircle className="w-4 h-4 text-slate-400" />;
  }
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  currency,
  onSelectTransaction,
  onOpenAddModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');
  const [activeModeFilter, setActiveModeFilter] = useState<'all' | 'cash' | 'sms'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (activeTypeFilter !== 'all' && t.type !== activeTypeFilter) {
        return false;
      }
      // Payment mode filter
      if (activeModeFilter === 'cash' && t.paymentMode !== 'cash') {
        return false;
      }
      if (activeModeFilter === 'sms' && t.paymentMode === 'cash') {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) {
        return false;
      }
      // Search query (vendor, comment, account, refId)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const vendor = t.vendor.toLowerCase();
        const comment = (t.comment || '').toLowerCase();
        const account = (t.accountDetails || '').toLowerCase();
        const refId = (t.referenceId || '').toLowerCase();
        const amountStr = t.amount.toString();

        return (
          vendor.includes(query) ||
          comment.includes(query) ||
          account.includes(query) ||
          refId.includes(query) ||
          amountStr.includes(query)
        );
      }
      return true;
    });
  }, [transactions, activeTypeFilter, activeModeFilter, selectedCategory, searchQuery]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    for (const txn of filteredTransactions) {
      const txnDateStr = txn.date.slice(0, 10);
      let groupKey = '';

      if (txnDateStr === todayStr) {
        groupKey = 'Today';
      } else if (txnDateStr === yesterdayStr) {
        groupKey = 'Yesterday';
      } else {
        const d = new Date(txn.date);
        groupKey = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(txn);
    }

    return groups;
  }, [filteredTransactions]);

  const categories: ExpenseCategory[] = [
    'Shopping',
    'Food & Dining',
    'Groceries',
    'Bills & Utilities',
    'Transport',
    'Entertainment',
    'Health & Medical',
    'Salary & Income',
    'Investment',
    'Cash & ATM',
    'Other',
  ];

  return (
    <div className="space-y-3">
      {/* Search Bar & Filter Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor, comment, amount..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[24px] min-w-[24px] flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center p-2 rounded-xl border min-h-[38px] min-w-[38px] transition-colors ${
            showFilters || selectedCategory !== 'all' || activeModeFilter !== 'all'
              ? 'bg-sky-50 dark:bg-sky-600/20 border-sky-300 dark:border-sky-500/50 text-sky-600 dark:text-sky-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          title="Filter options"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Type Filter Segmented Control */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800/80">
        <button
          onClick={() => setActiveTypeFilter('all')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[34px] ${
            activeTypeFilter === 'all'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          All Records
        </button>
        <button
          onClick={() => setActiveTypeFilter('debit')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[34px] flex items-center justify-center gap-1 ${
            activeTypeFilter === 'debit'
              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>Spent</span>
        </button>
        <button
          onClick={() => setActiveTypeFilter('credit')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors min-h-[34px] flex items-center justify-center gap-1 ${
            activeTypeFilter === 'credit'
              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Earned</span>
        </button>
      </div>

      {/* Expandable Secondary Filter Bar */}
      {showFilters && (
        <div className="p-3 bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Payment Source
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveModeFilter('all')}
                className={`px-2 py-1 text-[11px] rounded-md font-medium ${
                  activeModeFilter === 'all'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveModeFilter('cash')}
                className={`px-2 py-1 text-[11px] rounded-md font-medium flex items-center gap-1 ${
                  activeModeFilter === 'cash'
                    ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
                }`}
              >
                <Wallet className="w-3 h-3" />
                Cash
              </button>
              <button
                onClick={() => setActiveModeFilter('sms')}
                className={`px-2 py-1 text-[11px] rounded-md font-medium flex items-center gap-1 ${
                  activeModeFilter === 'sms'
                    ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800/50'
                    : 'text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                Bank SMS
              </button>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Category
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-xs text-slate-900 dark:text-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {(selectedCategory !== 'all' || activeModeFilter !== 'all' || activeTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setActiveTypeFilter('all');
                setActiveModeFilter('all');
                setSelectedCategory('all');
              }}
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium pt-1"
            >
              Reset all filters
            </button>
          )}
        </div>
      )}

      {/* Grouped Transaction List */}
      {Object.keys(groupedTransactions).length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300">
            No transactions match your search
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Try adjusting your search query or filters, or add a new cash expense or sync SMS.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={onOpenAddModal}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
            >
              + Add Cash Spend
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTransactions).map(([dateLabel, items]) => {
            const dayDebit = items
              .filter((i) => i.type === 'debit')
              .reduce((sum, i) => sum + i.amount, 0);
            const dayCredit = items
              .filter((i) => i.type === 'credit')
              .reduce((sum, i) => sum + i.amount, 0);

            return (
              <div key={dateLabel} className="space-y-1.5">
                {/* Date Section Header */}
                <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{dateLabel}</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    {dayDebit > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                        -{currency}
                        {dayDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    {dayCredit > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                        +{currency}
                        {dayCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rows Container */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden shadow-sm">
                  {items.map((txn) => {
                    const isDebit = txn.type === 'debit';
                    const timeFormatted = new Date(txn.date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });

                    return (
                      <div
                        key={txn.id}
                        onClick={() => onSelectTransaction(txn)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-850/60 active:bg-slate-100 dark:active:bg-slate-800/80 transition-colors cursor-pointer flex items-center justify-between gap-3 min-h-[58px]"
                      >
                        {/* Left: Category Icon + Vendor + Comment + Date */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center shrink-0">
                            {getCategoryIcon(txn.category)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {txn.vendor}
                              </h4>
                              {txn.paymentMode === 'cash' ? (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0 flex items-center gap-0.5">
                                  <Wallet className="w-2.5 h-2.5" />
                                  Cash
                                </span>
                              ) : (
                                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium shrink-0 flex items-center gap-0.5">
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  SMS
                                </span>
                              )}
                            </div>

                            {/* Comment / Note */}
                            {txn.comment ? (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                {txn.comment}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                                No comment added
                              </p>
                            )}

                            {/* Metadata Line */}
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              <span>{txn.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>{timeFormatted}</span>
                              {txn.accountDetails && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="truncate">{txn.accountDetails}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount Display */}
                        <div className="text-right shrink-0">
                          <div
                            className={`text-sm font-bold font-mono tabular-nums ${
                              isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isDebit ? '-' : '+'}
                            {currency}
                            {txn.amount.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                            {isDebit ? 'Debited' : 'Credited'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
