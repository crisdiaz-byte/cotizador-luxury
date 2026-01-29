
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { FactoryItem, QuoteItem, HistoryEntry, Measurement } from '../types';
import { parseFactoryData } from '../services/geminiService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Catálogo actualizado solicitado por el usuario
const CATALOGO = {
  persianas: ["ENROLLABLE", "SHEER", "PANEL JAPONES"],
  tipoTelas: ["BLACKOUT", "TRASLUCIDA", "SCREEN", "SEMITRASLUCIDA", "SEMI BLACK OUT"],
  nombreTelas: [
    "Β.Ο. 500", "Β.Ο. IPANEMA", "B.O. LONG BEACH", "B.O. LUXURY", "B.O. MONTREAL", 
    "B.O. SIDNEY", "B.O. BUDELLI", "BO TEXTURE", "BO OHIO", "DUO BASIC", 
    "DUOLINE DIM OUT", "DUO WOODLINE", "DUO CELEBRITY", "DUO DIM OUT SOFT", 
    "DUO TERRA", "DUO BRIGHT", "DUO DIM OUT WOODS", "DUO SEASON", "F.L. IPANEMA", 
    "F.L. LONG BEACH", "F.L SIDNEY", "F.L. BUDELLI", "SCREEN BASIC", "SCREEN SOFT", 
    "SCREEN MILAN", "SCREEN ONE", "GALAXY BLACK OUT", "F.L. BERLIN", "SHEER ADVANTAGE", 
    "DUO DENSE WOODLOOK", "DUO ROYAL DIM OUT", "DUO LINO DIM OUT", "DUO GENIUS DIM OUT", 
    "Duo Radiance", "Dim out Glam", "Fl Fresh", "Bo Stylus", "Brave"
  ],
  ubicaciones: ["SALA", "COMEDOR", "COCINA", "RECAMARA PRINCIPAL", "RECAMARA 1", "RECAMARA 2", "ESTUDIO", "BAÑO", "PASILLO", "TERRAZA"]
};

const COSTO_INSTALACION_POR_PIEZA = 250; // Costo interno base por cada persiana

