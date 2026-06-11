import React, { useState } from 'react';
import { Button } from './Button';
import { FactoryItem, QuoteItem, HistoryEntry, Measurement } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- CATÁLOGOS PREDEFINIDOS ---
const TIPOS_PERSIANA = [
  'Enrollable',
  'Sheer',
  'Panel Japonés',
  'Cortina Pliegue Francés',
  'Cortina Ondulado Perfecto',
  'Cortina Ojillos',
  'Toldo Vertical',
  'Toldo Retráctil'
];

const TIPOS_TELA = ['Screen', 'Blackout', 'Traslúcida', 'Semitraslúcida'];

const NOMBRES_TELA = [
  'B.O. 500',
  'B.O. IPANEMA 2.40 MTS',
  'B.O. LONG BEACH 2.50 MTS',
  'B.O. LUXURY 3.00 MTS',
  'B.O. MONTREAL',
  'B.O. SIDNEY 3.00 MTS',
  'B.O. BUDELLI 2.50 MTS',
  'BO TEXTURE 2.60 MTS',
  'BO OHIO 2.50 MTS',
  'DUO BASIC 2.50 MTS',
  'DUOLINE DIM OUT 3.00 MTS',
  'DUO WOODLINE 2.60 MTS',
  'DUO CELEBRITY 2.50 MTS',
  'DUO DIM OUT SOFT 3.00',
  'DUO TERRA 3.00 MTS',
  'DUO BRIGHT 2.85 MTS',
  'DUO DIM OUT WOODS 3.00 MTS',
  'DUO SEASON 2.80 MTS',
  'F.L. IPANEMA 2.50 MTS',
  'F.L. LONG BEACH 2.50 MTS',
  'F.L SIDNEY 3.00 MTS',
  'F.L. BUDELLI 2.20 MTS',
  'SCREEN BASIC 2.00 MTS',
  'SCREEN SOFT 2.00 MTS',
  'SCREEN MILAN 2.50 MTS',
  'SCREEN ONE 2.50 MTS',
  'GALAXY BLACK OUT 3MTS',
  'F.L. BERLIN 2.80 MTS',
  'SHEER ADVANTAGE 3MTS',
  'DUO DENSE WOODLOOK 2.80 MTS',
  'DUO ROYAL DIM OUT 2.80 MTS',
  'DUO LINO DIM OUT 2.80 MTS',
  'DUO GENIUS DIM OUT 2.80 MTS',
  'Duo Radiance 3.00',
  'Dim out Glam 3.0',
  'Fl Fresh 2.80',
  'Bo Stylus 3.00',
  'Brave 2.80'
];

const UBICACIONES = [
  'Sala',
  'Comedor',
  'Cocina',
  'Recámara Principal',
  'Recámara 1',
  'Recámara 2',
  'Recámara 3',
  'Recámara 4',
  'Estudio',
  'Baño Principal',
  'Baño 2',
  'Pasillo',
  'Vestíbulo',
  'Entrada',
  'Escalera',
  'Terraza',
  'Balcón',
  'Cuarto de Lavado',
  'Cuarto de Servicio',
  'Bodega',
  'Gimnasio',
  'Sala de TV',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
  'V11', 'V12', 'V13', 'V14', 'V15',
  'Oficina 1', 'Oficina 2', 'Oficina 3', 'Oficina 4', 'Oficina 5',
  'Otro'
];

