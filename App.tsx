
import React, { useState, useEffect } from 'react';
import { QuoteForm } from './components/QuoteForm';
import { History } from './components/History';
import { AppTab, HistoryEntry } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.NEW_QUOTE);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Local storage used to persist "History" (Simulating Google Sheets persistency in a frontend sandbox)
  useEffect(() => {
    const saved = localStorage.getItem('persianas_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (entry: HistoryEntry) => {
    const updated = [entry, ...history];
    setHistory(updated);
    localStorage.setItem('persianas_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('persianas_history');
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 px-4 py-4 md:px-8 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              P
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Cotizador Pro</h1>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Persianas & Cortinas</p>
            </div>
          </div>
          
          <nav className="hidden md:flex bg-slate-100 p-1 rounded-xl">
            <button 
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === AppTab.NEW_QUOTE ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab(AppTab.NEW_QUOTE)}
            >
              Nueva Cotización
            </button>
            <button 
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === AppTab.HISTORY ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab(AppTab.HISTORY)}
            >
              Historial de Ventas
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 pt-8">
        {activeTab === AppTab.NEW_QUOTE ? (
          <QuoteForm onSaveHistory={saveToHistory} />
        ) : (
          <History history={history} onClear={clearHistory} />
        )}
      </main>

      {/* Mobile Navigation (Sticky Bottom) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex justify-around p-2 z-50">
        <button 
          onClick={() => setActiveTab(AppTab.NEW_QUOTE)}
          className={`flex flex-col items-center p-2 transition-colors ${activeTab === AppTab.NEW_QUOTE ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
          <span className="text-[10px] mt-1 font-bold">Nueva</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.HISTORY)}
          className={`flex flex-col items-center p-2 transition-colors ${activeTab === AppTab.HISTORY ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span className="text-[10px] mt-1 font-bold">Historial</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
