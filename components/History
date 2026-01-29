
import React from 'react';
import { HistoryEntry } from '../types';
import { Button } from './Button';

interface HistoryProps {
  history: HistoryEntry[];
  onClear: () => void;
}

export const History: React.FC<HistoryProps> = ({ history, onClear }) => {
  const totalProfit = history.reduce((acc, curr) => acc + curr.utilidad, 0);
  const totalSales = history.reduce((acc, curr) => acc + curr.totalVenta, 0);

  return (
    <div className="space-y-6">
      {/* Resumen de Ventas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm mb-1 uppercase tracking-tight font-semibold">Ventas Acumuladas</p>
          <p className="text-3xl font-bold text-slate-900">${totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
          <p className="text-green-600 text-sm mb-1 uppercase tracking-tight font-semibold">Utilidad Total</p>
          <p className="text-3xl font-bold text-green-700">${totalProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Tabla de Historial */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-800">Registros en Google Sheets (Simulado)</h3>
          <Button variant="ghost" className="text-red-500 text-xs" onClick={onClear}>Limpiar Historial</Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-bold">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Markup</th>
                <th className="px-6 py-4">Utilidad</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Sin historial registrado.</td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm whitespace-nowrap">{new Date(entry.fecha).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium">{entry.cliente}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-bold">{entry.markupAplicado}%</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">${entry.utilidad.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-right font-bold">${entry.totalVenta.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