interface QuoteFormProps {
  onSaveHistory: (entry: HistoryEntry) => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ onSaveHistory }) => {
  // --- Paso 1: Config ---
  const [clientName, setClientName] = useState('');
  const [markup, setMarkup] = useState(30);
  const [cotizacionFecha, setCotizacionFecha] = useState(new Date().toISOString().split('T')[0]);

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
  
  // Descuento (%)
  const [descuentoPct, setDescuentoPct] = useState(0);
  
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

  // --- Handler Paso 3: Cargar Excel, PDF o Imagen de Fábrica ---
  const handleFactoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    // --- Excel: parseo instantáneo ---
    if (fileExt === 'xlsx' || fileExt === 'xls') {
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
              const precioNum = typeof precio === 'string' ? parseFloat(precio.replace(/[$,]/g, '')) : precio;
              const descripcion = `${tipoPersiana} ${modelo} - ${color} (${ancho}x${alto}) - ${ubicacion}`.trim();
              return {
                id: `f-${idx}-${Date.now()}`,
                descripcion: descripcion || `Partida ${idx + 1}`,
                costoBase: precioNum || 0,
                medidas: m2 ? `${m2} m²` : `${ancho}x${alto}`,
                ubicacion, tipoPersiana, modelo, color
              };
            });
          setFactoryItems(items);
        } catch (error) {
          alert('Error al leer el Excel. Verifica que sea un archivo válido.');
        }
        setIsLoading(false);
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // --- PDF o Imagen: usa Claude Vision API ---
    if (fileExt === 'pdf' || ['jpg','jpeg','png','webp'].includes(fileExt || '')) {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          const mediaType = file.type;

          let messageContent: any[];
          if (fileExt === 'pdf') {
            messageContent = [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: 'Extrae TODAS las partidas/productos de este documento de cotización de fábrica. Para cada partida devuelve: descripcion, precio (solo número), ubicacion, tipoPersiana, modelo, color. Responde SOLO con JSON array, sin texto adicional.' }
            ];
          } else {
            messageContent = [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Extrae TODAS las partidas/productos de esta imagen de cotización de fábrica. Para cada partida devuelve: descripcion, precio (solo número), ubicacion, tipoPersiana, modelo, color. Responde SOLO con JSON array, sin texto adicional.' }
            ];
          }

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2000,
              messages: [{ role: 'user', content: messageContent }]
            })
          });

          const data = await response.json();
          const text = data.content?.map((c: any) => c.text || '').join('');
          const clean = text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);

          const items: FactoryItem[] = parsed.map((row: any, idx: number) => ({
            id: `f-${idx}-${Date.now()}`,
            descripcion: row.descripcion || `Partida ${idx + 1}`,
            costoBase: parseFloat(String(row.precio || '0').replace(/[$,]/g, '')) || 0,
            medidas: '',
            ubicacion: row.ubicacion || '',
            tipoPersiana: row.tipoPersiana || '',
            modelo: row.modelo || '',
            color: row.color || ''
          }));
          setFactoryItems(items);
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        alert('Error al leer el archivo con IA. Intenta con Excel.');
        setIsLoading(false);
      }
      return;
    }

    alert('Formato no soportado. Usa Excel (.xlsx), PDF o imagen (JPG/PNG).');
    setIsLoading(false);
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

  // Subtotal con extras
  const subtotalConExtras = calculateSubtotal() + totalExtras;
  
  // Monto de descuento
  const descuentoMonto = subtotalConExtras * (descuentoPct / 100);
  
  // Total final = subtotal + extras - descuento + viáticos
  const totalFinal = subtotalConExtras - descuentoMonto + viaticos;
  
  // Utilidad = Total venta productos - Costo fábrica - descuento
  const totalProfit = calculateSubtotal() - calculateTotalFactoryCost() - descuentoMonto;

  const generateFinalPDF = async () => {
    setIsGenerating(true);
    const doc = new jsPDF() as any;
    
    // Generar número de cotización
    const cotizacionNum = `HMGO${Date.now().toString().slice(-5)}`;
    const fechaHoy = cotizacionFecha 
      ? new Date(cotizacionFecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    
    // --- HEADER ---
    // Logo HMG (base64)
    const logoBase64 = 'data:image/png;base64,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';
    
    try {
      doc.addImage(logoBase64, 'PNG', 15, 8, 35, 20);
    } catch (e) {
      // Si falla el logo, usar texto
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('HMG!', 20, 18);
      doc.setFontSize(8);
      doc.text('¡HOME MY GOD!', 20, 24);
    }
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('HOME MY GOD QUERETARO', 15, 32);
    
    // Info cotización (derecha)
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`COTIZACIÓN: ${cotizacionNum}`, 120, 12);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`FECHA: ${fechaHoy}`, 120, 20);
    doc.text(`CLIENTE: ${clientName || '_______________'}`, 120, 28);
    doc.text('VIGENCIA: 15 días', 120, 36);
    
    // Línea separadora
    doc.setDrawColor(0, 150, 200);
    doc.setLineWidth(0.5);
    doc.line(15, 42, 195, 42);
    
    // --- TABLA DE PRODUCTOS ---
    const tableData = selectedItems.map((item, idx) => {
      const basePrice = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
      const priceWithExtras = basePrice + extraPerItem;
      
      // Extraer datos del item
      const ubicacion = (item as any).ubicacion || '-';
      const tipoPersiana = (item as any).tipoPersiana || '-';
      const tipoTela = (item as any).tipoTela || '-';
      const nombreTela = (item as any).nombreTela || (item as any).modelo || '-';
      const color = (item as any).color || '-';
      const mecanismo = (item as any).mecanismo || 'Der';
      
      return [
        idx + 1,
        ubicacion,
        tipoPersiana,
        tipoTela,
        nombreTela,
        color,
        mecanismo,
        `$${priceWithExtras.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ];
    });

    doc.autoTable({
      startY: 50,
      head: [['No', 'Ubicación', 'Tipo Persiana', 'Tipo Tela', 'Nombre Tela', 'Color', 'Mec.', 'Costo']],
      body: tableData,
      theme: 'grid',
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        halign: 'center'
      },
      headStyles: { 
        fillColor: [200, 230, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 28 },
        2: { cellWidth: 25 },
        3: { cellWidth: 22 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
        6: { cellWidth: 12 },
        7: { cellWidth: 25, halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    // --- TOTALES ---
    const subtotal = subtotalConExtras;
    const descuento = descuentoMonto;
    const sub = subtotal - descuento;
    
    // Caja de Notas
    doc.setFontSize(8);
    doc.text('Notas:', 20, finalY + 5);
    doc.setDrawColor(150);
    doc.rect(20, finalY + 7, 80, 30);
    
    // Columna de totales
    const totalsX = 120;
    doc.setFontSize(9);
    doc.text('SUBTOTAL', totalsX, finalY + 5);
    doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 175, finalY + 5, { align: 'right' });
    
    doc.text(`DESCUENTO (${descuentoPct}%)`, totalsX, finalY + 12);
    doc.text(`-$${descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 175, finalY + 12, { align: 'right' });
    
    doc.text('SUB', totalsX, finalY + 19);
    doc.text(`$${sub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 175, finalY + 19, { align: 'right' });
    
    doc.text('ANTICIPO', totalsX, finalY + 26);
    doc.text('___________', 175, finalY + 26, { align: 'right' });
    
    if (viaticos > 0) {
      doc.text('VIÁTICOS', totalsX, finalY + 33);
      doc.text(`$${viaticos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 175, finalY + 33, { align: 'right' });
    }
    
    doc.text('IVA', totalsX, finalY + (viaticos > 0 ? 40 : 33));
    doc.text('___________', 175, finalY + (viaticos > 0 ? 40 : 33), { align: 'right' });
    
    // Nota de IVA
    doc.setFillColor(200, 230, 240);
    doc.rect(20, finalY + 42, 170, 8, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Si se requiere factura es más IVA', 105, finalY + 47, { align: 'center' });
    
    // --- FIRMA ---
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('ACEPTADO POR', 20, finalY + 60);
    
    doc.setFont(undefined, 'normal');
    doc.line(20, finalY + 75, 100, finalY + 75);
    
    doc.setFontSize(8);
    doc.text('Recibo a mi entera satisfacción los productos y/o servicios', 20, finalY + 82);
    doc.text('en este formato mencionados,', 20, finalY + 87);

    // --- CONDICIONES COMERCIALES ---
    const condY = finalY + 97;
    doc.setFillColor(245, 247, 250);
    doc.rect(15, condY, 180, 22, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.rect(15, condY, 180, 22);
    doc.setFontSize(7.5);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(60, 80, 120);
    doc.text('CONDICIONES COMERCIALES:', 19, condY + 6);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('• Cotización válida por 90 días a partir de la fecha de emisión.', 19, condY + 12);
    doc.text('• 70% de anticipo y 30% restante al término de la instalación.', 19, condY + 17);
    doc.text('• Tiempo de entrega: 6 a 9 días hábiles después del pago del anticipo.', 19, condY + 22);
    doc.setTextColor(0, 0, 0);

    doc.save(`Cotizacion_${cotizacionNum}_${clientName || 'Cliente'}.pdf`);
    
    // Datos para guardar
    const costoFabrica = calculateTotalFactoryCost();
    const otrosCostos = totalExtras + viaticos;
    
    // Guardar en historial local
    onSaveHistory({
      id: Math.random().toString(36).substr(2, 9),
      fecha: new Date().toISOString(),
      cliente: clientName || 'Sin Nombre',
      totalVenta: totalFinal,
      utilidad: totalProfit,
      markupAplicado: markup,
      items: selectedItems.length
    });
    
    // Enviar a Google Sheets
    try {
      const sheetData = {
        fecha: new Date().toLocaleDateString('es-MX'),
        cliente: clientName || 'Sin Nombre',
        costoFabrica: costoFabrica,
        margenPorcentaje: markup,
        instalacion: totalInstall,
        otros: totalScaffold + totalCommission + viaticos,
        totalFinal: totalFinal
      };
      
      // URL del Web App de Google Apps Script (se configura después)
      const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
      
      if (GOOGLE_SCRIPT_URL) {
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sheetData)
        });
      }
    } catch (error) {
      console.error('Error enviando a Google Sheets:', error);
    }
    
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
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fecha de Cotización</label>
            <input type="date" className="w-full p-2 bg-slate-50 border rounded-lg focus:ring-2 ring-blue-500" value={cotizacionFecha} onChange={e => setCotizacionFecha(e.target.value)} />
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
            <label className="text-[9px] font-bold text-slate-400 uppercase">Tipo</label>
            <select className="w-full p-2 text-sm border rounded-lg bg-white" value={currentMeasure.tipoPersiana} onChange={e => setCurrentMeasure({...currentMeasure, tipoPersiana: e.target.value})}>
              <option value="">Seleccionar...</option>
              {TIPOS_PERSIANA.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
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
            <select className="w-full p-2 text-sm border rounded-lg bg-white" value={currentMeasure.tipoTela} onChange={e => setCurrentMeasure({...currentMeasure, tipoTela: e.target.value})}>
              <option value="">Seleccionar...</option>
              {TIPOS_TELA.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Nombre Tela</label>
            <select className="w-full p-2 text-sm border rounded-lg bg-white" value={currentMeasure.nombreTela} onChange={e => setCurrentMeasure({...currentMeasure, nombreTela: e.target.value})}>
              <option value="">Seleccionar...</option>
              {NOMBRES_TELA.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Color</label>
            <input className="w-full p-2 text-sm border rounded-lg" placeholder="Ej: Blanco, Gris" value={currentMeasure.color} onChange={e => setCurrentMeasure({...currentMeasure, color: e.target.value})} />
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
            <select className="w-full p-2 text-sm border rounded-lg bg-white" value={currentMeasure.ubicacion} onChange={e => setCurrentMeasure({...currentMeasure, ubicacion: e.target.value})}>
              <option value="">Seleccionar...</option>
              {UBICACIONES.map(ubi => <option key={ubi} value={ubi}>{ubi}</option>)}
            </select>
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
          <input type="file" accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFactoryUpload} />
          <p className="text-slate-500 text-sm font-medium">Carga el presupuesto recibido de fábrica</p>
          <p className="text-[10px] text-slate-400 mt-1 uppercase">Excel (.xlsx) · PDF · Imagen (JPG/PNG)</p>
          <div className="flex justify-center gap-3 mt-3">
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">📊 Excel</span>
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">📄 PDF</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">🖼️ Imagen</span>
          </div>
        </div>
        {isLoading && <div className="mt-4 text-purple-600 text-xs font-bold animate-pulse text-center">⏳ Procesando archivo con IA...</div>}
        
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

          {/* DESCUENTO (%) */}
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl mb-8">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-bold text-red-400 uppercase">Descuento</label>
                <p className="text-[9px] text-red-300/60">Se aplica al subtotal</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="100" className="w-20 bg-white/10 border border-red-500/30 p-2 rounded-lg text-sm text-right font-bold text-red-400 outline-none" placeholder="0" value={descuentoPct || ''} onChange={e => setDescuentoPct(Number(e.target.value))} />
                <span className="text-red-400 font-bold">%</span>
              </div>
            </div>
            {descuentoPct > 0 && (
              <p className="text-[10px] text-red-400 mt-2">
                Descuento: -${descuentoMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            )}
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
