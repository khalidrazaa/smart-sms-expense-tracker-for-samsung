import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquareText,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileCode,
  Smartphone,
  Play,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { SAMPLE_SMS_MESSAGES, SampleSmsItem } from '../data/sampleSmsMessages';
import {
  parseSingleSms,
  scanEverySmsWithReport,
  scanSingleSmsWithDiagnostic,
  SingleScanDiagnostic,
} from '../services/smsParser';
import { ParsedSms } from '../types';
import { getCategoryIcon } from './TransactionList';

interface SmsSyncModalProps {
  isOpen: boolean;
  currency: string;
  onClose: () => void;
  onImportParsedList: (list: ParsedSms[]) => number;
}

export const SmsSyncModal: React.FC<SmsSyncModalProps> = ({
  isOpen,
  currency,
  onClose,
  onImportParsedList,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'paste' | 'simulator' | 'file' | 'diagnostic' | 'guide'>('paste');
  const [inputText, setInputText] = useState('');
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Diagnostic Test Input
  const [testSmsInput, setTestSmsInput] = useState('HDFC Bank: Rs. 1,499.00 debited from A/c **4921 on 02-Nov-26 at AMAZON INDIA.');
  const [diagnosticResult, setDiagnosticResult] = useState<SingleScanDiagnostic>(() => {
    return scanSingleSmsWithDiagnostic('HDFC Bank: Rs. 1,499.00 debited from A/c **4921 on 02-Nov-26 at AMAZON INDIA.');
  });

  // Bulk scan report
  const bulkScanReport = useMemo(() => {
    if (!inputText.trim()) return null;
    return scanEverySmsWithReport(inputText);
  }, [inputText]);

  const handleCommitImport = () => {
    if (!bulkScanReport || bulkScanReport.results.length === 0) return;
    const addedCount = onImportParsedList(bulkScanReport.results);
    setImportFeedback(`Successfully scanned ${bulkScanReport.totalScanned} SMS: Added ${addedCount} records to ledger!`);
    setInputText('');
    setTimeout(() => {
      setImportFeedback(null);
      onClose();
    }, 1500);
  };

  const handleSimulateSingle = (item: SampleSmsItem) => {
    setInputText(item.body);
    setActiveTab('paste');
  };

  const handleImportAllSimulator = () => {
    const allParsed: ParsedSms[] = [];
    for (const item of SAMPLE_SMS_MESSAGES) {
      const p = parseSingleSms(item.body);
      if (p) allParsed.push(p);
    }
    const added = onImportParsedList(allParsed);
    setImportFeedback(`Imported ${added} test transactions from bank simulator!`);
    setTimeout(() => {
      setImportFeedback(null);
      onClose();
    }, 1400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
        setActiveTab('paste');
      }
    };
    reader.readAsText(file);
  };

  const handleRunDiagnostic = (text: string) => {
    setTestSmsInput(text);
    setDiagnosticResult(scanSingleSmsWithDiagnostic(text));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar flex flex-col transition-colors">
        {/* Grab Handle */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700/80 rounded-full mx-auto my-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                SMS Transaction Reader & Sync
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Scans 100% of SMS messages to filter transactions from noise
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4 pt-2 overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'paste'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Scan & Paste SMS
          </button>
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'diagnostic'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-sky-500" />
            Scan Verification
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Bank Presets
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Android XML Dump
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Samsung A57 Guide
          </button>
        </div>

        {/* Feedback Banner */}
        {importFeedback && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{importFeedback}</span>
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* TAB 1: PASTE SMS */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Paste Single or Bulk SMS (Every message is inspected)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setInputText(
                        'HDFC Bank: Rs. 1,499.00 debited from A/c **4921 on 02-Nov-26 at AMAZON INDIA. Avl Bal: Rs. 42,150.00.\n\nYour OTP for food order login is 839210. Do not share with anyone.\n\nICICI Bank Acct XX902 is credited with INR 85,000.00 on 01-Nov-26 by SALARY TECH CORP PVT LTD.'
                      );
                    }}
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium"
                  >
                    Paste mixed batch (Bank + OTP)
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste any SMS messages here... Every message will be scanned. Valid financial transactions are added, and OTPs/ads are cleanly skipped."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono leading-relaxed transition-colors"
                />
              </div>

              {/* Scan Summary Banner */}
              {bulkScanReport && (
                <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                      Scan Summary Report
                    </span>
                    <span className="text-sky-600 dark:text-sky-400 font-bold">
                      {bulkScanReport.totalScanned} SMS Scanned
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300">
                      <div className="font-bold">{bulkScanReport.transactionsFound} Valid Transactions</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Ready to record</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      <div className="font-bold">{bulkScanReport.filteredNoiseCount} Filtered Out</div>
                      <div className="text-[10px]">OTPs & non-financial msgs</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Parsed Preview */}
              {bulkScanReport && bulkScanReport.results.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                    Detected Transactions to Add:
                  </span>

                  <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                    {bulkScanReport.results.map((item, idx) => {
                      const isDebit = item.type === 'debit';
                      return (
                        <div
                          key={idx}
                          className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-850 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.vendor}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {item.category} · {item.accountDetails || 'Bank A/c'}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div
                              className={`font-mono font-bold ${
                                isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isDebit ? '-' : '+'}
                              {currency}
                              {item.amount.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                              })}
                            </div>
                            <span
                              className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                                isDebit
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {isDebit ? 'Debit' : 'Credit'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleCommitImport}
                    className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 cursor-pointer min-h-[46px]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Add {bulkScanReport.results.length} Record{bulkScanReport.results.length > 1 ? 's' : ''} to Ledger
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCAN VERIFICATION & DIAGNOSTICS */}
          {activeTab === 'diagnostic' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800 dark:text-sky-300">
                  <ShieldCheck className="w-4 h-4 text-sky-500" />
                  Confirmation: Every SMS is Inspected
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every SMS provided to SpendTracker is scanned through our multi-stage inspection engine. If an SMS contains financial spending/earning, it creates a record. If it is an OTP or personal chat, it is cleanly filtered out to keep your ledger pristine.
                </p>
              </div>

              {/* Live Interactive Scanner Tester */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Live Scanner Tester (Paste Any SMS to Test)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testSmsInput}
                    onChange={(e) => handleRunDiagnostic(e.target.value)}
                    placeholder="Enter or paste any SMS text here to see how it's scanned..."
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* Quick Presets to Test Scanner */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">Try test:</span>
                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic('HDFC Bank: Rs. 1,499.00 debited from A/c **4921 on 02-Nov-26 at AMAZON INDIA.')}
                    className="px-2 py-1 text-[10px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-sky-500 shrink-0"
                  >
                    Bank Debit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic('ICICI Bank Acct XX902 is credited with INR 85,000.00 by SALARY CORP.')}
                    className="px-2 py-1 text-[10px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-emerald-500 shrink-0"
                  >
                    Salary Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic('Your OTP is 492102 for login to Samsung Account. Do not share.')}
                    className="px-2 py-1 text-[10px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-500 shrink-0"
                  >
                    Login OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRunDiagnostic('Hey Khalid, are we still meeting for lunch today at 1 PM?')}
                    className="px-2 py-1 text-[10px] rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-500 shrink-0"
                  >
                    Friend SMS
                  </button>
                </div>

                {/* Inspection Card */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Scanner Status:
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        diagnosticResult.isFinancialTransaction
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50'
                          : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50'
                      }`}
                    >
                      {diagnosticResult.isFinancialTransaction ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Financial Transaction Recognized</span>
                        </>
                      ) : (
                        <>
                          <Filter className="w-3.5 h-3.5" />
                          <span>Filtered Out / Non-Financial</span>
                        </>
                      )}
                    </span>
                  </div>

                  {diagnosticResult.isFinancialTransaction && diagnosticResult.parsed ? (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {diagnosticResult.parsed.type === 'debit' ? '-' : '+'}
                          {currency}
                          {diagnosticResult.parsed.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vendor:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {diagnosticResult.parsed.vendor}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Type:</span>
                        <span className="font-semibold uppercase text-slate-900 dark:text-white">
                          {diagnosticResult.parsed.type === 'debit' ? 'Debit (Spending)' : 'Credit (Earning)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Category:</span>
                        <span className="text-slate-900 dark:text-white">
                          {diagnosticResult.parsed.category}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account:</span>
                        <span className="text-slate-900 dark:text-white">
                          {diagnosticResult.parsed.accountDetails}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                      <span className="text-slate-500 block mb-0.5">Filter Reason:</span>
                      <p className="text-amber-800 dark:text-amber-300 font-medium">
                        {diagnosticResult.reason}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANK SMS SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Test Bank SMS Library
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tap any message to test the parsing engine with realistic bank SMS alerts
                  </p>
                </div>
                <button
                  onClick={handleImportAllSimulator}
                  className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-600/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-600/30 rounded-lg text-[11px] font-semibold border border-sky-200 dark:border-sky-500/30 shrink-0"
                >
                  Import All 10
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                {SAMPLE_SMS_MESSAGES.map((item) => {
                  const isDebit = item.type === 'debit';
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 px-1.5 py-0.5 rounded">
                            {item.bankName}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                            {item.previewTitle}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-bold font-mono ${
                            isDebit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isDebit ? '-' : '+'}
                          {currency}
                          {item.expectedAmount.toFixed(2)}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-900/60 p-2 rounded border border-slate-200 dark:border-slate-850">
                        {item.body}
                      </p>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleSimulateSingle(item)}
                          className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-[11px] font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                        >
                          <Play className="w-3 h-3 text-sky-500" />
                          Load in Parser
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: FILE UPLOAD (Android SMS Backup XML) */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-850 flex items-center justify-center mx-auto text-sky-500 border border-slate-200 dark:border-slate-800">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                    Scan Full Android SMS Inbox (.xml)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm mx-auto">
                    Every SMS in your backup file will be scanned automatically. Financial debits/credits will be logged into your ledger.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md shadow-sky-600/20">
                  <FileCode className="w-4 h-4" />
                  <span>Choose SMS Backup File (.xml / .json)</span>
                  <input
                    type="file"
                    accept=".xml,.json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="bg-slate-100 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-850 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <span className="font-semibold text-slate-800 dark:text-slate-300 block">How every SMS is scanned:</span>
                <p>1. Open "SMS Backup & Restore" app on your Samsung A57.</p>
                <p>2. Tap "Back Up Now" (exports all SMS into a single .xml file).</p>
                <p>3. Upload it here: SpendTracker scans every single SMS in the file, logs all debits and credits, and ignores non-financial chatter.</p>
              </div>
            </div>
          )}

          {/* TAB 5: SAMSUNG GALAXY A57 SETUP GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  How SMS Scanning Works on Samsung A57
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Samsung and Android enforce a security sandbox: no web app is permitted to invisibly read your private SMS in the background without user interaction (to protect your bank OTPs from rogue websites). Here is how you get 100% of your SMS scanned:
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-600/30 text-sky-600 dark:text-sky-400 text-[11px] flex items-center justify-center font-bold">1</span>
                    Instant Notification Copy (Daily Routine)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
                    Whenever an SMS arrives on your Samsung A57, tap "Copy" on the notification shade. In SpendTracker, tap "Read / Sync SMS" and paste. The scanner parses it in 0.1 seconds.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-600/30 text-sky-600 dark:text-sky-400 text-[11px] flex items-center justify-center font-bold">2</span>
                    Full Inbox Scan (Weekly / Monthly)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-6.5">
                    Export your full inbox via standard Android SMS Backup & Restore. SpendTracker scans every single SMS in the file, automatically skips non-financial messages, and prevents duplicate records.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
