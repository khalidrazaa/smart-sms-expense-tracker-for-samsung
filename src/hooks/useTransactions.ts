import { useEffect, useMemo, useState } from 'react';
import { INITIAL_TRANSACTIONS } from '../data/mockData';
import { parseBulkSms, parseSingleSms } from '../services/smsParser';
import { FilterState, FinancialSummary, ParsedSms, Transaction } from '../types';

const STORAGE_KEY = 'samsung_sms_spendtracker_v1';
const CURRENCY_KEY = 'samsung_sms_tracker_currency';
const HAPTICS_KEY = 'samsung_sms_tracker_haptics';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_TRANSACTIONS;
  });

  const [currency, setCurrency] = useState<string>(() => {
    return localStorage.getItem(CURRENCY_KEY) || '₹';
  });

  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => {
    const val = localStorage.getItem(HAPTICS_KEY);
    return val !== null ? val === 'true' : true;
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to save transactions to localStorage', e);
    }
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(CURRENCY_KEY, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(HAPTICS_KEY, String(hapticsEnabled));
  }, [hapticsEnabled]);

  // Haptic feedback trigger for Samsung / Android devices
  const triggerHaptic = (pattern: number | number[] = 15) => {
    if (hapticsEnabled && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

  // Add single transaction
  const addTransaction = (txn: Omit<Transaction, 'id' | 'createdAt'>) => {
    triggerHaptic(20);
    const newTxn: Transaction = {
      ...txn,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
    };
    setTransactions((prev) => [newTxn, ...prev]);
    return newTxn;
  };

  // Add multiple parsed SMS transactions with deduplication
  const addParsedSmsList = (parsedList: ParsedSms[]) => {
    triggerHaptic([20, 40, 20]);
    let addedCount = 0;

    setTransactions((prev) => {
      const existingRefIds = new Set(
        prev.map((t) => t.referenceId).filter(Boolean)
      );
      const existingHashes = new Set(
        prev.map((t) => `${t.vendor.toLowerCase()}_${t.amount}_${t.date.split('T')[0]}`)
      );

      const toAdd: Transaction[] = [];

      for (const p of parsedList) {
        // Deduplication check
        if (p.referenceId && existingRefIds.has(p.referenceId)) {
          continue;
        }

        const hash = `${p.vendor.toLowerCase()}_${p.amount}_${p.date.split('T')[0]}`;
        if (existingHashes.has(hash)) {
          continue;
        }

        toAdd.push({
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          date: p.date,
          vendor: p.vendor,
          comment: p.comment,
          amount: p.amount,
          type: p.type,
          category: p.category,
          paymentMode: 'sms',
          accountDetails: p.accountDetails,
          referenceId: p.referenceId,
          rawSms: p.rawSms,
          createdAt: Date.now(),
        });
        addedCount++;
      }

      return [...toAdd, ...prev];
    });

    return addedCount;
  };

  // Update existing transaction
  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    triggerHaptic(15);
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Delete transaction
  const deleteTransaction = (id: string) => {
    triggerHaptic(30);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Reset to initial sample data
  const resetToSample = () => {
    triggerHaptic(40);
    setTransactions(INITIAL_TRANSACTIONS);
  };

  // Clear all records
  const clearAll = () => {
    triggerHaptic([30, 60, 30]);
    setTransactions([]);
  };

  // Financial Calculations
  const summary: FinancialSummary = useMemo(() => {
    let totalDebits = 0;
    let totalCredits = 0;
    let cashDebits = 0;
    let cashCredits = 0;
    let bankDebits = 0;
    let bankCredits = 0;

    for (const t of transactions) {
      if (t.type === 'debit') {
        totalDebits += t.amount;
        if (t.paymentMode === 'cash') {
          cashDebits += t.amount;
        } else {
          bankDebits += t.amount;
        }
      } else {
        totalCredits += t.amount;
        if (t.paymentMode === 'cash') {
          cashCredits += t.amount;
        } else {
          bankCredits += t.amount;
        }
      }
    }

    return {
      totalDebits,
      totalCredits,
      netBalance: totalCredits - totalDebits,
      cashBalance: cashCredits - cashDebits,
      bankBalance: bankCredits - bankDebits,
      transactionCount: transactions.length,
      totalCashSpent: cashDebits,
      totalBankSpent: bankDebits,
    };
  }, [transactions]);

  // Export to CSV
  const exportToCsv = () => {
    triggerHaptic(25);
    const headers = [
      'Date',
      'Type',
      'Vendor',
      'Category',
      'Amount',
      'Payment Mode',
      'Account',
      'Reference ID',
      'Comment',
      'Original SMS',
    ];

    const rows = transactions.map((t) => [
      `"${t.date}"`,
      `"${t.type.toUpperCase()}"`,
      `"${(t.vendor || '').replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.amount.toFixed(2),
      `"${t.paymentMode}"`,
      `"${(t.accountDetails || '').replace(/"/g, '""')}"`,
      `"${(t.referenceId || '').replace(/"/g, '""')}"`,
      `"${(t.comment || '').replace(/"/g, '""')}"`,
      `"${(t.rawSms || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `samsung_spendtracker_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export to JSON
  const exportToJson = () => {
    triggerHaptic(25);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const link = document.createElement('a');
    link.href = dataStr;
    link.download = `samsung_spendtracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  return {
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
    parseSingleSms,
    parseBulkSms,
  };
}
