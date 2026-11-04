import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  RefreshCw,
  Mail,
  Plus,
  Calendar,
  Wallet,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  ReceiptText,
  PieChart,
  MessageSquare,
  Settings,
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  Smartphone,
  Award,
  Bell,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  SlidersHorizontal,
  ShieldAlert,
  Filter,
  Sparkles,
  Play,
  RotateCcw,
} from 'lucide-react';

export interface SmsFilterSettings {
  mode: 'strict' | 'custom';
  filterOtp: boolean;
  filterBillDues: boolean;
  filterPromos: boolean;
  filterBalanceInquiry: boolean;
  requireActionVerb: boolean;
  requireAccountAnchor: boolean;
  customExclusions: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason: string;
  amount?: number;
  type?: 'DEBIT' | 'CREDIT';
  vendor?: string;
  category?: string;
  account?: string;
  referenceId?: string;
  matchedRule?: string;
}

const DEFAULT_SMS_CONFIG: SmsFilterSettings = {
  mode: 'strict',
  filterOtp: true,
  filterBillDues: true,
  filterPromos: true,
  filterBalanceInquiry: true,
  requireActionVerb: true,
  requireAccountAnchor: false,
  customExclusions: 'loan, pre-approved, scratch card, reward points, plan expires',
};

const OTP_TRIGGERS = [
  'otp', 'one time password', 'verification code', 'secret code', 'security code',
  'do not share', 'never share', 'valid for', 'is your code', 'authorization code'
];

const BILL_DUE_TRIGGERS = [
  'bill due', 'bill of rs', 'payment due', 'due date', 'pay before',
  'generated on', 'minimum amount due', 'total due', 'bill generated',
  'to avoid late fee', 'pay your bill', 'recharge your'
];

const PROMO_TRIGGERS = [
  'pre-approved', 'avail loan', 'get personal loan', 'instant loan',
  'apply now', 'click here', 'congratulations', 'win up to', 'reward points',
  'claim your', 'scratch card', 'special offer', 'discount of', 'credited 50 points',
  'credit limit increased to', 'loan offer'
];

const DEBIT_ACTION_VERBS = [
  'debited', 'spent', 'paid to', 'paid at', 'withdrawn', 'transfer to', 'transferred to',
  'vpa debited', 'sent to', 'purchased', 'payment of', 'purchase of'
];

const CREDIT_ACTION_VERBS = [
  'credited', 'credited to', 'deposited', 'received from', 'salary', 'refund of',
  'cashback credited', 'reversal of'
];

function validateSmsMessage(text: string, config: SmsFilterSettings): ValidationResult {
  if (!text || text.trim().length < 12) {
    return { isValid: false, reason: 'Message too short to be a valid bank transaction.' };
  }

  const lower = text.toLowerCase();

  // 1. Check OTP Filter
  if (config.filterOtp) {
    const matched = OTP_TRIGGERS.find((t) => lower.includes(t));
    if (matched) {
      return {
        isValid: false,
        reason: `Filtered: Authentication/OTP keyword detected ("${matched}"). False expense prevented.`,
        matchedRule: 'Anti-OTP Filter',
      };
    }
  }

  // 2. Check Bill Due Reminder Filter
  if (config.filterBillDues) {
    const matched = BILL_DUE_TRIGGERS.find((t) => lower.includes(t));
    const hasExplicitDebit = DEBIT_ACTION_VERBS.some((v) => lower.includes(v));
    if (matched && !hasExplicitDebit) {
      return {
        isValid: false,
        reason: `Filtered: Unpaid bill reminder or payment due notice ("${matched}"). Not a debit confirmation.`,
        matchedRule: 'Bill Due Filter',
      };
    }
  }

  // 3. Check Promotional & Loan Offers Filter
  if (config.filterPromos) {
    const matched = PROMO_TRIGGERS.find((t) => lower.includes(t));
    if (matched) {
      return {
        isValid: false,
        reason: `Filtered: Promotional loan or card offer ("${matched}"). False expense prevented.`,
        matchedRule: 'Promo & Loan Filter',
      };
    }
  }

  // 4. Custom Exclusions
  if (config.customExclusions.trim()) {
    const exclusions = config.customExclusions
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const matchedCustom = exclusions.find((exc) => lower.includes(exc));
    if (matchedCustom) {
      return {
        isValid: false,
        reason: `Filtered: Matched custom exclusion keyword ("${matchedCustom}").`,
        matchedRule: 'Custom Exclusion',
      };
    }
  }

  // 5. Amount Extraction
  const amountMatch =
    text.match(/(?:INR|Rs\.?|₹|\$)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    text.match(
      /(?:debited|credited|spent|paid|withdrawn|refund of|received)\s*(?:by|for|of|with)?\s*(?:INR|Rs\.?|₹|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i
    ) ||
    text.match(/([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)/i);

  if (!amountMatch) {
    return { isValid: false, reason: 'Filtered: No valid monetary currency amount detected.' };
  }

  const amt = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amt) || amt <= 0) {
    return { isValid: false, reason: 'Filtered: Invalid parsed numerical amount.' };
  }

  // 6. Action Verb Detection
  const hasDebit = DEBIT_ACTION_VERBS.some((v) => lower.includes(v));
  const hasCredit = CREDIT_ACTION_VERBS.some((v) => lower.includes(v));

  if (config.requireActionVerb && !hasDebit && !hasCredit) {
    if (config.filterBalanceInquiry && (lower.includes('bal') || lower.includes('balance'))) {
      return {
        isValid: false,
        reason: 'Filtered: Standalone balance inquiry without debit/credit action. False expense prevented.',
        matchedRule: 'Balance Alert Filter',
      };
    }
    return {
      isValid: false,
      reason: 'Filtered: Missing confirmed bank action verb (e.g. debited, paid, spent, credited).',
      matchedRule: 'Action Verb Required',
    };
  }

  // 7. Account / Card / UPI Anchor
  const accountMatch = text.match(/(?:A\/c|Acct|Account|Card)\s*(?:no\.?)?\s*([xX*]*\d{3,4})/i);
  const upiRefMatch = text.match(/(?:UPI\s*Ref|Ref|Txn\s*Id)(?:\s*no\.?)?\s*:?\s*([A-Za-z0-9]{6,16})/i);
  const account = accountMatch ? `A/c XX${accountMatch[1].replace(/^[xX*]+/, '')}` : undefined;
  const referenceId = upiRefMatch ? upiRefMatch[1] : undefined;

  if (config.requireAccountAnchor && !account && !referenceId) {
    return {
      isValid: false,
      reason: 'Filtered: Strict mode requires a bank account (A/c), Card, or UPI Ref anchor.',
      matchedRule: 'Account Anchor Required',
    };
  }

  // 8. Classify Debit vs Credit
  const type: 'DEBIT' | 'CREDIT' = hasCredit && !hasDebit ? 'CREDIT' : 'DEBIT';

  // Vendor extraction
  let vendor = type === 'CREDIT' ? 'Bank Deposit' : 'Bank Merchant';
  if (lower.includes('swiggy')) vendor = 'Swiggy';
  else if (lower.includes('zomato')) vendor = 'Zomato';
  else if (lower.includes('amazon')) vendor = 'Amazon India';
  else if (lower.includes('flipkart')) vendor = 'Flipkart';
  else if (lower.includes('uber')) vendor = 'Uber Rides';
  else if (lower.includes('dmart')) vendor = 'DMart Supermarket';
  else if (lower.includes('bescom') || lower.includes('electricity')) vendor = 'Electricity BESCOM';
  else if (lower.includes('atm')) vendor = 'ATM Cash Withdrawal';
  else if (lower.includes('salary')) vendor = 'TechCorp (Salary)';
  else {
    const toMatch = text.match(
      /(?:paid to|transfer to|transferred to|sent to|at|vdr)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))/i
    );
    if (toMatch && toMatch[1].trim().length > 1) {
      vendor = toMatch[1].trim();
    }
  }

  // Category
  let category = 'Other';
  const vLower = vendor.toLowerCase();
  if (type === 'CREDIT') category = 'Salary & Income';
  else if (vLower.includes('swiggy') || vLower.includes('zomato') || vLower.includes('food') || vLower.includes('cafe'))
    category = 'Food & Dining';
  else if (vLower.includes('dmart') || vLower.includes('grocery') || vLower.includes('supermarket'))
    category = 'Groceries';
  else if (vLower.includes('amazon') || vLower.includes('flipkart') || vLower.includes('shopping'))
    category = 'Shopping';
  else if (vLower.includes('uber') || vLower.includes('fuel') || vLower.includes('petrol'))
    category = 'Transport';
  else if (vLower.includes('electricity') || vLower.includes('bill') || vLower.includes('recharge'))
    category = 'Bills & Utilities';
  else if (vLower.includes('atm')) category = 'Cash & ATM';

  return {
    isValid: true,
    reason: `Confirmed ${type} transaction of ₹${amt.toFixed(2)} for ${vendor}.`,
    amount: amt,
    type,
    vendor,
    category,
    account,
    referenceId,
    matchedRule: 'Strict Banking Action Verified',
  };
}

