export type TransactionType = 'debit' | 'credit';

export type PaymentMode = 'sms' | 'cash' | 'card' | 'upi' | 'bank_transfer';

export type ExpenseCategory =
  | 'Shopping'
  | 'Food & Dining'
  | 'Groceries'
  | 'Bills & Utilities'
  | 'Transport'
  | 'Entertainment'
  | 'Health & Medical'
  | 'Salary & Income'
  | 'Investment'
  | 'Cash & ATM'
  | 'Other';

export interface Transaction {
  id: string;
  date: string; // ISO string e.g. "2026-11-02T13:45:00"
  vendor: string;
  comment: string;
  amount: number;
  type: TransactionType;
  category: ExpenseCategory;
  paymentMode: PaymentMode;
  accountDetails?: string; // e.g. "HDFC Bank XX4921", "Cash Wallet"
  referenceId?: string; // e.g. UPI Ref, Txn ID
  rawSms?: string; // Original SMS text if parsed from SMS
  createdAt: number;
}

export interface ParsedSms {
  vendor: string;
  amount: number;
  type: TransactionType;
  category: ExpenseCategory;
  accountDetails?: string;
  referenceId?: string;
  date: string;
  comment: string;
  rawSms: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface FinancialSummary {
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  cashBalance: number;
  bankBalance: number;
  transactionCount: number;
  totalCashSpent: number;
  totalBankSpent: number;
}

export interface FilterState {
  type: 'all' | 'debit' | 'credit';
  category: string;
  paymentMode: 'all' | 'sms' | 'cash';
  searchQuery: string;
  dateRange: 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  startDate?: string;
  endDate?: string;
}
