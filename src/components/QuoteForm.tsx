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
  const [notasPDF, setNotasPDF] = useState('');

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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
              const tipoPersiana = row['Tipo Persiana'] || row['T.PERSIANA'] || row['T. PERSIANA'] || row['TIPO PERSIANA'] || '';
              const tipoTela = row['Tipo Tela'] || row['TIPO TELA'] || row['tipo_tela'] || '';
              const nombreTela = row['Nombre Tela'] || row['NOMBRE TELA'] || row['nombre_tela'] || row['MODELO'] || row['Modelo'] || '';
              const modelo = nombreTela;
              const color = row['COLOR'] || row['Color'] || '';
              const mecanismo = row['Mecanismo'] || row['MECANISMO'] || row['mecanismo'] || 'Derecho';
              const ancho = row['ANCHO'] || row['Ancho'] || '';
              const alto = row['ALTO'] || row['Alto'] || '';
              const m2 = row['M2'] || row['MT2'] || row['m2'] || '';
              const precioNum = typeof precio === 'string' ? parseFloat(precio.replace(/[$,]/g, '')) : precio;
              const descripcion = `${tipoPersiana} ${nombreTela} - ${color} - ${ubicacion}`.trim();
              return {
                id: `f-${idx}-${Date.now()}`,
                descripcion: descripcion || `Partida ${idx + 1}`,
                costoBase: precioNum || 0,
                medidas: m2 ? `${m2} m²` : `${ancho}x${alto}`,
                ubicacion,
                tipoPersiana,
                tipoTela,
                nombreTela,
                modelo,
                color,
                ladoMecanismo: mecanismo
              } as any;
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

    // --- PDF o Imagen: usa Claude Vision API via proxy ---
    if (fileExt === 'pdf' || ['jpg','jpeg','png','webp'].includes(fileExt || '')) {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            let base64: string;
            let mediaType: string;

            // Comprimir imagen si es mayor a 1MB
            if (fileExt !== 'pdf' && file.size > 1 * 1024 * 1024) {
              const img = new Image();
              img.src = event.target?.result as string;
              await new Promise(resolve => { img.onload = resolve; });
              const canvas = document.createElement('canvas');
              const maxW = 1200;
              const scale = Math.min(1, maxW / img.width);
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
              const compressed = canvas.toDataURL('image/jpeg', 0.7);
              base64 = compressed.split(',')[1];
              mediaType = 'image/jpeg';
            } else {
              base64 = (event.target?.result as string).split(',')[1];
              mediaType = file.type || (fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg');
            }

          let messageContent: any[];
            if (fileExt === 'pdf') {
              messageContent = [
                { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
                { type: 'text', text: 'Extrae TODAS las partidas/productos de este documento de cotización de fábrica. Para cada partida devuelve: descripcion, precio (solo número sin símbolos), ubicacion, tipoPersiana, modelo, color. Responde SOLO con un JSON array válido, sin texto adicional ni markdown.' }
              ];
            } else {
              messageContent = [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: 'Extrae TODAS las partidas/productos de esta imagen de cotización de fábrica. Para cada partida devuelve: descripcion, precio (solo número sin símbolos), ubicacion, tipoPersiana, modelo, color. Responde SOLO con un JSON array válido, sin texto adicional ni markdown.' }
              ];
            }

          try {
            // Llamada via Netlify Function (evita CORS)
            const response = await fetch('/.netlify/functions/claude-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [{ role: 'user', content: messageContent }] })
            });

            if (!response.ok) throw new Error(`Error ${response.status}`);

            const data = await response.json();
            const text = data.content?.map((c: any) => c.text || '').join('') || '';
            const clean = text.replace(/```json|```/g, '').trim();
            
            let parsed: any[] = [];
            try { parsed = JSON.parse(clean); } catch { parsed = []; }

            if (parsed.length === 0) {
              alert('No se encontraron partidas en el archivo. Verifica que sea una cotización de fábrica.');
              setIsLoading(false);
              return;
            }

            const items: FactoryItem[] = parsed.map((row: any, idx: number) => ({
              id: `f-${idx}-${Date.now()}`,
              descripcion: row.descripcion || `Partida ${idx + 1}`,
              costoBase: parseFloat(String(row.precio || '0').replace(/[$,\s]/g, '')) || 0,
              medidas: '',
              ubicacion: row.ubicacion || '',
              tipoPersiana: row.tipoPersiana || '',
              modelo: row.modelo || '',
              color: row.color || ''
            }));
            setFactoryItems(items);
          } catch (apiErr) {
            console.error('Error API:', apiErr);
            alert('Error al procesar el archivo con IA. Si es Excel, usa el formato .xlsx directamente.');
          }
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        alert('Error al leer el archivo. Intenta con un Excel (.xlsx).');
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
    const matchedM = measurements.find(m => m.ubicacion === item.ubicacion);
    const newItem: QuoteItem = { 
      ...item, 
      id: `q-${Date.now()}-${item.id}`, 
      cantidad: 1, 
      precioVenta,
      tipoTela: (item as any).tipoTela || matchedM?.tipoTela || '',
      nombreTela: (item as any).nombreTela || matchedM?.nombreTela || '',
      ladoMecanismo: (item as any).ladoMecanismo || matchedM?.ladoMecanismo || 'Derecho',
      color: item.color || matchedM?.color || ''
    } as any;
    setSelectedItems(prev => [...prev, newItem]);
  };

  const addAllItemsToQuote = () => {
    const newItems = factoryItems.map(item => {
      const precioVenta = item.costoBase * (1 + markup / 100);
      const matchedM = measurements.find(m => m.ubicacion === item.ubicacion);
      return { 
        ...item, 
        id: `q-${Date.now()}-${item.id}`, 
        cantidad: 1, 
        precioVenta,
        tipoTela: (item as any).tipoTela || matchedM?.tipoTela || '',
        nombreTela: (item as any).nombreTela || matchedM?.nombreTela || '',
        ladoMecanismo: (item as any).ladoMecanismo || matchedM?.ladoMecanismo || 'Derecho',
        color: item.color || matchedM?.color || ''
      } as any;
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
    doc.text('VIGENCIA: 6 meses', 120, 36);
    
    // Línea separadora
    doc.setDrawColor(0, 150, 200);
    doc.setLineWidth(0.5);
    doc.line(15, 42, 195, 42);
    
    // --- TABLA DE PRODUCTOS ---
    const tableData = selectedItems.map((item, idx) => {
      const basePrice = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
      const priceWithExtras = basePrice + extraPerItem;
      
      // Extraer datos del item — buscar en measurements si no viene del item directamente
      const ubicacion = (item as any).ubicacion || '-';
      const tipoPersiana = (item as any).tipoPersiana || '-';
      // Buscar en measurements por ubicación para obtener tipoTela y nombreTela
      const matchedMeasure = measurements.find(m => 
        m.ubicacion === ubicacion || m.tipoPersiana === tipoPersiana
      );
      const tipoTela = (item as any).tipoTela || matchedMeasure?.tipoTela || '-';
      const nombreTela = (item as any).nombreTela || (item as any).modelo || matchedMeasure?.nombreTela || '-';
      const color = (item as any).color || matchedMeasure?.color || '-';
      const mecanismo = (item as any).ladoMecanismo || matchedMeasure?.ladoMecanismo || (item as any).mecanismo || '-';
      
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
    
    // Caja de Notas (editable)
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text('Notas:', 15, finalY + 5);
    doc.setFont(undefined, 'normal');
    doc.setDrawColor(180);
    doc.rect(15, finalY + 7, 85, 38);
    if (notasPDF) {
      const notasLines = doc.splitTextToSize(notasPDF, 80);
      doc.text(notasLines, 18, finalY + 13);
    }
    
    // Columna de totales (orden: Subtotal, Descuento, Subtotal, IVA, Total con IVA, Anticipo)
    const totalsX = 115;
    const totalsVal = 193;
    const iva16 = sub * 0.16;
    const totalConIVA = sub + iva16 + (viaticos > 0 ? viaticos : 0);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('SUBTOTAL', totalsX, finalY + 5);
    doc.text(`$${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsVal, finalY + 5, { align: 'right' });
    
    doc.text(`DESCUENTO (${descuentoPct}%)`, totalsX, finalY + 12);
    doc.setTextColor(200, 0, 0);
    doc.text(`-$${descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsVal, finalY + 12, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    doc.text('SUBTOTAL', totalsX, finalY + 19);
    doc.text(`$${sub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsVal, finalY + 19, { align: 'right' });
    
    if (viaticos > 0) {
      doc.text('VIÁTICOS', totalsX, finalY + 26);
      doc.text(`$${viaticos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsVal, finalY + 26, { align: 'right' });
    }
    
    const ivaY = finalY + (viaticos > 0 ? 33 : 26);
    doc.text('IVA (16%)', totalsX, ivaY);
    doc.text(`$${iva16.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsVal, ivaY, { align: 'right' });
    
    doc.setFillColor(220, 235, 250);
    doc.rect(totalsX - 2, ivaY + 3, totalsVal - totalsX + 4, 9, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL CON IVA', totalsX, ivaY + 9);
    doc.text(`$${totalConIVA.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsVal, ivaY + 9, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    doc.text('ANTICIPO (70%)', totalsX, ivaY + 18);
    doc.text(`$${(totalConIVA * 0.7).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsVal, ivaY + 18, { align: 'right' });
    
    doc.text('SALDO (30%)', totalsX, ivaY + 25);
    doc.text(`$${(totalConIVA * 0.3).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, totalsVal, ivaY + 25, { align: 'right' });
    
    // Calcular posición dinámica para firma
    const ivaYRef = finalY + (viaticos > 0 ? 33 : 26);
    const firmaY = ivaYRef + 40;
    
    // --- FIRMA ---
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('ACEPTADO POR', 15, firmaY);
    
    doc.setFont(undefined, 'normal');
    doc.setDrawColor(100);
    doc.line(15, firmaY + 15, 95, firmaY + 15);
    
    doc.setFontSize(8);
    doc.text('Recibo a mi entera satisfacción los productos y/o servicios', 15, firmaY + 20);
    doc.text('en este formato mencionados.', 15, firmaY + 25);

    // --- CONDICIONES COMERCIALES ---
    const condY = firmaY + 33;
    doc.setFillColor(245, 247, 250);
    doc.rect(15, condY, 180, 24, 'F');
    doc.setDrawColor(200, 210, 220);
    doc.rect(15, condY, 180, 24);
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
    
    // --- CONTACTO ---
    const contactY = condY + 30;
    doc.setFillColor(40, 60, 100);
    doc.rect(15, contactY, 180, 16, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Tete Delgado', 19, contactY + 6);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text('WhatsApp: 442.87.06.24', 19, contactY + 12);
    doc.text('www.persianasenqueretaro.mx', 105, contactY + 12, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Guardar PDF como base64
    const pdfBase64 = doc.output('datauristring');
    const filename = `Cotizacion_${cotizacionNum}_${clientName || 'Cliente'}.pdf`;
    doc.save(filename);
    
    // Datos para guardar en historial
    const costoFabrica = calculateTotalFactoryCost();
    
    const historyEntry: HistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      fecha: new Date().toISOString(),
      cliente: clientName || 'Sin Nombre',
      totalVenta: totalFinal,
      utilidad: totalProfit,
      markupAplicado: markup,
      items: selectedItems.length,
      cotizacionNum,
      filename,
      pdfBase64
    };
    
    // Guardar en localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('hmg_cotizaciones') || '[]');
      existing.unshift(historyEntry);
      // Guardar máximo 50 cotizaciones
      localStorage.setItem('hmg_cotizaciones', JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
    
    onSaveHistory(historyEntry);
    
    // Enviar a Google Sheets (Apps Script: sube PDF a Drive + escribe fila)
    try {
      const sheetData = {
        fecha: new Date().toLocaleDateString('es-MX'),
        cliente: clientName || 'Sin Nombre',
        costoFabrica: costoFabrica,
        totalVenta: totalFinal,
        utilidad: totalProfit,
        instalacion: totalInstall,
        otros: totalScaffold + totalCommission + viaticos,
        cotizacionNum: cotizacionNum,
        filename: filename,
        pdfBase64: pdfBase64
      };
      
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

  const generateExcel = () => {
    const cotizacionNum = `HMGO${Date.now().toString().slice(-5)}`;
    const iva16 = (subtotalConExtras - descuentoMonto) * 0.16;
    const totalConIVA = (subtotalConExtras - descuentoMonto) + iva16 + viaticos;

    const partidas = selectedItems.map((item, idx) => {
      const basePrice = item.precioVentaManual !== undefined ? item.precioVentaManual : item.precioVenta;
      const priceWithExtras = basePrice + extraPerItem;
      return {
        'No': idx + 1,
        'Ubicación': (item as any).ubicacion || '',
        'Tipo': (item as any).tipoPersiana || '',
        'Tipo Tela': (item as any).tipoTela || '',
        'Nombre Tela': (item as any).nombreTela || (item as any).modelo || '',
        'Color': (item as any).color || '',
        'Mecanismo': (item as any).ladoMecanismo || 'Derecho',
        'Precio Unitario': priceWithExtras,
        'Cantidad': item.cantidad,
        'Subtotal': priceWithExtras * item.cantidad
      };
    });

    partidas.push({} as any);
    partidas.push({ 'Ubicación': 'SUBTOTAL', 'Precio Unitario': subtotalConExtras } as any);
    partidas.push({ 'Ubicación': `DESCUENTO (${descuentoPct}%)`, 'Precio Unitario': -descuentoMonto } as any);
    partidas.push({ 'Ubicación': 'SUBTOTAL', 'Precio Unitario': subtotalConExtras - descuentoMonto } as any);
    if (viaticos > 0) partidas.push({ 'Ubicación': 'VIÁTICOS', 'Precio Unitario': viaticos } as any);
    partidas.push({ 'Ubicación': 'IVA (16%)', 'Precio Unitario': iva16 } as any);
    partidas.push({ 'Ubicación': 'TOTAL CON IVA', 'Precio Unitario': totalConIVA } as any);
    partidas.push({ 'Ubicación': 'ANTICIPO (70%)', 'Precio Unitario': totalConIVA * 0.7 } as any);
    partidas.push({ 'Ubicación': 'SALDO (30%)', 'Precio Unitario': totalConIVA * 0.3 } as any);

    const ws = XLSX.utils.json_to_sheet(partidas);
    ws['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 25 },
      { wch: 15 }, { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 16 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cotización');

    const info = [
      { 'Campo': 'Cotización No.', 'Valor': cotizacionNum },
      { 'Campo': 'Fecha', 'Valor': cotizacionFecha },
      { 'Campo': 'Cliente', 'Valor': clientName || 'Sin nombre' },
      { 'Campo': 'Vigencia', 'Valor': '6 meses' },
      { 'Campo': 'Notas', 'Valor': notasPDF || '' },
      { 'Campo': 'Vendedor', 'Valor': 'Tete Delgado' },
      { 'Campo': 'WhatsApp', 'Valor': '442.87.06.24' },
      { 'Campo': 'Web', 'Valor': 'www.persianasenqueretaro.mx' },
    ];
    const ws2 = XLSX.utils.json_to_sheet(info);
    ws2['!cols'] = [{ wch: 18 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Info');

    XLSX.writeFile(wb, `Cotizacion_${cotizacionNum}_${clientName || 'Cliente'}.xlsx`);
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
        <div 
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:border-purple-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" 
            className="hidden" 
            onChange={handleFactoryUpload} 
          />
          <div className="text-3xl mb-2">📎</div>
          <p className="text-slate-600 text-sm font-semibold">Toca aquí para adjuntar archivo</p>
          <p className="text-[11px] text-slate-400 mt-1">Excel · PDF · Imagen (JPG/PNG)</p>
          <div className="flex justify-center gap-3 mt-3">
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">📊 Excel</span>
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">📄 PDF</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">🖼️ Imagen</span>
          </div>
        </div>
        {isLoading && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 px-4 py-2 rounded-full text-xs font-bold animate-pulse">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Procesando archivo...
            </div>
          </div>
        )}
        
        {factoryItems.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-500">{factoryItems.length} partidas encontradas</span>
              <Button variant="primary" className="text-xs" onClick={addAllItemsToQuote}>
                Agregar Todas
              </Button>
            </div>
            <div className="space-y-3">
              {factoryItems.map((item, idx) => (
                <div key={item.id} className="p-3 border rounded-lg bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-bold">{item.descripcion}</p>
                      <p className="text-[10px] text-slate-400">Costo: ${item.costoBase.toLocaleString('es-MX', { minimumFractionDigits: 2 })} · {item.ubicacion}</p>
                    </div>
                    <Button variant="secondary" className="h-7 px-3 text-[10px] shrink-0 ml-2" onClick={() => addItemToQuote(item)}>Agregar</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Tipo Tela</label>
                      <select
                        className="w-full p-1.5 text-xs border rounded-lg bg-slate-50"
                        value={(item as any).tipoTela || ''}
                        onChange={e => {
                          const updated = [...factoryItems];
                          (updated[idx] as any).tipoTela = e.target.value;
                          setFactoryItems(updated);
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {TIPOS_TELA.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Nombre Tela</label>
                      <select
                        className="w-full p-1.5 text-xs border rounded-lg bg-slate-50"
                        value={(item as any).nombreTela || ''}
                        onChange={e => {
                          const updated = [...factoryItems];
                          (updated[idx] as any).nombreTela = e.target.value;
                          setFactoryItems(updated);
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {NOMBRES_TELA.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
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

          {/* NOTAS PARA PDF */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">📝 Notas (aparecen en la cotización PDF)</label>
            <textarea 
              className="w-full bg-white/10 border border-white/20 p-3 rounded-lg text-sm text-white outline-none resize-none"
              rows={3}
              placeholder="Ej: Incluye instalación de herrajes, producto con garantía de 1 año..."
              value={notasPDF}
              onChange={e => setNotasPDF(e.target.value)}
            />
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

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="primary" 
              className="w-full py-6 text-xl font-black bg-blue-600 hover:bg-blue-500 rounded-2xl shadow-2xl shadow-blue-900/40 flex items-center justify-center gap-3"
              onClick={generateFinalPDF}
              isLoading={isGenerating}
              disabled={selectedItems.length === 0}
            >
              📄 Descargar PDF
            </Button>
            <Button 
              variant="secondary" 
              className="w-full py-6 text-xl font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-2xl shadow-emerald-900/40 flex items-center justify-center gap-3"
              onClick={generateExcel}
              disabled={selectedItems.length === 0}
            >
              📊 Descargar Excel
            </Button>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[120px] -z-0 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/10 blur-[120px] -z-0 pointer-events-none"></div>
      </section>
    </div>
  );
};
