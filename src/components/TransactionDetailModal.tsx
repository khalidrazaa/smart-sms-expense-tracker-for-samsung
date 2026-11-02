import React, { useState } from 'react';
import {
  X,
  Trash2,
  Edit2,
  Check,
  Copy,
  CheckCheck,
  Calendar,
  Tag,
  CreditCard,
  Hash,
  MessageSquare,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { ExpenseCategory, Transaction } from '../types';
import { getCategoryIcon } from './TransactionList';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  currency: string;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: ExpenseCategory[] = [
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

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  currency,
  onClose,
  onUpdate,
  onDelete,
}) => {
  if (!transaction) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [vendor, setVendor] = useState(transaction.vendor);
  const [comment, setComment] = useState(transaction.comment || '');
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [category, setCategory] = useState<ExpenseCategory>(transaction.category);
  const [copiedSms, setCopiedSms] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isDebit = transaction.type === 'debit';

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onUpdate(transaction.id, {
      vendor: vendor.trim() || transaction.vendor,
      comment: comment.trim(),
      amount: parsedAmount,
      category,
    });
    setIsEditing(false);
  };

  const handleCopySms = () => {
    if (transaction.rawSms) {
      navigator.clipboard.writeText(transaction.rawSms);
      setCopiedSms(true);
      setTimeout(() => setCopiedSms(false), 2000);
    }
  };

  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar pb-6">
        {/* Grab Handle for Mobile bottom sheet */}
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isDebit
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              {isDebit ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
              {isDebit ? 'Debited / Spent' : 'Credited / Inflow'}
            </span>
            <span className="text-xs text-slate-400">
              {transaction.paymentMode === 'cash' ? 'Cash' : 'Bank SMS'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Header Display: Amount & Vendor */}
          {!isEditing ? (
            <div className="text-center py-2">
              <div
                className={`text-3xl font-extrabold font-mono tabular-nums ${
                  isDebit ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {isDebit ? '-' : '+'}
                {currency}
                {transaction.amount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <h3 className="text-lg font-bold text-slate-100 mt-1">
                {transaction.vendor}
              </h3>
              {transaction.comment ? (
                <p className="text-xs text-slate-300 mt-1 bg-slate-800/60 rounded-lg px-3 py-1.5 inline-block max-w-sm">
                  "{transaction.comment}"
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic mt-1">No comment added yet</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 bg-slate-850 p-4 rounded-xl border border-slate-750">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Edit Record
              </h4>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Comment / Note</label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Lunch with team, office supplies"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Detailed Metadata Grid */}
          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date & Time
              </span>
              <span className="text-slate-200 font-medium">{formattedDate}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Category
              </span>
              <span className="text-slate-200 font-medium flex items-center gap-1.5">
                {getCategoryIcon(transaction.category)}
                {transaction.category}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                {transaction.paymentMode === 'cash' ? (
                  <Wallet className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                )}
                Payment Source
              </span>
              <span className="text-slate-200 font-medium">
                {transaction.accountDetails || (transaction.paymentMode === 'cash' ? 'Cash Wallet' : 'Bank SMS')}
              </span>
            </div>

            {transaction.referenceId && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  Reference ID
                </span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {transaction.referenceId}
                </span>
              </div>
            )}
          </div>

          {/* Original SMS Snippet (if available) */}
          {transaction.rawSms && (
            <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Original Bank SMS Message
                </span>
                <button
                  onClick={handleCopySms}
                  className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800/70 px-2 py-0.5 rounded"
                >
                  {copiedSms ? (
                    <>
                      <CheckCheck className="w-3 h-3 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy SMS
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-300 font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 leading-relaxed whitespace-pre-wrap">
                {transaction.rawSms}
              </p>
            </div>
          )}

          {/* Action Row: Edit & Delete */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 min-h-[44px]"
              >
                <Edit2 className="w-3.5 h-3.5 text-sky-400" />
                Edit Record
              </button>
            )}

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onDelete(transaction.id);
                    onClose();
                  }}
                  className="py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2 px-2.5 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
