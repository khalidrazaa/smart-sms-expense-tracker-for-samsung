import React, { useState } from 'react';
import {
  X,
  Wallet,
  Check,
  Tag,
  Calendar,
  Building,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { ExpenseCategory, PaymentMode, Transaction, TransactionType } from '../types';

interface AddManualModalProps {
  isOpen: boolean;
  currency: string;
  onClose: () => void;
  onAddTransaction: (txn: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

const CATEGORIES: { label: ExpenseCategory; icon: string }[] = [
  { label: 'Food & Dining', icon: '🍽️' },
  { label: 'Groceries', icon: '🛒' },
  { label: 'Transport', icon: '🚖' },
  { label: 'Shopping', icon: '🛍️' },
  { label: 'Bills & Utilities', icon: '⚡' },
  { label: 'Entertainment', icon: '🎬' },
  { label: 'Health & Medical', icon: '💊' },
  { label: 'Cash & ATM', icon: '💵' },
  { label: 'Salary & Income', icon: '💼' },
  { label: 'Investment', icon: '📈' },
  { label: 'Other', icon: '📦' },
];

const COMMON_CASH_VENDORS = [
  'Local Grocery Kirana',
  'Fresh Veggies & Fruits',
  'Tea & Chai Stall',
  'Auto / Taxi Commute',
  'Bakery & Dairy',
  'Pharmacy / Meds',
  'Street Food Snack',
  'Tips & Gratuity',
];

export const AddManualModal: React.FC<AddManualModalProps> = ({
  isOpen,
  currency,
  onClose,
  onAddTransaction,
}) => {
  if (!isOpen) return null;

  const [type, setType] = useState<TransactionType>('debit');
  const [amount, setAmount] = useState<string>('');
  const [vendor, setVendor] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining');
  const [comment, setComment] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [accountDetails, setAccountDetails] = useState<string>('Cash in Hand');
  const [date, setDate] = useState<string>(() => {
    // Current local ISO date string formatted for datetime-local input
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + val).toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const finalVendor = vendor.trim() || (type === 'debit' ? 'Cash Expense' : 'Cash Income');

    onAddTransaction({
      amount: numAmount,
      type,
      vendor: finalVendor,
      category,
      comment: comment.trim(),
      paymentMode,
      accountDetails: paymentMode === 'cash' ? 'Cash in Hand' : accountDetails,
      date: new Date(date).toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Add Manual Cash Record
              </h3>
              <p className="text-[11px] text-slate-400">
                Log cash spendings or cash in hand earnings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Transaction Type Segment: Debit (Spending) vs Credit (Earning) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('debit')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'debit'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Spending (Debit -)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('credit');
                setCategory('Salary & Income');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                type === 'credit'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Earning (Credit +)</span>
            </button>
          </div>

          {/* Amount Input with Large Display & Quick Increment Buttons */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Amount ({currency}) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 font-mono">
                {currency}
              </span>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-3 text-2xl font-bold font-mono tabular-nums text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Quick Amount Add Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5">
              {[20, 50, 100, 200, 500, 1000].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAddQuickAmount(chip)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700/60 shrink-0 font-mono"
                >
                  +{currency}{chip}
                </button>
              ))}
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Vendor / Payee Input */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Vendor / Payee / Place
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={type === 'debit' ? 'e.g. Local Grocery, Auto Driver' : 'e.g. Freelance Cash, Loan Repaid'}
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Quick common vendors */}
            <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar py-0.5">
              {COMMON_CASH_VENDORS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVendor(v)}
                  className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-[10px] shrink-0 border border-slate-750"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Category Selector Grid */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto no-scrollbar p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => setCategory(cat.label)}
                  className={`p-2 rounded-lg text-left text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                    category === cat.label
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment / Note Input */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Comment / Note (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="What was this spending or earning for?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Payment Method & Date row */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Payment Source
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="cash">💵 Cash in Hand</option>
                <option value="upi">📱 UPI</option>
                <option value="card">💳 Debit/Credit Card</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-600/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                Save {type === 'debit' ? 'Cash Spending' : 'Cash Earning'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