interface Transaction {
  id: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  vendor: string;
  comment?: string;
  category: string;
  paymentMode: 'SMS' | 'CASH' | 'CARD' | 'UPI';
  accountDetails?: string;
  referenceId?: string;
  rawSms?: string;
  timestamp: number;
}

const MONTHS_LIST = [
  { index: 1, short: 'Jan', full: 'January' },
  { index: 2, short: 'Feb', full: 'February' },
  { index: 3, short: 'Mar', full: 'March' },
  { index: 4, short: 'Apr', full: 'April' },
  { index: 5, short: 'May', full: 'May' },
  { index: 6, short: 'Jun', full: 'June' },
  { index: 7, short: 'Jul', full: 'July' },
  { index: 8, short: 'Aug', full: 'August' },
  { index: 9, short: 'Sep', full: 'September' },
  { index: 10, short: 'Oct', full: 'October' },
  { index: 11, short: 'Nov', full: 'November' },
  { index: 12, short: 'Dec', full: 'December' },
];

const INITIAL_NATIVE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    amount: 1499.0,
    type: 'DEBIT',
    vendor: 'Amazon India',
    comment: 'Paid to Amazon India (Ref: UPI94021948)',
    category: 'Shopping',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX4921',
    referenceId: 'UPI94021948',
    rawSms: 'HDFC Bank: Rs. 1,499.00 debited from A/c **4921 on 02-Nov-26 at AMAZON INDIA. Ref UPI94021948.',
    timestamp: new Date('2026-11-02T13:45:00').getTime(),
  },
  {
    id: 'tx-2',
    amount: 320.0,
    type: 'DEBIT',
    vendor: 'Local Fresh Market',
    comment: 'Fresh farm fruits & vegetables basket',
    category: 'Groceries',
    paymentMode: 'CASH',
    accountDetails: 'Cash in Hand',
    timestamp: new Date('2026-11-02T11:20:00').getTime(),
  },
  {
    id: 'tx-3',
    amount: 640.0,
    type: 'DEBIT',
    vendor: 'Swiggy',
    comment: 'Paid to Swiggy (Ref: 4298102941)',
    category: 'Food & Dining',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX8812',
    referenceId: '4298102941',
    rawSms: 'Dear Customer, Your A/c **8812 has been debited by INR 640.00 on 01-Nov-26 towards SWIGGY UPI:4298102941.',
    timestamp: new Date('2026-11-01T20:30:00').getTime(),
  },
  {
    id: 'tx-4',
    amount: 85000.0,
    type: 'CREDIT',
    vendor: 'Salary Tech Corp',
    comment: 'Received from Salary Tech Corp (Ref: NEFT4910283)',
    category: 'Salary & Income',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX902',
    referenceId: 'NEFT4910283',
    rawSms: 'ICICI Bank Acct XX902 is credited with INR 85,000.00 on 01-Nov-26 by SALARY TECH CORP PVT LTD. Avl Bal: INR 1,16,580.00.',
    timestamp: new Date('2026-11-01T09:00:00').getTime(),
  },
  {
    id: 'tx-5',
    amount: 850.0,
    type: 'DEBIT',
    vendor: 'Shell Auto Fuels',
    comment: 'Paid to Shell Auto Fuels',
    category: 'Transport',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX4921',
    rawSms: 'Alert: You have spent INR 850.00 on your HDFC Debit Card **4921 at SHELL AUTO FUELS on 31-Oct-26.',
    timestamp: new Date('2026-10-31T17:10:00').getTime(),
  },
  {
    id: 'tx-6',
    amount: 45.0,
    type: 'DEBIT',
    vendor: 'Tea & Snacks Corner',
    comment: 'Chai and samosa snack with team',
    category: 'Food & Dining',
    paymentMode: 'CASH',
    accountDetails: 'Cash in Hand',
    timestamp: new Date('2026-10-31T12:05:00').getTime(),
  },
  {
    id: 'tx-7',
    amount: 899.0,
    type: 'CREDIT',
    vendor: 'Flipkart Payments',
    comment: 'Received from Flipkart Payments (Ref: TXN882910)',
    category: 'Shopping',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX4921',
    referenceId: 'TXN882910',
    rawSms: 'Dear Customer, Refund of INR 899.00 has been credited to your HDFC Bank A/c **4921 on 30-Oct-26 by FLIPKART PAYMENTS.',
    timestamp: new Date('2026-10-30T19:40:00').getTime(),
  },
  {
    id: 'tx-8',
    amount: 649.0,
    type: 'DEBIT',
    vendor: 'Netflix Com',
    comment: 'Paid to Netflix Com (Ref: MANDATE9921)',
    category: 'Entertainment',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX7721',
    referenceId: 'MANDATE9921',
    rawSms: 'Kotak Bank: Rs 649.00 debited from A/c **7721 on 29-Oct-26 towards NETFLIX COM. Ref: MANDATE9921',
    timestamp: new Date('2026-10-29T10:00:00').getTime(),
  },
  {
    id: 'tx-9',
    amount: 85000.0,
    type: 'CREDIT',
    vendor: 'Salary Tech Corp',
    comment: 'Received from Salary Tech Corp (Ref: NEFT3891024)',
    category: 'Salary & Income',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX902',
    referenceId: 'NEFT3891024',
    rawSms: 'ICICI Bank Acct XX902 is credited with INR 85,000.00 on 30-Sep-26 by SALARY TECH CORP. Avl Bal: INR 94,200.00.',
    timestamp: new Date('2026-09-30T10:00:00').getTime(),
  },
  {
    id: 'tx-10',
    amount: 3450.0,
    type: 'DEBIT',
    vendor: 'DMart Supermarket',
    comment: 'Paid to DMart Supermarket',
    category: 'Groceries',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX4921',
    rawSms: 'HDFC Bank: Rs. 3,450.00 debited from A/c **4921 on 24-Sep-26 at DMART SUPERMARKET.',
    timestamp: new Date('2026-09-24T18:30:00').getTime(),
  },
  {
    id: 'tx-11',
    amount: 2200.0,
    type: 'DEBIT',
    vendor: 'BESCOM Power Utility',
    comment: 'Paid electricity bill',
    category: 'Bills & Utilities',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX4921',
    timestamp: new Date('2026-08-18T14:20:00').getTime(),
  },
  {
    id: 'tx-12',
    amount: 5000.0,
    type: 'CREDIT',
    vendor: 'Consulting Bonus',
    comment: 'Project milestone bonus',
    category: 'Salary & Income',
    paymentMode: 'SMS',
    accountDetails: 'A/c XX902',
    timestamp: new Date('2025-12-15T11:00:00').getTime(),
  },
];

