import { ExpenseCategory, ParsedSms, TransactionType } from '../types';

/**
 * Intelligent categorization dictionary based on merchant/vendor names & keywords
 */
const CATEGORY_RULES: { category: ExpenseCategory; keywords: string[] }[] = [
  {
    category: 'Food & Dining',
    keywords: [
      'swiggy', 'zomato', 'mcdonalds', 'starbucks', 'dominos', 'pizza', 'kfc',
      'subway', 'chaayos', 'chai', 'cafe', 'restaurant', 'burger', 'food',
      'eats', 'diner', 'bakery', 'kitchen', 'bistro', 'barbeque', 'bbq',
      'blinkit', 'zepto', 'instamart'
    ],
  },
  {
    category: 'Groceries',
    keywords: [
      'supermarket', 'grocery', 'mart', 'dmart', 'bigbasket', 'spencer',
      'natures basket', 'fresh', 'vegetable', 'kirana', 'provisions', 'walmart',
      'trader joe', 'costco', 'target'
    ],
  },
  {
    category: 'Shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'zara',
      'h&m', 'uniqlo', 'retail', 'store', 'mall', 'fashion', 'clothing',
      'electronics', 'apple store', 'croma', 'reliance digital'
    ],
  },
  {
    category: 'Bills & Utilities',
    keywords: [
      'electricity', 'bescom', 'bill', 'recharge', 'airtel', 'jio', 'vi',
      'vodafone', 'wifi', 'broadband', 'act fibernet', 'gas', 'water',
      'utility', 'tata sky', 'dth', 'postpaid', 'prepaid', 'power'
    ],
  },
  {
    category: 'Transport',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'fuel', 'petrol', 'diesel', 'hpcl',
      'bpcl', 'iocl', 'shell', 'parking', 'toll', 'fastag', 'railway',
      'irctc', 'flight', 'indigo', 'air india', 'cab', 'transit'
    ],
  },
  {
    category: 'Entertainment',
    keywords: [
      'netflix', 'spotify', 'hotstar', 'prime video', 'youtube', 'bookmyshow',
      'cinema', 'pvr', 'inox', 'movie', 'steam', 'playstation', 'game'
    ],
  },
  {
    category: 'Health & Medical',
    keywords: [
      'apollo', 'pharmacy', 'medplus', 'hospital', 'clinic', 'pharma', 'dr.',
      'doctor', '1mg', 'practo', 'diagnostic', 'dental', 'medicines'
    ],
  },
  {
    category: 'Salary & Income',
    keywords: [
      'salary', 'payroll', 'dividend', 'interest', 'stipend', 'bonus',
      'cashback', 'reimbursement', 'incentive'
    ],
  },
  {
    category: 'Cash & ATM',
    keywords: [
      'atm', 'cash wdl', 'cash withdrawal', 'atm wdl', 'self withdrawal'
    ],
  },
  {
    category: 'Investment',
    keywords: [
      'zerodha', 'groww', 'mutual fund', 'sip', 'upstox', 'coin', 'shares',
      'bse', 'nse', 'securities'
    ],
  },
];

export function categorizeVendor(vendor: string, isCredit: boolean): ExpenseCategory {
  const lower = vendor.toLowerCase();

  if (isCredit && (lower.includes('salary') || lower.includes('payroll') || lower.includes('dividend') || lower.includes('interest'))) {
    return 'Salary & Income';
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.category;
    }
  }

  return isCredit ? 'Salary & Income' : 'Other';
}

/**
 * Extracts amount from SMS body
 */
function extractAmount(text: string): number | null {
  const patterns = [
    /(?:INR|Rs\.?|₹|\$|USD|EUR|GBP)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:debited|credited|spent|paid|withdrawn|refund of|received|transfer of)\s*(?:by|for|of)?\s*(?:INR|Rs\.?|₹|\$|USD)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:amount|amt\.?)\s*(?:is|:)?\s*(?:INR|Rs\.?|₹|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000000) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Detects whether an SMS is strictly a pure OTP or non-financial verification code
 */
