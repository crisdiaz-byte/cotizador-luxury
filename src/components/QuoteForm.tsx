import React, { useState } from 'react';
import { Button } from './Button';
import { FactoryItem, QuoteItem, HistoryEntry, Measurement } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface QuoteFormProps {
  onSaveHistory: (entry: HistoryEntry) => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ onSaveHistory }) => {
  // --- Paso 1: Config ---
  const [clientName, setClientName] = useState('');
  const [markup, setMarkup] = useState(30);

  // --- Paso 2: Medidas (Formato Columnas) ---
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentMeasure, setCurrentMeasure] = useState<Partial<Measurement>>({
    tipoPersiana: '',
    tipoTela: '',
    nombreTela: '',
    color: '',
    ladoMecanismo: 'Derecho',
    ancho: 0,
    alto: 0,
    ubicacion: ''
  });

  // --- Paso 3: Fábrica ---
  const [factoryItems, setFactoryItems] = useState<FactoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Paso 4: Ajustes y Cierre ---
  const [selectedItems, setSelectedItems] = useState<QuoteItem[]>([]);
  
  // Instalación
  const [installQty, setInstallQty] = useState(0);
  const [installCostUnit, setInstallCostUnit] = useState(0);
  
  // Andamios
  const [scaffoldQty, setScaffoldQty] = useState(0);
  const [scaffoldCostUnit, setScaffoldCostUnit] = useState(0);
  
  // Comisión
  const [commissionQty, setCommissionQty] = useState(0);
  const [commissionCostUnit, setCommissionCostUnit] = useState(0);
  
  // Viáticos (va directo a cotización)
  const [viaticos, setViaticos] = useState(0);
  
  const [isGenerating, setIsGenerating] = useState(false);

  // --- Cálculos de extras ---
  const totalInstall = installQty * installCostUnit;
  const totalScaffold = scaffoldQty * scaffoldCostUnit;
  const totalCommission = commissionQty * commissionCostUnit;
  const totalExtras = totalInstall + totalScaffold + totalCommission;
  
  // Costo extra por partida (se reparte entre todas las partidas)
  const extraPerItem = selectedItems.length > 0 ? totalExtras / selectedItems.length : 0;

  // --- Handlers Paso 2 ---
  const addMeasurement = () => {
    if (!currentMeasure.tipoPersiana || !currentMeasure.ancho || !currentMeasure.alto) return;
    const ancho = Number(currentMeasure.ancho);
    const alto = Number(currentMeasure.alto);
    const mt2 = Number((ancho * alto).toFixed(2));
    
    const newM: Measurement = {
      ...currentMeasure as any,
      id: Date.now().toString(),
      no: measurements.length + 1,
      ancho,
      alto,
      mt2
    };

    setMeasurements([...measurements, newM]);
    setCurrentMeasure({
      tipoPersiana: '',
      tipoTela: '',
      nombreTela: '',
      color: '',
      ladoMecanismo: 'Derecho',
      ancho: 0,
      alto: 0,
      ubicacion: ''
    });
  };

  const removeMeasurement = (id: string) => {
    const filtered = measurements.filter(m => m.id !== id);
    setMeasurements(filtered.map((m, idx) => ({ ...m, no: idx + 1 })));
  };

  const downloadPreQuote = () => {
    const doc = new jsPDF({ orientation: 'landscape' }) as any;
    doc.setFontSize(18);
    doc.text('PRE-COTIZACIÓN PARA FÁBRICA', 148, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Cliente: ${clientName || 'General'}`, 15, 25);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 30);

    const tableData = measurements.map(m => [
      m.no, m.ancho, m.alto, m.mt2, m.tipoPersiana, m.tipoTela, m.nombreTela, m.color, m.ladoMecanismo, m.ubicacion
    ]);

    doc.autoTable({
      startY: 35,
      head: [['No', 'Ancho', 'Alto', 'MT2', 'Tipo Persiana', 'Tipo Tela', 'Nombre Tela', 'Color', 'Mec.', 'Ubicación']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [51, 65, 85] }
    });

    doc.save(`PreCotizacion_Fabrica_${clientName || 'Cliente'}.pdf`);
  };

  const downloadPreQuoteExcel = () => {
    const data = measurements.map(m => ({
      'No': m.no,
      'Ancho': m.ancho,
      'Alto': m.alto,
      'MT2': m.mt2,
      'Tipo Persiana': m.tipoPersiana,
      'Tipo Tela': m.tipoTela,
      'Nombre Tela': m.nombreTela,
      'Color': m.color,
      'Mecanismo': m.ladoMecanismo,
      'Ubicación': m.ubicacion
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PreCotizacion');
    XLSX.writeFile(wb, `PreCotizacion_Fabrica_${clientName || 'Cliente'}.xlsx`);
  };

  // --- Handler Paso 3: Cargar Excel de Fábrica (SIN IA - Instantáneo) ---
  const handleFactoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const items: FactoryItem[] = jsonData
          .filter((row: any) => row['PRECIO'] || row['Precio'] || row['precio'])
          .map((row: any, idx: number) => {
            const precio = row['PRECIO'] || row['Precio'] || row['precio'] || 0;
            const ubicacion = row['UBICACIÓN'] || row['Ubicación'] || row['ubicacion'] || row['UBICACION'] || '';
            const tipoPersiana = row['T.PERSIANA'] || row['T. PERSIANA'] || row['Tipo Persiana'] || row['TIPO PERSIANA'] || '';
            const modelo = row['MODELO'] || row['Modelo'] || '';
            const color = row['COLOR'] || row['Color'] || '';
            const ancho = row['ANCHO'] || row['Ancho'] || '';
            const alto = row['ALTO'] || row['Alto'] || '';
            const m2 = row['M2'] || row['m2'] || '';
            
            // Limpiar precio (quitar $, comas, etc.)
            const precioNum = typeof precio === 'string' 
              ? parseFloat(precio.replace(/[$,]/g, '')) 
              : precio;
            
            const descripcion = `${tipoPersiana} ${modelo} - ${color} (${ancho}x${alto}) - ${ubicacion}`.trim();
            
            return {
              id: `f-${idx}-${Date.now()}`,
              descripcion: descripcion || `Partida ${idx + 1}`,
              costoBase: precioNum || 0,
              medidas: m2 ? `${m2} m²` : `${ancho}x${alto}`,
              ubicacion,
              tipoPersiana,
              modelo,
              color
            };
          });
        
        setFactoryItems(items);
      } catch (error) {
        console.error('Error al leer Excel:', error);
        alert('Error al leer el archivo. Verifica que sea un Excel válido.');
      }
      setIsLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Handlers Paso 4 ---
  const addItemToQuote = (item: FactoryItem) => {
    const precioVenta = item.costoBase * (1 + markup / 100);
    const newItem: QuoteItem = { ...item, id: `q-${Date.now()}-${item.id}`, cantidad: 1, precioVenta };
    setSelectedItems(prev => [...prev, newItem]);
  };

  const addAllItemsToQuote = () => {
    const newItems = factoryItems.map(item => {
      const precioVenta = item.costoBase * (1 + markup / 100);
      return { ...item, id: `q-${Date.now()}-${item.id}`, cantidad: 1, precioVenta };
    });
    setSelectedItems(prev => [...prev, ...newItems]);
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setSelectedItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeItem = (id: string) => setSelectedItems(prev => prev.filter(item => item.id !== id));

  // --- Cálculos ---
  const calculateSubtotal = () => {
    return selectedItems.reduce((acc, item) => {
      const price = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
      return acc + (price * item.cantidad);
    }, 0);
  };

  const calculateTotalFactoryCost = () => {
    return selectedItems.reduce((acc, item) => acc + (item.costoBase * item.cantidad), 0);
  };

  // Total final = subtotal productos + viáticos (los extras ya están en el costo)
  const totalFinal = calculateSubtotal() + viaticos;
  
  // Utilidad = Total venta - (Costo fábrica + todos los extras)
  const totalProfit = calculateSubtotal() - calculateTotalFactoryCost() - totalExtras;

  const generateFinalPDF = async () => {
    setIsGenerating(true);
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(20);
    doc.text('COTIZACIÓN', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Cliente: ${clientName}`, 20, 35);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 42);

    // Tabla de productos (SIN mostrar instalación, andamios, comisión)
    const tableData = selectedItems.map(item => {
      const price = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
      return [item.descripcion, item.cantidad, `$${price.toFixed(2)}`, `$${(price * item.cantidad).toFixed(2)}`];
    });

    doc.autoTable({
      startY: 50,
      head: [['Descripción', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      headStyles: { fillColor: [37, 99, 235] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Subtotal
    doc.setFontSize(11);
    doc.text(`Subtotal: $${calculateSubtotal().toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 140, finalY);
    
    // Viáticos (si hay)
    if (viaticos > 0) {
      doc.text(`Viáticos: $${viaticos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 140, finalY + 7);
    }
    
    // Total Final
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $${totalFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 140, finalY + (viaticos > 0 ? 18 : 11));

    // Notas
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('* Precios sujetos a cambio sin previo aviso', 20, finalY + 30);
    doc.text('* Vigencia de cotización: 15 días', 20, finalY + 35);

    doc.save(`Cotizacion_${clientName || 'Cliente'}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
    
    // Guardar en historial
    onSaveHistory({
      id: Math.random().toString(36).substr(2, 9),
      fecha: new Date().toISOString(),
      cliente: clientName || 'Sin Nombre',
      totalVenta: totalFinal,
      utilidad: totalProfit,
      markupAplicado: markup,
      items: selectedItems.length
    });
    
    setIsGenerating(false);
  };

  return (
    <div className="space-y-8 pb-32">
      {/* PASO 1: INFO Y UTILIDAD */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
          Información y Margen
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre del Cliente</label>
            <input type="text" className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-2 ring-blue-500" placeholder="Juan Pérez" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Margen de Utilidad ({markup}%)</label>
            <input type="range" min="0" max="150" step="5" className="w-full accent-blue-600" value={markup} onChange={e => setMarkup(Number(e.target.value))} />
          </div>
        </div>
      </section>

      {/* PASO 2: MEDIDAS */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <span className="bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
          Levantamiento de Medidas
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl mb-6 border border-slate-200">
          <div className="col-span-2 md:col-span-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase">Tipo Persiana</label>
            <input className="w-full p-2 text-sm border rounded-lg" placeholder="Enrollable" value={currentMeasure.tipoPersiana} onChange={e => setCurrentMeasure({...currentMeasure, tipoPersiana: e.target.value})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Ancho (m)</label>
            <input type="number" step="0.01" className="w-full p-2 text-sm border rounded-lg" value={currentMeasure.ancho || ''} onChange={e => setCurrentMeasure({...currentMeasure, ancho: Number(e.target.value)})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Alto (m)</label>
            <input type="number" step="0.01" className="w-full p-2 text-sm border rounded-lg" value={currentMeasure.alto || ''} onChange={e => setCurrentMeasure({...currentMeasure, alto: Number(e.target.value)})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Tipo Tela</label>
            <input className="w-full p-2 text-sm border rounded-lg" placeholder="Blackout" value={currentMeasure.tipoTela} onChange={e => setCurrentMeasure({...currentMeasure, tipoTela: e.target.value})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Nombre Tela</label>
            <input className="w-full p-2 text-sm border rounded-lg" placeholder="Premium" value={currentMeasure.nombreTela} onChange={e => setCurrentMeasure({...currentMeasure, nombreTela: e.target.value})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Color</label>
            <input className="w-full p-2 text-sm border rounded-lg" placeholder="Gris" value={currentMeasure.color} onChange={e => setCurrentMeasure({...currentMeasure, color: e.target.value})} />
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
            <input className="w-full p-2 text-sm border rounded-lg" placeholder="Sala Principal" value={currentMeasure.ubicacion} onChange={e => setCurrentMeasure({...currentMeasure, ubicacion: e.target.value})} />
          </div>
          <Button variant="primary" className="h-[38px] mt-auto" onClick={addMeasurement}>Añadir</Button>
        </div>

        <div className="overflow-x-auto border rounded-xl mb-4">
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
                  <td className="px-3 py-2 font-medium">{m.ancho} x {m.alto}</td>
                  <td className="px-3 py-2 font-bold text-blue-600">{m.mt2}</td>
                  <td className="px-3 py-2">{m.tipoPersiana}</td>
                  <td className="px-3 py-2">{m.tipoTela} {m.nombreTela} ({m.color})</td>
                  <td className="px-3 py-2">{m.ladoMecanismo}</td>
                  <td className="px-3 py-2">{m.ubicacion}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => removeMeasurement(m.id)} className="text-red-400 hover:text-red-600 font-bold">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {measurements.length > 0 && (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={downloadPreQuoteExcel} className="gap-2 text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Excel Fábrica
            </Button>
            <Button variant="secondary" onClick={downloadPreQuote} className="gap-2 text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              PDF Fábrica
            </Button>
          </div>
        )}
      </section>

      {/* PASO 3: CARGA DE FÁBRICA */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
          <span className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
          Costos de Fábrica
        </h3>
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 relative hover:border-purple-400 transition-colors">
          <input type="file" accept=".xlsx,.xls" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFactoryUpload} />
          <p className="text-slate-500 text-sm">Carga el presupuesto recibido de fábrica</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase">Archivo Excel (.xlsx)</p>
        </div>
        {isLoading && <div className="mt-4 text-purple-600 text-xs font-bold animate-pulse text-center">Procesando Excel...</div>}
        
        {factoryItems.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-500">{factoryItems.length} partidas encontradas</span>
              <Button variant="primary" className="text-xs" onClick={addAllItemsToQuote}>
                Agregar Todas
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {factoryItems.map(item => (
                <div key={item.id} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="text-xs font-bold truncate">{item.descripcion}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Costo: ${item.costoBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <Button variant="secondary" className="h-7 px-3 text-[10px]" onClick={() => addItemToQuote(item)}>Agregar</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* PASO 4: AJUSTES FINALES */}
      <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-8 flex items-center gap-3">
            <span className="bg-white text-slate-900 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
            Ajustes Finales e Importes
          </h3>
          
          {/* Items seleccionados */}
          <div className="space-y-4 mb-10">
            {selectedItems.length === 0 ? (
              <p className="text-center text-slate-500 py-10 border border-dashed border-white/10 rounded-2xl">Añade productos de fábrica para configurar precios finales.</p>
            ) : (
              selectedItems.map(item => {
                const currentPrice = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
                return (
                  <div key={item.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row gap-6 items-center shadow-lg">
                    <div className="flex-1 text-center md:text-left">
                      <p className="font-bold text-sm tracking-tight">{item.descripcion}</p>
                      <div className="flex items-center gap-2 mt-1 justify-center md:justify-start flex-wrap">
                        <span className="text-[10px] text-blue-400 font-bold uppercase">Sugerido: ${item.precioVenta.toFixed(2)}</span>
                        <span className="text-[9px] text-white/30">(Fábrica: ${item.costoBase.toFixed(2)})</span>
                        {extraPerItem > 0 && <span className="text-[9px] text-yellow-400">(+${extraPerItem.toFixed(2)} extras)</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full md:w-64">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 text-center">Cant.</label>
                        <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm text-center font-bold outline-none" value={item.cantidad} onChange={e => updateItem(item.id, { cantidad: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 text-center">Precio Venta</label>
                        <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm text-center font-black text-green-400 outline-none" value={currentPrice} onChange={e => updateItem(item.id, { precioVentaManual: Number(e.target.value) })} />
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-white/20 hover:text-red-400 transition-colors p-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* COSTOS ADICIONALES (NO van a cotización cliente) */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-8">
            <h4 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Costos Internos (No aparecen en cotización)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Instalación */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Instalación</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500">Cantidad</label>
                    <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm outline-none" value={installQty || ''} onChange={e => setInstallQty(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500">Costo c/u</label>
                    <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm outline-none" value={installCostUnit || ''} onChange={e => setInstallCostUnit(Number(e.target.value))} />
                  </div>
                </div>
                <p className="text-[10px] text-blue-400">Total: ${totalInstall.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Andamios */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Andamios</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500">Cantidad</label>
                    <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm outline-none" value={scaffoldQty || ''} onChange={e => setScaffoldQty(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500">Costo c/u</label>
                    <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm outline-none" value={scaffoldCostUnit || ''} onChange={e => setScaffoldCostUnit(Number(e.target.value))} />
                  </div>
                </div>
                <p className="text-[10px] text-blue-400">Total: ${totalScaffold.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>

              {/* Comisión */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Comisión Vendedor</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500">Cantidad</label>
                    <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm outline-none" value={commissionQty || ''} onChange={e => setCommissionQty(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500">Costo c/u</label>
                    <input type="number" className="w-full bg-white/10 border border-white/20 p-2 rounded-lg text-sm outline-none" value={commissionCostUnit || ''} onChange={e => setCommissionCostUnit(Number(e.target.value))} />
                  </div>
                </div>
                <p className="text-[10px] text-blue-400">Total: ${totalCommission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {totalExtras > 0 && selectedItems.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-[10px] text-yellow-400">
                  💡 Total extras: ${totalExtras.toFixed(2)} ÷ {selectedItems.length} partidas = <strong>${extraPerItem.toFixed(2)}</strong> por partida
                </p>
              </div>
            )}
          </div>

          {/* VIÁTICOS (SÍ van a cotización) */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl mb-8">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-bold text-emerald-400 uppercase">Viáticos</label>
                <p className="text-[9px] text-emerald-300/60">Aparece en cotización final</p>
              </div>
              <input type="number" className="w-32 bg-white/10 border border-emerald-500/30 p-2 rounded-lg text-sm text-right font-bold text-emerald-400 outline-none" placeholder="$0" value={viaticos || ''} onChange={e => setViaticos(Number(e.target.value))} />
            </div>
          </div>

          {/* RESUMEN FINAL */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-inner">
            <div className="text-center md:text-left">
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Precio Total al Cliente</p>
              <h2 className="text-6xl font-black tracking-tighter">${totalFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h2>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-8 py-4 rounded-2xl text-center min-w-[220px]">
              <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-1">Utilidad Neta</p>
              <p className="text-3xl font-black text-emerald-400">${totalProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="mt-12">
            <Button 
              variant="primary" 
              className="w-full py-6 text-2xl font-black bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-2xl shadow-blue-900/40"
              onClick={generateFinalPDF}
              isLoading={isGenerating}
              disabled={selectedItems.length === 0}
            >
              Generar Cotización PDF
            </Button>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 blur-[120px] -z-0 pointer-events-none"></div>
      </section>
    </div>
  );
};