type BottomTab = 'ledger' | 'analytics' | 'sms' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<BottomTab>('ledger');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_NATIVE_TRANSACTIONS);
  const [currency, setCurrency] = useState('₹');
  const [haptics, setHaptics] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPasteSmsDialog, setShowPasteSmsDialog] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Year filter state ('all' or '2026', '2025', etc.)
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Months multiselect state (empty means all months)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [isMonthMenuOpen, setIsMonthMenuOpen] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthMenuRef.current && !monthMenuRef.current.contains(event.target as Node)) {
        setIsMonthMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setSnackbarMessage(msg);
    setTimeout(() => setSnackbarMessage(null), 3500);
  };

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const t of transactions) {
      years.add(new Date(t.timestamp).getFullYear().toString());
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  // Filtered transactions for Ledger
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const date = new Date(t.timestamp);
      const yr = date.getFullYear().toString();
      const mo = date.getMonth() + 1;

      if (selectedYear !== 'all' && yr !== selectedYear) {
        return false;
      }
      if (selectedMonths.length > 0 && !selectedMonths.includes(mo)) {
        return false;
      }
      return true;
    });
  }, [transactions, selectedYear, selectedMonths]);

  // Financial summary based on filtered transactions
  const summary = useMemo(() => {
    let debits = 0;
    let credits = 0;
    let cashSpent = 0;

    for (const t of filteredTransactions) {
      if (t.type === 'DEBIT') {
        debits += t.amount;
        if (t.paymentMode === 'CASH') {
          cashSpent += t.amount;
        }
      } else {
        credits += t.amount;
      }
    }

    return {
      totalDebits: debits,
      totalCredits: credits,
      netBalance: credits - debits,
      totalCashSpent: cashSpent,
    };
  }, [filteredTransactions]);

  // Category statistics for Analytics tab
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    let totalDebit = 0;

    for (const t of transactions) {
      if (t.type === 'DEBIT') {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
        totalDebit += t.amount;
      }
    }

    return Array.from(map.entries())
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: totalDebit > 0 ? (amount / totalDebit) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Group filtered transactions by Month-Year
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, { label: string; items: Transaction[]; debit: number; credit: number; net: number }>();
    const sorted = [...filteredTransactions].sort((a, b) => b.timestamp - a.timestamp);

    for (const t of sorted) {
      const date = new Date(t.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!map.has(monthKey)) {
        map.set(monthKey, {
          label,
          items: [],
          debit: 0,
          credit: 0,
          net: 0,
        });
      }

      const g = map.get(monthKey)!;
      g.items.push(t);
      if (t.type === 'DEBIT') {
        g.debit += t.amount;
      } else {
        g.credit += t.amount;
      }
      g.net = g.credit - g.debit;
    }

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredTransactions]);

  const handleToggleMonth = (mIndex: number) => {
    setSelectedMonths((prev) =>
      prev.includes(mIndex) ? prev.filter((m) => m !== mIndex) : [...prev, mIndex].sort((a, b) => a - b)
    );
  };

  const monthsButtonLabel = useMemo(() => {
    if (selectedMonths.length === 0) return 'All Months';
    if (selectedMonths.length === 1) {
      const m = MONTHS_LIST.find((item) => item.index === selectedMonths[0]);
      return m ? m.short : '1 Month';
    }
    if (selectedMonths.length <= 2) {
      return selectedMonths
        .map((idx) => MONTHS_LIST.find((m) => m.index === idx)?.short)
        .filter(Boolean)
        .join(', ');
    }
    return `${selectedMonths.length} Months`;
  }, [selectedMonths]);

  // Add manual cash state
  const [addAmount, setAddAmount] = useState('');
  const [addVendor, setAddVendor] = useState('');
  const [addComment, setAddComment] = useState('');
  const [addCategory, setAddCategory] = useState('Food & Dining');
  const [addIsDebit, setAddIsDebit] = useState(true);

  // Paste SMS State
  const [pasteSmsText, setPasteSmsText] = useState('');

  // SMS Pattern Rules & Filter Settings
  const [smsFilterConfig, setSmsFilterConfig] = useState<SmsFilterSettings>(DEFAULT_SMS_CONFIG);
  const [showPatternConfig, setShowPatternConfig] = useState(false);

  // Live SMS Pattern Tester State
  const [testSmsInput, setTestSmsInput] = useState(
    'HDFC Bank: Rs. 450.00 debited from A/c **4012 on 03-Nov-24 to SWIGGY. UPI Ref: 4123456789. Avl Bal Rs.25,000.'
  );

  const testSmsResult = useMemo(() => {
    return validateSmsMessage(testSmsInput, smsFilterConfig);
  }, [testSmsInput, smsFilterConfig]);

  // Paste SMS preview validation
  const pasteSmsValidation = useMemo(() => {
    if (!pasteSmsText.trim()) return null;
    return validateSmsMessage(pasteSmsText, smsFilterConfig);
  }, [pasteSmsText, smsFilterConfig]);

  const handleScanInbox = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      showToast('Scan complete: 12 valid bank transactions synced. 18 OTPs & promo ads filtered out!');
    }, 1200);
  };

  const handleParseAndAddSms = () => {
    if (!pasteSmsText.trim()) return;

    const validation = validateSmsMessage(pasteSmsText, smsFilterConfig);
    if (!validation.isValid) {
      showToast(`Blocked: ${validation.reason}`);
      return;
    }

    const amt = validation.amount!;
    const type = validation.type!;
    const vendor = validation.vendor!;

    const newTxn: Transaction = {
      id: `sms-${Date.now()}`,
      amount: amt,
      type,
      vendor,
      comment: `${type === 'DEBIT' ? 'Paid to' : 'Received from'} ${vendor}${
        validation.referenceId ? ` (Ref: ${validation.referenceId})` : ''
      }`,
      category: validation.category || (type === 'CREDIT' ? 'Salary & Income' : 'Shopping'),
      paymentMode: 'SMS',
      accountDetails: validation.account || 'Bank A/c',
      referenceId: validation.referenceId,
      rawSms: pasteSmsText,
      timestamp: Date.now(),
    };

    setTransactions((prev) => [newTxn, ...prev]);
    setShowPasteSmsDialog(false);
    setPasteSmsText('');
    showToast(`✓ Safe SMS imported! Added ${type === 'DEBIT' ? '-' : '+'}₹${amt.toFixed(2)} for ${vendor}`);
  };

  const handleSaveManual = () => {
    const amt = parseFloat(addAmount);
    if (isNaN(amt) || amt <= 0) return;

    const newTxn: Transaction = {
      id: `manual-${Date.now()}`,
      amount: amt,
      type: addIsDebit ? 'DEBIT' : 'CREDIT',
      vendor: addVendor.trim() || (addIsDebit ? 'Cash Expense' : 'Cash Income'),
      comment: addComment.trim() || undefined,
      category: addCategory,
      paymentMode: 'CASH',
      accountDetails: 'Cash in Hand',
      timestamp: Date.now(),
    };

    setTransactions((prev) => [newTxn, ...prev]);
    setShowAddDialog(false);
    setAddAmount('');
    setAddVendor('');
    setAddComment('');
    showToast(`Cash ${addIsDebit ? 'Expense' : 'Income'} of ₹${amt.toFixed(2)} recorded.`);
  };

  const renderTransactionRow = (txn: Transaction) => {
    const isDebit = txn.type === 'DEBIT';
    const dateStr = new Date(txn.timestamp).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        key={txn.id}
        className="rounded-xl bg-[#1E293B] border border-slate-800/80 p-3 flex items-center justify-between gap-2 shadow-sm"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white truncate">{txn.vendor}</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                txn.paymentMode === 'CASH'
                  ? 'bg-[#78350F] text-[#FDE68A]'
                  : 'bg-[#0C4A6E] text-[#BAE6FD]'
              }`}
            >
              {txn.paymentMode}
            </span>
          </div>

          {txn.comment && (
            <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">{txn.comment}</p>
          )}

          <div className="text-[10px] text-[#64748B] mt-0.5">
            {dateStr} · {txn.category}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div
            className={`text-xs font-bold font-mono tabular-nums ${
              isDebit ? 'text-[#FB7185]' : 'text-[#34D399]'
            }`}
          >
            {isDebit ? '-' : '+'}₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] font-semibold text-[#64748B]">
            {isDebit ? 'DEBIT' : 'CREDIT'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-2 sm:p-6 font-sans">
      {/* Top Controller Bar */}
      <div className="w-full max-w-md mb-2 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">Samsung Galaxy A57 Live Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            One UI 6 · Android 14
          </span>
        </div>
      </div>

      {/* Samsung Galaxy A57 Device Frame */}
      <div className="relative w-full max-w-md bg-[#090D16] rounded-[42px] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[840px] select-none">
        {/* Device Punch Hole Camera & Speaker */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-slate-850 z-50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
        </div>

        {/* Android Status Bar */}
        <div className="h-7 w-full px-7 pt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-400 z-40 bg-[#090D16]">
          <span>09:41</span>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span>5G</span>
            <span>📶</span>
            <span>100% 🔋</span>
          </div>
        </div>

        {/* Top App Bar */}
        <div className="px-5 py-2.5 flex items-center justify-between border-b border-slate-900 bg-[#090D16] z-30">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">SpendTracker</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0C4A6E] text-[#38BDF8]">
                Samsung A57
              </span>
            </div>
            <div className="text-[11px] font-medium text-[#10B981] flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>Auto SMS Reader Active</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPasteSmsDialog(true)}
              className="p-2 rounded-xl text-[#38BDF8] hover:bg-slate-900 active:scale-95 transition-all"
              title="Paste SMS"
            >
              <Mail className="w-5 h-5" />
            </button>
            <button
              onClick={handleScanInbox}
              disabled={isScanning}
              className="p-2 rounded-xl text-white hover:bg-slate-900 active:scale-95 transition-all disabled:opacity-50"
              title="Scan SMS Inbox"
            >
              <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin text-[#38BDF8]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dynamic Content View depending on active Bottom Tab */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
          {/* TAB 1: LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-3.5">
              {/* TOTAL NET BALANCE HERO CARD WITH YEAR & MULTISELECT MONTH MENUS */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 shadow-lg relative z-20">
                {/* ROW 1: TOTAL NET BALANCE (LEFT) | YEAR SELECTOR (RIGHT) */}
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-semibold tracking-wider uppercase text-[#94A3B8]">
                    Total Net Balance
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Year
                    </span>
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="appearance-none bg-[#1E293B] hover:bg-slate-800 text-white text-xs font-bold pl-2.5 pr-6 py-1 rounded-lg border border-slate-700/80 focus:outline-none focus:border-sky-500 cursor-pointer shadow-sm"
                      >
                        <option value="all">All Years</option>
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* ROW 2: AMOUNT (LEFT) | MULTISELECT MONTHS (RIGHT) */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="text-2xl font-black font-mono tracking-tight text-white tabular-nums">
                    {summary.netBalance < 0 ? '-' : ''}₹
                    {Math.abs(summary.netBalance).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>

                  <div className="relative" ref={monthMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsMonthMenuOpen(!isMonthMenuOpen)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all shadow-sm ${
                        selectedMonths.length > 0
                          ? 'bg-sky-950/70 text-[#38BDF8] border-sky-600/60 shadow-sky-900/30'
                          : 'bg-[#1E293B] hover:bg-slate-800 text-slate-200 border-slate-700/80'
                      }`}
                      title="Filter by Months (Multiselect)"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span className="max-w-[100px] truncate">{monthsButtonLabel}</span>
                      {selectedMonths.length > 0 && (
                        <span className="w-4 h-4 rounded-full bg-[#0284C7] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {selectedMonths.length}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                          isMonthMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isMonthMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#1E293B] border border-slate-700/90 shadow-2xl p-3 z-50 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/60 text-xs">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                            Filter Months
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedMonths([])}
                            className={`text-[11px] font-semibold transition-colors ${
                              selectedMonths.length === 0
                                ? 'text-sky-400'
                                : 'text-slate-400 hover:text-white underline'
                            }`}
                          >
                            All Months
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          {MONTHS_LIST.map((m) => {
                            const isSelected = selectedMonths.includes(m.index);
                            return (
                              <button
                                key={m.index}
                                type="button"
                                onClick={() => handleToggleMonth(m.index)}
                                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all ${
                                  isSelected
                                    ? 'bg-sky-600 text-white border-sky-500 shadow-sm shadow-sky-600/30'
                                    : 'bg-[#111827] text-slate-300 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800'
                                }`}
                              >
                                <span>{m.short}</span>
                                {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            {selectedMonths.length === 0
                              ? 'Showing all 12 months'
                              : `${selectedMonths.length} month(s) selected`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsMonthMenuOpen(false)}
                            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md font-bold text-xs shadow-sm"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="my-3 border-t border-[#1E293B]" />

                {/* Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 text-left">
                  <div>
                    <div className="text-[10px] text-[#94A3B8]">Total Debited (-)</div>
                    <div className="text-xs font-bold text-[#FB7185] font-mono tabular-nums mt-0.5">
                      -₹{summary.totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#94A3B8]">Total Credited (+)</div>
                    <div className="text-xs font-bold text-[#34D399] font-mono tabular-nums mt-0.5">
                      +₹{summary.totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#94A3B8]">Cash Spent</div>
                    <div className="text-xs font-bold text-[#FBBF24] font-mono tabular-nums mt-0.5">
                      ₹{summary.totalCashSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-xs font-bold text-white tracking-wide">
                  Transaction History
                </span>
                <span className="text-[11px] text-[#94A3B8]">
                  {filteredTransactions.length} records in view
                </span>
              </div>

              {/* Grouped Ledger ONLY when multiple or all months are selected */}
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl bg-[#111827] border border-slate-800 text-slate-400 space-y-2">
                  <Calendar className="w-8 h-8 mx-auto text-slate-500" />
                  <div className="text-xs font-bold text-slate-300">No transactions match your period filter</div>
                  <p className="text-[11px] text-slate-500">
                    Try selecting "All Months" or changing the year above.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedYear('all');
                      setSelectedMonths([]);
                    }}
                    className="mt-2 px-3 py-1 bg-sky-600 text-white rounded-lg text-xs font-semibold"
                  >
                    Show All Transactions
                  </button>
                </div>
              ) : selectedMonths.length === 1 ? (
                /* Single month selected: Month name card removed, items listed directly */
                <div className="space-y-2 pb-20">
                  {filteredTransactions.map(renderTransactionRow)}
                </div>
              ) : (
                /* Multiple months or all months selected: Grouped by month */
                <div className="space-y-3 pb-20">
                  {groupedByMonth.map(([monthKey, group]) => (
                    <div key={monthKey} className="space-y-1.5">
                      <div className="flex items-center justify-between px-1 pt-1.5 pb-0.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                          <span>{group.label}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({group.items.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold font-mono">
                          <span className="text-[#FB7185]">
                            -₹{group.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[#34D399]">
                            +₹{group.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {group.items.map(renderTransactionRow)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANALYTICS & INSIGHTS */}
          {activeTab === 'analytics' && (
            <div className="space-y-3.5 pb-20 animate-in fade-in duration-150">
              {/* Financial Health Banner */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Savings & Spending Health
                  </span>
                  <span className="text-[#38BDF8] font-bold font-mono">
                    {summary.totalCredits > 0
                      ? Math.round(((summary.totalCredits - summary.totalDebits) / summary.totalCredits) * 100)
                      : 0}
                    % Net Savings
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="h-2.5 w-full bg-[#1E293B] rounded-full overflow-hidden flex">
                    <div
                      style={{
                        width: `${
                          summary.totalCredits + summary.totalDebits > 0
                            ? (summary.totalDebits / (summary.totalCredits + summary.totalDebits)) * 100
                            : 50
                        }%`,
                      }}
                      className="bg-[#FB7185] h-full"
                    />
                    <div
                      style={{
                        width: `${
                          summary.totalCredits + summary.totalDebits > 0
                            ? (summary.totalCredits / (summary.totalCredits + summary.totalDebits)) * 100
                            : 50
                        }%`,
                      }}
                      className="bg-[#34D399] h-full"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="text-[#FB7185]">
                      Debits: ₹{summary.totalDebits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[#34D399]">
                      Credits: ₹{summary.totalCredits.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash vs Bank Spending Breakdown */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-[#111827] border border-slate-800 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#FBBF24] font-semibold">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Cash Spending</span>
                  </div>
                  <div className="text-base font-bold text-white font-mono">
                    ₹{summary.totalCashSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] text-slate-500">Manual cash ledger</p>
                </div>

                <div className="rounded-2xl bg-[#111827] border border-slate-800 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#38BDF8] font-semibold">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>Bank SMS Spend</span>
                  </div>
                  <div className="text-base font-bold text-white font-mono">
                    ₹{(summary.totalDebits - summary.totalCashSpent).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500">Auto-parsed SMS</p>
                </div>
              </div>

              {/* Expense by Category Breakdown */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <PieChart className="w-4 h-4 text-[#38BDF8]" />
                  <span>Spending By Category</span>
                </div>

                <div className="space-y-2.5">
                  {categoryStats.map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{item.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-500 w-8 text-right font-mono">
                            {item.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-[#1E293B] rounded-full overflow-hidden">
                        <div style={{ width: `${item.percentage}%` }} className="h-full bg-sky-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SMS SYNC CENTER & PATTERN CONFIGURATION */}
          {activeTab === 'sms' && (
            <div className="space-y-3.5 pb-20 animate-in fade-in duration-150">
              {/* Header Status Card */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 text-center space-y-2.5 shadow-lg">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-[#38BDF8] flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Samsung Auto-SMS Receiver</h3>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold mt-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Strict Anti-False-Positive Filter Active</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Native Android BroadcastReceiver listens for bank debits & credits in the background. False expenses (OTPs, bill dues, loan ads) are automatically blocked.
                </p>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    onClick={handleScanInbox}
                    disabled={isScanning}
                    className="px-4 py-2 bg-[#0284C7] hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Scanning Inbox...' : 'Scan SMS Inbox'}</span>
                  </button>
                  <button
                    onClick={() => setShowPasteSmsDialog(true)}
                    className="px-4 py-2 bg-[#1E293B] hover:bg-slate-800 text-[#A78BFA] border border-purple-800/60 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Paste Bank SMS</span>
                  </button>
                </div>
              </div>

              {/* CARD 2: SMS SCANNING PATTERN RULES & SETTINGS */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-[#38BDF8]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      SMS Pattern Rules & Filters
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPatternConfig(!showPatternConfig)}
                    className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <span>{showPatternConfig ? 'Collapse' : 'Customize'}</span>
                    {showPatternConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {/* Preset Mode Pills */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSmsFilterConfig(DEFAULT_SMS_CONFIG);
                      showToast('Switched to Strict Banking Mode (Zero false expenses).');
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      smsFilterConfig.mode === 'strict'
                        ? 'bg-sky-950/40 border-sky-500 text-white'
                        : 'bg-[#1E293B]/70 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Strict Banking</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      Blocks OTPs, pending bills, loan offers & balance alerts.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSmsFilterConfig((prev) => ({ ...prev, mode: 'custom' }));
                      setShowPatternConfig(true);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      smsFilterConfig.mode === 'custom'
                        ? 'bg-purple-950/40 border-purple-500 text-white'
                        : 'bg-[#1E293B]/70 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <div className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                      <Sliders className="w-3 h-3" />
                      <span>Custom Rules</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      Toggle individual rules & custom keywords.
                    </p>
                  </button>
                </div>

                {/* Granular Toggles & Keywords (shown when expanded) */}
                {showPatternConfig && (
                  <div className="pt-2 border-t border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Anti-False-Positive Filter Toggles</span>
                      <button
                        onClick={() => {
                          setSmsFilterConfig(DEFAULT_SMS_CONFIG);
                          showToast('Reset pattern rules to recommended strict defaults.');
                        }}
                        className="text-[10px] text-slate-400 hover:text-sky-400 flex items-center gap-1"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset Defaults</span>
                      </button>
                    </div>

                    {/* Rule 1: OTP */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#1E293B]/60 text-xs">
                      <div>
                        <div className="font-semibold text-white">Block OTP & Security Codes</div>
                        <div className="text-[10px] text-slate-400">Ignores "Your OTP for Rs 500 is 123456"</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsFilterConfig.filterOtp}
                        onChange={(e) =>
                          setSmsFilterConfig((prev) => ({ ...prev, filterOtp: e.target.checked }))
                        }
                        className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Rule 2: Bill Due */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#1E293B]/60 text-xs">
                      <div>
                        <div className="font-semibold text-white">Block Unpaid Bill Dues & Notices</div>
                        <div className="text-[10px] text-slate-400">Ignores "Bill of Rs 1499 is due on 20-Nov"</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsFilterConfig.filterBillDues}
                        onChange={(e) =>
                          setSmsFilterConfig((prev) => ({ ...prev, filterBillDues: e.target.checked }))
                        }
                        className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Rule 3: Promos */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#1E293B]/60 text-xs">
                      <div>
                        <div className="font-semibold text-white">Block Promotional Offers & Loans</div>
                        <div className="text-[10px] text-slate-400">Ignores "Pre-approved loan of Rs 5,00,000"</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsFilterConfig.filterPromos}
                        onChange={(e) =>
                          setSmsFilterConfig((prev) => ({ ...prev, filterPromos: e.target.checked }))
                        }
                        className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Rule 4: Balance Alerts */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#1E293B]/60 text-xs">
                      <div>
                        <div className="font-semibold text-white">Block Standalone Balance Alerts</div>
                        <div className="text-[10px] text-slate-400">Ignores "Avail Bal in A/c is Rs 25,000"</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsFilterConfig.filterBalanceInquiry}
                        onChange={(e) =>
                          setSmsFilterConfig((prev) => ({ ...prev, filterBalanceInquiry: e.target.checked }))
                        }
                        className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Rule 5: Action Verb Required */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#1E293B]/60 text-xs">
                      <div>
                        <div className="font-semibold text-white">Require Confirmed Action Verb</div>
                        <div className="text-[10px] text-slate-400">Requires "debited", "paid to", "credited", "withdrawn"</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsFilterConfig.requireActionVerb}
                        onChange={(e) =>
                          setSmsFilterConfig((prev) => ({ ...prev, requireActionVerb: e.target.checked }))
                        }
                        className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Rule 6: Account Anchor */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#1E293B]/60 text-xs">
                      <div>
                        <div className="font-semibold text-white">Require Account / Card / UPI Anchor</div>
                        <div className="text-[10px] text-slate-400">Requires A/c XX1234 or UPI Ref in message</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsFilterConfig.requireAccountAnchor}
                        onChange={(e) =>
                          setSmsFilterConfig((prev) => ({ ...prev, requireAccountAnchor: e.target.checked }))
                        }
                        className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Custom Exclusions Input */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Custom Exclusion Keywords (Comma Separated)
                      </label>
                      <input
                        type="text"
                        value={smsFilterConfig.customExclusions}
                        onChange={(e) =>
                          setSmsFilterConfig((prev) => ({ ...prev, customExclusions: e.target.value }))
                        }
                        placeholder="e.g. loan, offer, due, scratch card, reward"
                        className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: INTERACTIVE LIVE SMS TESTER */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Interactive Pattern Tester
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Live Verification</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Test any SMS against the pattern rules. See why legitimate transactions pass and false expenses are blocked.
                </p>

                {/* Sample Test Buttons */}
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      setTestSmsInput(
                        'HDFC Bank: Rs. 450.00 debited from A/c **4012 on 03-Nov-24 to SWIGGY. UPI Ref: 4123456789. Avl Bal Rs.25,000.'
                      )
                    }
                    className="px-2 py-1 bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300 rounded-lg font-medium"
                  >
                    ✓ Bank Debit SMS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTestSmsInput(
                        'Dear SBI User, A/c **9821 credited by Rs. 54,000.00 on 01-Nov-24 by Salary TechCorp Solutions. Ref: SAL202411.'
                      )
                    }
                    className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 rounded-lg font-medium"
                  >
                    ✓ Salary Credit SMS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTestSmsInput(
                        'Your OTP for payment of Rs. 450.00 at Swiggy is 928371. Do not share this code with anyone.'
                      )
                    }
                    className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-lg font-medium"
                  >
                    ✗ False OTP SMS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTestSmsInput(
                        'Dear Customer, electricity bill of Rs. 1,499.00 is generated. Due date is 20-Nov-24. Pay before due date to avoid penalty.'
                      )
                    }
                    className="px-2 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 rounded-lg font-medium"
                  >
                    ✗ False Bill Due SMS
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTestSmsInput(
                        'Special Offer! You are pre-approved for personal loan of Rs. 5,00,000 with instant disbursal. Apply now.'
                      )
                    }
                    className="px-2 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 rounded-lg font-medium"
                  >
                    ✗ False Loan Promo SMS
                  </button>
                </div>

                {/* Tester Textarea */}
                <textarea
                  value={testSmsInput}
                  onChange={(e) => setTestSmsInput(e.target.value)}
                  placeholder="Paste or type any SMS text to test..."
                  className="w-full h-20 bg-[#1E293B] border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none font-mono"
                />

                {/* Diagnostic Result Banner */}
                {testSmsResult.isValid ? (
                  <div className="rounded-xl bg-emerald-950/40 border border-emerald-700/80 p-3 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>PASSED — Confirmed Bank Transaction</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-slate-400">Extracted Amount: </span>
                        <span className="font-mono font-bold text-white">
                          {testSmsResult.type === 'DEBIT' ? '-' : '+'}₹
                          {testSmsResult.amount?.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Type: </span>
                        <span
                          className={`font-bold ${
                            testSmsResult.type === 'DEBIT' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {testSmsResult.type}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Vendor: </span>
                        <span className="font-semibold text-white">{testSmsResult.vendor}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Category: </span>
                        <span className="text-slate-300">{testSmsResult.category}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-rose-950/40 border border-rose-700/80 p-3 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>BLOCKED — False Expense Prevented</span>
                    </div>
                    <p className="text-[11px] text-rose-200/90 leading-snug">
                      {testSmsResult.reason}
                    </p>
                    {testSmsResult.matchedRule && (
                      <div className="text-[10px] text-rose-400 font-mono">
                        Rule Triggered: {testSmsResult.matchedRule}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Secure Folder Tip */}
              <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <Lock className="w-4 h-4" />
                  <span>Samsung Secure Folder Guide</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If running inside Samsung Secure Folder, Android isolates live broadcast SMS. Use the <strong className="text-slate-200">"Scan SMS Inbox"</strong> or <strong className="text-slate-200">"Paste SMS"</strong> button to import your bank transactions seamlessly!
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS & BACKUP */}
          {activeTab === 'settings' && (
            <div className="space-y-3.5 pb-20 animate-in fade-in duration-150">
              {/* Preferences */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Sliders className="w-4 h-4 text-[#38BDF8]" />
                  <span>Preferences</span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-800">
                  <span className="text-slate-300 font-medium">Currency Symbol</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-[#1E293B] text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700"
                  >
                    <option value="₹">₹ (INR - Rupee)</option>
                    <option value="$">$ (USD - Dollar)</option>
                    <option value="€">€ (EUR - Euro)</option>
                    <option value="£">£ (GBP - Pound)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-300 font-medium">Haptic Feedback on Click</span>
                  <button
                    onClick={() => setHaptics(!haptics)}
                    className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                      haptics ? 'bg-sky-600 justify-end' : 'bg-slate-800 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>

              {/* Native Keystore & Build Info */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Native Release Keystore</span>
                </div>

                <div className="text-xs space-y-1 font-mono text-slate-400 bg-[#0F172A] p-3 rounded-xl border border-slate-800">
                  <div>Package: <span className="text-white">com.samsung.spendtracker</span></div>
                  <div>Keystore: <span className="text-white">android/keystore/release.keystore</span></div>
                  <div>Alias: <span className="text-white">release_key</span></div>
                  <div>Password: <span className="text-white">spendtracker123</span></div>
                  <div>Validity: <span className="text-emerald-400">Valid until year 2054</span></div>
                </div>
              </div>

              {/* Reset Data */}
              <div className="rounded-2xl bg-[#111827] border border-slate-800 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <Trash2 className="w-4 h-4" />
                  <span>Reset & Sample Data</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setTransactions(INITIAL_NATIVE_TRANSACTIONS);
                      showToast('Database reset to initial sample transactions.');
                    }}
                    className="flex-1 py-2 bg-[#1E293B] hover:bg-slate-800 text-xs font-semibold rounded-xl text-slate-300 border border-slate-700"
                  >
                    Reset Samples
                  </button>
                  <button
                    onClick={() => {
                      setTransactions([]);
                      showToast('All transaction records cleared.');
                    }}
                    className="flex-1 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-xs font-semibold rounded-xl text-[#FB7185] border border-rose-900/50"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button (+) matching MainActivity.kt */}
        {activeTab === 'ledger' && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="absolute bottom-20 right-5 w-13 h-13 rounded-full bg-[#0284C7] hover:bg-sky-500 active:scale-95 text-white shadow-xl shadow-sky-600/30 flex items-center justify-center z-40 transition-transform cursor-pointer"
            title="Add Cash Spend"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Toast / Snackbar */}
        {snackbarMessage && (
          <div className="absolute bottom-20 left-4 right-4 bg-slate-800 border border-slate-700 text-white text-xs py-2.5 px-4 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {snackbarMessage}
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR matching Material 3 NavigationBar */}
        <div className="h-16 w-full bg-[#0F172A] border-t border-slate-800/80 px-2 flex items-center justify-around z-50">
          {/* 1. Ledger */}
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
              activeTab === 'ledger' ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span className="text-[10px] font-bold">Ledger</span>
          </button>

          {/* 2. Analytics */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
              activeTab === 'analytics' ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span className="text-[10px] font-bold">Analytics</span>
          </button>

          {/* 3. SMS Sync */}
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
              activeTab === 'sms' ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-[10px] font-bold">SMS Sync</span>
          </button>

          {/* 4. Settings */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
              activeTab === 'settings' ? 'text-[#38BDF8]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="text-[10px] font-bold">Settings</span>
          </button>
        </div>

        {/* Add Cash Dialog */}
        {showAddDialog && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Add Cash Spending / Earning</h3>
                <button onClick={() => setShowAddDialog(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAddIsDebit(true)}
                  className={`py-2 text-xs font-bold rounded-xl transition-colors ${
                    addIsDebit
                      ? 'bg-[#E11D48] text-white shadow-sm'
                      : 'bg-[#334155] text-slate-300'
                  }`}
                >
                  Spent (Debit -)
                </button>
                <button
                  type="button"
                  onClick={() => setAddIsDebit(false)}
                  className={`py-2 text-xs font-bold rounded-xl transition-colors ${
                    !addIsDebit
                      ? 'bg-[#059669] text-white shadow-sm'
                      : 'bg-[#334155] text-slate-300'
                  }`}
                >
                  Earned (Credit +)
                </button>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Amount ({currency})</label>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Vendor / Payee</label>
                <input
                  type="text"
                  value={addVendor}
                  onChange={(e) => setAddVendor(e.target.value)}
                  placeholder="e.g. Chai, Grocery, Taxi"
                  className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Comment / Note</label>
                <input
                  type="text"
                  value={addComment}
                  onChange={(e) => setAddComment(e.target.value)}
                  placeholder="Optional note"
                  className="w-full bg-[#1E293B] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveManual}
                  disabled={!addAmount || parseFloat(addAmount) <= 0}
                  className="px-4 py-2 bg-[#0284C7] hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Save Transaction
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Paste SMS Dialog */}
        {showPasteSmsDialog && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Paste Bank SMS (Indian Banks)</h3>
                <button onClick={() => setShowPasteSmsDialog(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Paste any transaction SMS (HDFC, SBI, ICICI, Axis, UPI, etc.). The native engine will extract the amount, merchant, and debit/credit status.
              </p>

              <textarea
                value={pasteSmsText}
                onChange={(e) => setPasteSmsText(e.target.value)}
                placeholder="e.g. Paid Rs.450.00 to Swiggy on 03-Nov-26 via UPI Ref 4123456789. Avl Bal Rs.25,000"
                className="w-full h-24 bg-[#1E293B] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none font-mono"
              />

              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    setPasteSmsText(
                      'HDFC Bank: Rs. 450.00 debited from A/c **4921 on 04-Nov-26 at Zomato. Ref: UPI8812.'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 text-sky-400 shrink-0"
                >
                  + Sample Debit SMS
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPasteSmsText(
                      'ICICI Bank Acct XX902 is credited with INR 12,500.00 on 04-Nov-26 by CLIENT FREELANCE. Avl Bal: INR 45,000.'
                    )
                  }
                  className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 text-emerald-400 shrink-0"
                >
                  + Sample Credit SMS
                </button>
              </div>

              {pasteSmsText.trim() && pasteSmsValidation && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                    pasteSmsValidation.isValid
                      ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-700/80 text-rose-300'
                  }`}
                >
                  {pasteSmsValidation.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-bold">
                      {pasteSmsValidation.isValid
                        ? `✓ Verified Bank ${pasteSmsValidation.type}: ₹${pasteSmsValidation.amount?.toFixed(2)} (${pasteSmsValidation.vendor})`
                        : '✗ Blocked by Pattern Filter (False Expense Prevented)'}
                    </div>
                    <div className="text-[11px] opacity-90 leading-tight">
                      {pasteSmsValidation.reason}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteSmsDialog(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParseAndAddSms}
                  disabled={!pasteSmsText.trim() || !pasteSmsValidation?.isValid}
                  className="px-4 py-2 bg-[#0284C7] hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Parse & Add to Ledger
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