export function isPureOtpOrSpam(text: string): { isNoise: boolean; reason?: string } {
  const lower = text.toLowerCase();

  // If it's a pure OTP without any debit or credit transaction
  const hasDebitOrCredit =
    lower.includes('debited') ||
    lower.includes('credited') ||
    lower.includes('spent') ||
    lower.includes('withdrawn') ||
    lower.includes('paid to') ||
    lower.includes('salary') ||
    lower.includes('refund');

  if (!hasDebitOrCredit) {
    if (lower.includes('otp') || lower.includes('verification code') || lower.includes('one time password')) {
      return { isNoise: true, reason: 'One-Time Password (OTP) - Not a transaction' };
    }
    if (lower.includes('discount') || lower.includes('offer') || lower.includes('promo code') || lower.includes('flat 50%')) {
      return { isNoise: true, reason: 'Promotional Ad / Discount offer' };
    }
    if (lower.includes('login') || lower.includes('password reset') || lower.includes('security alert')) {
      return { isNoise: true, reason: 'Account security message' };
    }
    return { isNoise: true, reason: 'Non-financial text message' };
  }

  return { isNoise: false };
}

/**
 * Determines whether this transaction is Debit (spending) or Credit (earning/inflow)
 */
function detectTransactionType(text: string): TransactionType {
  const lower = text.toLowerCase();

  const creditSignals = [
    'credited', 'credit to', 'received', 'deposited', 'salary', 'refund',
    'cashback', 'inward', 'credited with', 'added to', 'reversed'
  ];

  const debitSignals = [
    'debited', 'spent', 'paid', 'withdrawn', 'sent', 'purchased',
    'charged', 'txn of', 'payment to', 'debit from', 'purchase of'
  ];

  let creditScore = 0;
  let debitScore = 0;

  for (const sig of creditSignals) {
    if (lower.includes(sig)) creditScore += 2;
  }

  for (const sig of debitSignals) {
    if (lower.includes(sig)) debitScore += 2;
  }

  if (lower.includes('refund') || lower.includes('cashback') || lower.includes('salary credited')) {
    return 'credit';
  }

  if (lower.includes('debited') || lower.includes('spent') || lower.includes('sent to') || lower.includes('paid to')) {
    return 'debit';
  }

  return creditScore > debitScore ? 'credit' : 'debit';
}

/**
 * Extracts vendor / merchant / payee / sender name
 */
