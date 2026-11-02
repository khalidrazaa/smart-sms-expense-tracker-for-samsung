import React from 'react';
import {
  ListFilter,
  BarChart3,
  Plus,
  MessageSquareText,
  Settings,
} from 'lucide-react';

export type ActiveTab = 'ledger' | 'analytics' | 'sms' | 'settings';

interface BottomNavigationProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddModal,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors">
      <div className="max-w-md mx-auto grid grid-cols-5 items-center h-16 px-2">
        {/* Tab 1: Ledger */}
        <button
          onClick={() => onChangeTab('ledger')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'ledger'
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Ledger</span>
          {activeTab === 'ledger' && (
            <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full mt-0.5" />
          )}
        </button>

        {/* Tab 2: Analytics */}
        <button
          onClick={() => onChangeTab('analytics')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'analytics'
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Insights</span>
          {activeTab === 'analytics' && (
            <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full mt-0.5" />
          )}
        </button>

        {/* Center Floating Action: Add Cash Spend */}
        <div className="flex items-center justify-center">
          <button
            onClick={onOpenAddModal}
            className="w-12 h-12 -mt-4 rounded-full bg-gradient-to-tr from-sky-500 via-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/35 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-slate-900"
            title="Add Cash Spending"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: SMS Sync */}
        <button
          onClick={() => onChangeTab('sms')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'sms'
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquareText className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">SMS Sync</span>
          {activeTab === 'sms' && (
            <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full mt-0.5" />
          )}
        </button>

        {/* Tab 4: Settings */}
        <button
          onClick={() => onChangeTab('settings')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'text-sky-600 dark:text-sky-400'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Settings</span>
          {activeTab === 'settings' && (
            <span className="w-1 h-1 bg-sky-600 dark:bg-sky-400 rounded-full mt-0.5" />
          )}
        </button>
      </div>
    </nav>
  );
};