interface QuoteFormProps {
  onSaveHistory: (entry: HistoryEntry) => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ onSaveHistory }) => {
  // --- Paso 1: Config ---
  const [clientName, setClientName] = useState('');
  const [markup, setMarkup] = useState(30);

  // --- Paso 2: Medidas ---
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentMeasure, setCurrentMeasure] = useState<Partial<Measurement>>({
    tipoPersiana: CATALOGO.persianas[0],
    tipoTela: CATALOGO.tipoTelas[0],
    nombreTela: CATALOGO.nombreTelas[0],
    color: '',
    ladoMecanismo: 'Derecho',
    ancho: 0,
    alto: 0,
    ubicacion: CATALOGO.ubicaciones[0]
  });

  // --- Paso 3: Fábrica ---
  const [factoryItems, setFactoryItems] = useState<FactoryItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // --- Paso 4: Ajustes, Notas y Cierre ---
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  const [installation, setInstallation] = useState(0);
  const [scaffolding, setScaffolding] = useState(0);
  const [viaticos, setViaticos] = useState(0);
  const [commission, setCommission] = useState(0);
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-calcular instalación cuando cambian los items seleccionados
  useEffect(() => {
    const totalQty = selectedItems.reduce((acc, item) => acc + item.cantidad, 0);
    setInstallation(totalQty * COSTO_INSTALACION_POR_PIEZA);
  }, [selectedItems]);

  const addMeasurement = () => {
    if (!currentMeasure.ancho || !currentMeasure.alto) return;
    const mt2 = Number((Number(currentMeasure.ancho) * Number(currentMeasure.alto)).toFixed(2));
    const newM: Measurement = {
      ...currentMeasure as any,
      id: Date.now().toString(),
      no: measurements.length + 1,
      ancho: Number(currentMeasure.ancho),
      alto: Number(currentMeasure.alto),
      mt2
    };
    setMeasurements([...measurements, newM]);
    setCurrentMeasure({ ...currentMeasure, ancho: 0, alto: 0, color: '' });
  };

  const removeMeasurement = (id: string) => {
    const filtered = measurements.filter(m => m.id !== id);
    setMeasurements(filtered.map((m, idx) => ({ ...m, no: idx + 1 })));
  };

  const handleFactoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const parsed = await parseFactoryData(text);
      setFactoryItems(parsed.map((item: any, idx: number) => ({ ...item, id: `f-${idx}-${Date.now()}` })));
      setIsParsing(false);
    };
    reader.readAsText(file);
  };

  const addItemToQuote = (item: FactoryItem) => {
    const precioVenta = item.costoBase * (1 + markup / 100);
    const newItem: QuoteItem = { ...item, id: `q-${Date.now()}-${item.id}`, cantidad: 1, precioVenta };
    setSelectedItems(prev => [...prev, newItem]);
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setSelectedItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => setSelectedItems(prev => prev.filter(item => item.id !== id));

  // --- Cálculos Internos ---
  const totalQty = selectedItems.reduce((acc, item) => acc + item.cantidad, 0);
  
  const calculateSubtotalBase = () => {
    return selectedItems.reduce((acc, item) => {
      const price = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
      return acc + (price * item.cantidad);
    }, 0);
  };

  const calculateTotalFactoryCost = () => {
    return selectedItems.reduce((acc, item) => acc + (item.costoBase * item.cantidad), 0);
  };

  // Total Real Interno (Lo que el sistema registra para utilidad)
  const totalFinalInterno = calculateSubtotalBase() + installation + scaffolding + viaticos + commission;
  const utilidadReal = totalFinalInterno - (calculateTotalFactoryCost() + installation + scaffolding + viaticos + commission);

  const generateFinalPDF = async () => {
    setIsGenerating(true);
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN DE SISTEMAS', 105, 25, { align: 'center' });
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(`CLIENTE: ${clientName.toUpperCase() || 'CLIENTE GENERAL'}`, 20, 50);
    doc.text(`FECHA: ${new Date().toLocaleDateString()}`, 20, 55);

    // Lógica de Prorrateo para el Cliente
    // Monto a esconder (Instalación + Andamios) / Total piezas
    const montoOculto = installation + scaffolding;
    const cargoPorPieza = totalQty > 0 ? (montoOculto / totalQty) : 0;

    const tableData = selectedItems.map(item => {
      const basePrice = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
      // El cliente ve el precio base + el prorrateo de instalación/andamios
      const precioUnitarioVisible = basePrice + cargoPorPieza;
      return [
        item.descripcion,
        item.cantidad,
        `$${precioUnitarioVisible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        `$${(precioUnitarioVisible * item.cantidad).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: 65,
      head: [['Descripción del Producto', 'Cant.', 'Precio Unitario', 'Total']],
      body: tableData,
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.cursor.y + 15;

    // Resumen de totales visibles (Solo Viáticos aparte, lo demás está prorrateado arriba)
    let cursorY = finalY;
    if (viaticos > 0) {
      doc.setFontSize(10);
      doc.text(`Viáticos y Traslados:`, 140, cursorY);
      doc.text(`$${viaticos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 190, cursorY, { align: 'right' });
      cursorY += 8;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    // El total del cliente es: Subtotal Base + Instalación + Andamios + Viáticos
    const totalClienteVisible = calculateSubtotalBase() + installation + scaffolding + viaticos;
    doc.text(`TOTAL FINAL:`, 140, cursorY + 5);
    doc.text(`$${totalClienteVisible.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 190, cursorY + 5, { align: 'right' });

    // Notas manuales al final
    if (notes) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("NOTAS ADICIONALES:", 20, cursorY + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(notes, 170);
      doc.text(splitNotes, 20, cursorY + 27);
    }

    doc.save(`Cotizacion_${clientName.replace(/\s+/g, '_') || 'Pedido'}.pdf`);
    
    onSaveHistory({
      id: Math.random().toString(36).substr(2, 9),
      fecha: new Date().toISOString(),
      cliente: clientName || 'Sin Nombre',
      totalVenta: totalFinalInterno,
      utilidad: utilidadReal,
      markupAplicado: markup,
      items: selectedItems.length
    });
    setIsGenerating(false);
  };

  return (
    <div className="space-y-8 pb-32">
      {/* PASO 1: CLIENTE Y MARGEN */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
          Datos de la Cotización
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre del Cliente</label>
            <input 
              type="text" 
              className="w-full px-4 py-2 bg-slate-50 border rounded-lg focus:ring-2 ring-blue-500 outline-none" 
              placeholder="Ej: Juan Pérez"
              value={clientName} 
              onChange={e => setClientName(e.target.value)} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Margen de Utilidad ({markup}%)</label>
            <input 
              type="range" min="0" max="200" step="5" 
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              value={markup} 
              onChange={e => setMarkup(Number(e.target.value))} 
            />
          </div>
        </div>
      </section>

      {/* PASO 2: LEVANTAMIENTO */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <span className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
          Levantamiento de Medidas
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl mb-6 border">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">Tipo de Persiana</label>
            <select 
              className="w-full p-2 text-sm border rounded-lg bg-white" 
              value={currentMeasure.tipoPersiana} 
              onChange={e => setCurrentMeasure({...currentMeasure, tipoPersiana: e.target.value})}
            >
              {CATALOGO.persianas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Ancho (m)</label>
            <input type="number" className="w-full p-2 text-sm border rounded-lg" value={currentMeasure.ancho || ''} onChange={e => setCurrentMeasure({...currentMeasure, ancho: Number(e.target.value)})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Alto (m)</label>
            <input type="number" className="w-full p-2 text-sm border rounded-lg" value={currentMeasure.alto || ''} onChange={e => setCurrentMeasure({...currentMeasure, alto: Number(e.target.value)})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Tipo de Tela</label>
            <select 
              className="w-full p-2 text-sm border rounded-lg bg-white" 
              value={currentMeasure.tipoTela} 
              onChange={e => setCurrentMeasure({...currentMeasure, tipoTela: e.target.value})}
            >
              {CATALOGO.tipoTelas.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Nombre de Tela</label>
            <select 
              className="w-full p-2 text-sm border rounded-lg bg-white" 
              value={currentMeasure.nombreTela} 
              onChange={e => setCurrentMeasure({...currentMeasure, nombreTela: e.target.value})}
            >
              {CATALOGO.nombreTelas.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Color</label>
            <input className="w-full p-2 text-sm border rounded-lg" placeholder="Blanco" value={currentMeasure.color} onChange={e => setCurrentMeasure({...currentMeasure, color: e.target.value})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Mecanismo</label>
            <select className="w-full p-2 text-sm border rounded-lg bg-white" value={currentMeasure.ladoMecanismo} onChange={e => setCurrentMeasure({...currentMeasure, ladoMecanismo: e.target.value as any})}>
              <option value="Derecho">Derecho</option>
              <option value="Izquierdo">Izquierdo</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase">Ubicación</label>
            <select 
              className="w-full p-2 text-sm border rounded-lg bg-white" 
              value={currentMeasure.ubicacion} 
              onChange={e => setCurrentMeasure({...currentMeasure, ubicacion: e.target.value})}
            >
              {CATALOGO.ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <Button variant="primary" className="h-[38px] mt-auto font-bold" onClick={addMeasurement}>Añadir Fila</Button>
        </div>

        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-[10px] text-left">
            <thead className="bg-slate-100 text-slate-500 uppercase font-bold border-b">
              <tr>
                <th className="px-3 py-2">No</th>
                <th className="px-3 py-2">Medidas</th>
                <th className="px-3 py-2">MT2</th>
                <th className="px-3 py-2">Persiana</th>
                <th className="px-3 py-2">Tela / Color</th>
                <th className="px-3 py-2">Mec.</th>
                <th className="px-3 py-2">Ubicación</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {measurements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{m.no}</td>
                  <td className="px-3 py-2 font-bold">{m.ancho} x {m.alto}</td>
                  <td className="px-3 py-2 font-bold text-blue-600">{m.mt2}</td>
                  <td className="px-3 py-2">{m.tipoPersiana}</td>
                  <td className="px-3 py-2">{m.tipoTela} - {m.nombreTela} ({m.color})</td>
                  <td className="px-3 py-2">{m.ladoMecanismo}</td>
                  <td className="px-3 py-2">{m.ubicacion}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => removeMeasurement(m.id)} className="text-red-500 font-bold hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* PASO 3: FÁBRICA */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">3</span>
          Costos de Fábrica
        </h3>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 relative group hover:border-purple-400 transition-colors">
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFactoryUpload} />
          <p className="text-slate-500 text-sm font-medium">Carga el presupuesto recibido de fábrica</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">La IA extraerá costos unitarios</p>
        </div>
        
        {isParsing && <div className="mt-4 text-purple-600 text-xs font-bold animate-pulse text-center uppercase tracking-widest">Analizando Costos...</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {factoryItems.map(item => (
            <div key={item.id} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm hover:ring-2 ring-purple-100 transition-all">
              <div className="flex-1 overflow-hidden pr-2">
                <p className="text-xs font-bold truncate">{item.descripcion}</p>
                <p className="text-[10px] text-slate-400 font-bold">Costo Base: ${item.costoBase}</p>
              </div>
              <Button variant="secondary" className="h-7 px-3 text-[10px] font-bold" onClick={() => addItemToQuote(item)}>Añadir</Button>
            </div>
          ))}
        </div>
      </section>

      {/* PASO 4: AJUSTES E INDIRECTOS */}
      <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
            <span className="bg-white text-slate-900 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">4</span>
            Ajustes Finales e Indirectos
          </h3>
          
          <div className="space-y-4 mb-10">
            {selectedItems.map(item => {
              const currentPrice = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
              return (
                <div key={item.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
                  <div className="flex-1 text-center md:text-left">
                    <p className="font-bold text-sm">{item.descripcion}</p>
                    <p className="text-[10px] text-blue-400 font-bold mt-1">Sugerido con {markup}%: ${item.precioVenta.toFixed(2)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full md:w-64">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Cantidad</label>
                      <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm text-center font-bold" value={item.cantidad} onChange={e => updateItem(item.id, { cantidad: Number(e.target.value) })} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">P. Unitario</label>
                      <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm text-center font-black text-green-400" value={currentPrice} onChange={e => updateItem(item.id, { precioVentaManual: Number(e.target.value) })} />
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id)} className="text-white/20 hover:text-red-400 p-2 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 border-t border-white/10 pt-10">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Instalación ($)</label>
              <input type="number" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl focus:bg-white/10 outline-none transition-all" value={installation} onChange={e => setInstallation(Number(e.target.value))} />
              <p className="text-[8px] text-slate-500 mt-1">* Auto-calculado: {totalQty} x ${COSTO_INSTALACION_POR_PIEZA}</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Viáticos ($)</label>
              <input type="number" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl focus:bg-white/10 outline-none transition-all" value={viaticos} onChange={e => setViaticos(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Andamios ($)</label>
              <input type="number" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl focus:bg-white/10 outline-none transition-all" value={scaffolding} onChange={e => setScaffolding(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Comisión ($)</label>
              <input type="number" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl focus:bg-white/10 outline-none transition-all" value={commission} onChange={e => setCommission(Number(e.target.value))} />
              <p className="text-[8px] text-slate-500 mt-1">* Solo para utilidad interna</p>
            </div>
          </div>

          <div className="mb-10">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Notas Manuales (Visibles en PDF)</label>
            <textarea 
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:bg-white/10 outline-none transition-all text-sm min-h-[100px] resize-none font-medium"
              placeholder="Escribe aquí aclaraciones, tiempos de entrega, etc..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-inner">
            <div className="text-center md:text-left">
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Total de Venta (Cliente)</p>
              <h2 className="text-6xl font-black tracking-tighter">${(calculateSubtotalBase() + installation + scaffolding + viaticos).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
              <p className="text-[9px] text-white/30 uppercase mt-2 font-bold tracking-tight">* Instalación y Andamios prorrateados por sistema en el PDF</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-2xl text-center min-w-[220px]">
              <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">Utilidad Neta Real</p>
              <p className="text-3xl font-black text-emerald-400">${utilidadReal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="mt-12">
            <Button 
              variant="primary" 
              className="w-full py-6 text-2xl font-black bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-2xl shadow-blue-900/40 transform active:scale-[0.98] transition-all"
              onClick={generateFinalPDF}
              isLoading={isGenerating}
              disabled={selectedItems.length === 0}
            >
              Generar Cotización PDF Final
            </Button>
          </div>
        </div>
        
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 blur-[120px] -z-0 pointer-events-none"></div>
      </section>
    </div>
  );
};