function extractVendor(text: string, type: TransactionType): string {
  const clean = text.replace(/\n/g, ' ');

  // Pattern 1: at [MERCHANT]
  const atMatch = clean.match(/(?:at|vdr|info|towards|for)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))/i);
  if (atMatch && atMatch[1] && atMatch[1].trim().length > 1) {
    const candidate = cleanVendorString(atMatch[1]);
    if (isValidVendor(candidate)) return candidate;
  }

  // Pattern 2: to [MERCHANT / PERSON] (Debits)
  if (type === 'debit') {
    const toMatch = clean.match(/(?:paid to|transfer to|sent to|to)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))/i);
    if (toMatch && toMatch[1]) {
      const candidate = cleanVendorString(toMatch[1]);
      if (isValidVendor(candidate)) return candidate;
    }
  }

  // Pattern 3: from [SENDER] (Credits)
  if (type === 'credit') {
    const fromMatch = clean.match(/(?:received from|from|by)\s+([A-Za-z0-9&'\.\- ]+?)(?:\s+(?:on|ref|upi|avl|bal|using|card|dated|\.|\,|$))/i);
    if (fromMatch && fromMatch[1]) {
      const candidate = cleanVendorString(fromMatch[1]);
      if (isValidVendor(candidate)) return candidate;
    }
  }

  // Pattern 4: ATM withdrawal
  if (/atm/i.test(clean)) {
    const atmMatch = clean.match(/([A-Za-z0-9\s]+ATM[A-Za-z0-9\s]*)/i);
    if (atmMatch) return cleanVendorString(atmMatch[1]);
    return 'ATM Cash Withdrawal';
  }

  // Pattern 5: UPI VPA
  const vpaMatch = clean.match(/([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/);
  if (vpaMatch) {
    return vpaMatch[1];
  }

  // Pattern 6: Bank header prefix (e.g. HDFC Bank, SBI, ICICI)
  const bankMatch = clean.match(/^(HDFC|SBI|ICICI|AXIS|KOTAK|PNB|CHASE|CITI|AMEX|PAYTM|PHONEPE|GPAY)/i);
  if (bankMatch) {
    return `${bankMatch[1].toUpperCase()} Transaction`;
  }

  return type === 'credit' ? 'Account Credit / Transfer' : 'Card / Bank Merchant';
}

function cleanVendorString(str: string): string {
  let v = str.trim()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[,\.\:\;]+$/, '')
    .trim();

  if (v.length > 2 && v === v.toUpperCase()) {
    v = v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return v;
}

function isValidVendor(v: string): boolean {
  const lower = v.toLowerCase();
  const blacklisted = [
    'your', 'acct', 'account', 'card', 'bank', 'avl bal', 'bal', 'balance',
    'inr', 'rs', 'credited', 'debited', 'not you', 'call', 'sms', 'otp',
    'alert', 'customer', 'ref', 'reference', 'upi', 'date', 'dated'
  ];
  if (v.length < 2 || v.length > 40) return false;
  if (blacklisted.includes(lower)) return false;
  return true;
}

function extractAccount(text: string): string {
  const acctMatch = text.match(/(?:A\/c|Acct|Account|Card)\s*(?:no\.?)?\s*([xX*]*\d{3,4})/i);
  if (acctMatch) {
    const num = acctMatch[1].replace(/^[xX*]+/, '');
    const bank = text.match(/(HDFC|SBI|ICICI|AXIS|KOTAK|PNB|BOB|CHASE|CITI|AMEX)/i);
    const bankName = bank ? `${bank[1].toUpperCase()} ` : '';
    return `${bankName}XX${num || '4921'}`;
  }

  if (/upi/i.test(text)) {
    return 'UPI Account';
  }

  return 'Bank Account';
}

function extractReference(text: string): string | undefined {
  const refPatterns = [
    /UPI\s*Ref(?:\s*no\.?)?\s*:?\s*(\d{6,14})/i,
    /Ref(?:\s*no\.?)?\s*:?\s*([A-Za-z0-9]{6,16})/i,
    /Txn\s*(?:Id|Ref)?\s*:?\s*([A-Za-z0-9]{6,16})/i,
    /rrn:?\s*(\d{6,14})/i,
  ];

  for (const p of refPatterns) {
    const match = text.match(p);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}

function extractDate(text: string, fallbackTimestamp?: number): string {
  const datePatterns = [
    /(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})/,
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/,
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/,
  ];

  for (const p of datePatterns) {
    const match = text.match(p);
    if (match) {
      try {
        const parsed = new Date(match[0]);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      } catch {
        // continue
      }
    }
  }

  if (fallbackTimestamp) {
    return new Date(fallbackTimestamp).toISOString();
  }

  return new Date().toISOString();
}

/**
 * Diagnostic scan result for a single SMS message
 */
export interface SingleScanDiagnostic {
  isFinancialTransaction: boolean;
  rawText: string;
  reason?: string;
  parsed?: ParsedSms;
}

/**
 * Scans a single SMS with detailed diagnostics
 */
export function scanSingleSmsWithDiagnostic(smsText: string, timestamp?: number): SingleScanDiagnostic {
  if (!smsText || smsText.trim().length < 10) {
    return {
      isFinancialTransaction: false,
      rawText: smsText,
      reason: 'Message text is too short or empty.',
    };
  }

  const noiseCheck = isPureOtpOrSpam(smsText);
  if (noiseCheck.isNoise) {
    return {
      isFinancialTransaction: false,
      rawText: smsText,
      reason: noiseCheck.reason,
    };
  }

  const amount = extractAmount(smsText);
  if (!amount) {
    return {
      isFinancialTransaction: false,
      rawText: smsText,
      reason: 'No monetary amount found in message (e.g. no INR, Rs, $, or debited/credited amount).',
    };
  }

  const type = detectTransactionType(smsText);
  const vendor = extractVendor(smsText, type);
  const category = categorizeVendor(vendor, type === 'credit');
  const accountDetails = extractAccount(smsText);
  const referenceId = extractReference(smsText);
  const date = extractDate(smsText, timestamp);

  const actionText = type === 'debit' ? 'Paid to' : 'Received from';
  const comment = `${actionText} ${vendor}${referenceId ? ` (Ref: ${referenceId})` : ''}`;

  const parsed: ParsedSms = {
    vendor,
    amount,
    type,
    category,
    accountDetails,
    referenceId,
    date,
    comment,
    rawSms: smsText.trim(),
    confidence: referenceId || accountDetails ? 'high' : 'medium',
  };

  return {
    isFinancialTransaction: true,
    rawText: smsText,
    parsed,
  };
}

/**
 * Parses a single SMS string into a structured ParsedSms object (or null)
 */
export function parseSingleSms(smsText: string, timestamp?: number): ParsedSms | null {
  const diag = scanSingleSmsWithDiagnostic(smsText, timestamp);
  return diag.isFinancialTransaction && diag.parsed ? diag.parsed : null;
}

/**
 * Full Batch Scan Diagnostic Report
 */
export interface BulkScanReport {
  totalScanned: number;
  transactionsFound: number;
  filteredNoiseCount: number;
  results: ParsedSms[];
  skippedItems: { text: string; reason: string }[];
}

/**
 * Scans every message in bulk input and returns a comprehensive scan report
 */
export function scanEverySmsWithReport(rawInput: string): BulkScanReport {
  const results: ParsedSms[] = [];
  const skippedItems: { text: string; reason: string }[] = [];
  let totalScanned = 0;

  if (!rawInput || !rawInput.trim()) {
    return { totalScanned: 0, transactionsFound: 0, filteredNoiseCount: 0, results: [], skippedItems: [] };
  }

  // 1. Android XML Format (SMS Backup & Restore)
  if (rawInput.includes('<sms') && rawInput.includes('body=')) {
    const smsRegex = /<sms\b([^>]+)\/>/gi;
    let match;
    while ((match = smsRegex.exec(rawInput)) !== null) {
      totalScanned++;
      const attrs = match[1];
      const bodyMatch = attrs.match(/body="([^"]+)"/i);
      const dateMatch = attrs.match(/date="(\d+)"/i);

      if (bodyMatch && bodyMatch[1]) {
        const body = bodyMatch[1]
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#10;/g, '\n');

        const timestamp = dateMatch ? parseInt(dateMatch[1], 10) : undefined;
        const diag = scanSingleSmsWithDiagnostic(body, timestamp);
        if (diag.isFinancialTransaction && diag.parsed) {
          results.push(diag.parsed);
        } else {
          skippedItems.push({ text: body.slice(0, 80) + '...', reason: diag.reason || 'Non-financial SMS' });
        }
      }
    }

    return {
      totalScanned,
      transactionsFound: results.length,
      filteredNoiseCount: skippedItems.length,
      results,
      skippedItems,
    };
  }

  // 2. JSON Format
  if (rawInput.trim().startsWith('[') || rawInput.trim().startsWith('{')) {
    try {
      const parsedJson = JSON.parse(rawInput);
      const list = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
      for (const item of list) {
        totalScanned++;
        const text = typeof item === 'string' ? item : (item.body || item.message || item.text || item.sms);
        if (text) {
          const diag = scanSingleSmsWithDiagnostic(text, item.date || item.timestamp);
          if (diag.isFinancialTransaction && diag.parsed) {
            results.push(diag.parsed);
          } else {
            skippedItems.push({ text: text.slice(0, 80) + '...', reason: diag.reason || 'Non-financial SMS' });
          }
        }
      }
      return {
        totalScanned,
        transactionsFound: results.length,
        filteredNoiseCount: skippedItems.length,
        results,
        skippedItems,
      };
    } catch {
      // fallback to text splitting
    }
  }

  // 3. Multi-line Text Format
  const blocks = rawInput.split(/\n\s*\n|(?=(?:HDFC|SBI|ICICI|AXIS|Dear Customer|Alert:|Txn of|Rs\.|INR|\$))/i);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length > 10) {
      totalScanned++;
      const diag = scanSingleSmsWithDiagnostic(trimmed);
      if (diag.isFinancialTransaction && diag.parsed) {
        results.push(diag.parsed);
      } else {
        skippedItems.push({ text: trimmed.slice(0, 80) + '...', reason: diag.reason || 'Non-financial SMS' });
      }
    }
  }

  return {
    totalScanned,
    transactionsFound: results.length,
    filteredNoiseCount: skippedItems.length,
    results,
    skippedItems,
  };
}

/**
 * Standard bulk parser convenience wrapper
 */
export function parseBulkSms(rawInput: string): ParsedSms[] {
  const report = scanEverySmsWithReport(rawInput);
  return report.results;
}
