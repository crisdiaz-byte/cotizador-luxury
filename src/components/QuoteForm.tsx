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

type Categoria = 'persianas' | 'cortinas' | 'toldos' | 'libre';
const CATEGORIAS: { id: Categoria; label: string; icon: string }[] = [
  { id: 'persianas', label: 'Persianas', icon: '🪟' },
  { id: 'cortinas', label: 'Cortinas', icon: '🎭' },
  { id: 'toldos', label: 'Toldos', icon: '⛱️' },
  { id: 'libre', label: 'Libre', icon: '✏️' }
];
const TIPOS_POR_CATEGORIA: Record<Categoria, string[]> = {
  persianas: ['Enrollable', 'Sheer', 'Panel Japonés'],
  cortinas: ['Cortina Pliegue Francés', 'Cortina Ondulado Perfecto', 'Cortina Ojillos'],
  toldos: ['Toldo Vertical', 'Toldo Retráctil'],
  libre: TIPOS_PERSIANA
};
const ETIQUETA_TIPO: Record<Categoria, string> = {
  persianas: 'Tipo Persiana', cortinas: 'Tipo Cortina', toldos: 'Tipo Toldo', libre: 'Producto'
};

// --- MARCA (configurable, se guarda en este navegador) ---
const BRAND_DEFAULT = {
  nombre: 'HOME MY GOD',
  prefijo: 'HMGO',
  logo: '',
  vendedor: 'Tete Delgado',
  whatsapp: '442.87.06.24',
  web: 'www.persianasenqueretaro.mx'
};
type Brand = typeof BRAND_DEFAULT;

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

  // Producto a cotizar
  const [categoria, setCategoria] = useState<Categoria>('persianas');
  const tiposActuales = TIPOS_POR_CATEGORIA[categoria];

  // Marca personalizable
  const [brand, setBrand] = useState<Brand>(() => {
    try { return { ...BRAND_DEFAULT, ...JSON.parse(localStorage.getItem('cotizador_brand') || '{}') }; }
    catch { return BRAND_DEFAULT; }
  });
  const updateBrand = (changes: Partial<Brand>) => {
    setBrand(prev => {
      const next = { ...prev, ...changes };
      try { localStorage.setItem('cotizador_brand', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 500 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        updateBrand({ logo: canvas.toDataURL('image/png') });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Concepto libre / accesorio (manivela, motor, servicio...)
  const [libreConcepto, setLibreConcepto] = useState('');
  const [libreCant, setLibreCant] = useState(1);
  const [libreCosto, setLibreCosto] = useState(0);
  const addLibre = () => {
    if (!libreConcepto.trim() || !libreCosto) return;
    const item = {
      id: `q-libre-${Date.now()}`,
      descripcion: libreConcepto.trim(),
      costoBase: libreCosto,
      medidas: '',
      ubicacion: '-',
      tipoPersiana: libreConcepto.trim(),
      tipoTela: '-',
      nombreTela: '-',
      color: '-',
      ladoMecanismo: '-',
      cantidad: libreCant || 1,
      precioVenta: libreCosto
    } as any;
    setSelectedItems(prev => [...prev, item]);
    setLibreConcepto(''); setLibreCant(1); setLibreCosto(0);
  };

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
            const response = await fetch('/.netlify/functions/claude-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [{ role: 'user', content: messageContent }] })
            });

            if (!response.ok) {
              const detalle = await response.text().catch(() => '');
              throw new Error(`HTTP ${response.status} ${detalle.slice(0, 200)}`);
            }

            const data = await response.json();
            if (data.error) {
              throw new Error(typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error)));
            }
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
            const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
            alert(`Error al procesar el archivo con IA:\n${msg}\n\nSi es Excel, usa el formato .xlsx directamente.`);
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
    // Precio inicial = costo fábrica (se recalculará con la fórmula correcta al generar PDF)
    const precioVenta = item.costoBase;
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
      const precioVenta = item.costoBase;
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

  // Total costos = Fábrica + Instalación + Andamios + Comisiones + Viáticos
  const totalCostos = calculateTotalFactoryCost() + totalExtras + viaticos;

  // Precio al cliente = Total costos × (1 + % utilidad)  (markup sobre costo, igual que el Excel manual)
  const subtotalCliente = totalCostos * (1 + markup / 100);
  const subtotalConExtras = subtotalCliente; // compatibilidad

  // Precio por partida (distribuido proporcionalmente al costo de fábrica)
  const totalFabrica = calculateTotalFactoryCost();

  // Precio por partida = (fábrica + parte de extras + parte de viáticos) × (1 + % utilidad)
  const precioCalculadoPartida = (item: any) => {
    const n = selectedItems.length || 1;
    const costoPartida = item.costoBase * item.cantidad + extraPerItem + viaticos / n;
    return costoPartida * (1 + markup / 100);
  };

  // Descuento sobre precio al cliente
  const descuentoMonto = subtotalCliente * (descuentoPct / 100);

  // Total al cliente = Precio - Descuento
  const totalFinal = subtotalCliente - descuentoMonto;

  // Utilidad neta = Total al cliente - Total costos
  const totalProfit = totalFinal - totalCostos;

  const generateFinalPDF = async () => {
    setIsGenerating(true);
    const doc = new jsPDF() as any;
    
    // Generar número de cotización
    const cotizacionNum = `${brand.prefijo || 'COT'}${Date.now().toString().slice(-5)}`;
    const fechaHoy = cotizacionFecha 
      ? new Date(cotizacionFecha + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    
    // --- HEADER ---
    // Logo HMG (base64)
    const defaultLogo = 'data:image/png;base64,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';
    
    const logoBase64 = brand.logo || defaultLogo;
    try {
      const props = doc.getImageProperties(logoBase64);
      const ratio = Math.min(40 / props.width, 20 / props.height);
      doc.addImage(logoBase64, props.fileType || 'PNG', 15, 8, props.width * ratio, props.height * ratio);
    } catch (e) {
      // Si falla el logo, usar texto
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(brand.nombre, 15, 18);
    }
    
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(brand.nombre, 15, 32);
    
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
    const totalFabricaPDF = calculateTotalFactoryCost();
    const tableData = selectedItems.map((item, idx) => {
      // Precio por partida proporcional al costo de fábrica
      const precioPartida = item.precioVentaManual !== undefined 
        ? item.precioVentaManual 
        : precioCalculadoPartida(item);
      
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
        `$${precioPartida.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      ];
    });

    doc.autoTable({
      startY: 50,
      head: [['No', 'Ubicación', ETIQUETA_TIPO[categoria], 'Tipo Tela', 'Nombre Tela', 'Color', 'Mec.', 'Costo']],
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
    const subtotal = subtotalCliente;
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
    doc.text(brand.vendedor, 19, contactY + 6);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(`WhatsApp: ${brand.whatsapp}`, 19, contactY + 12);
    doc.text(brand.web, 105, contactY + 12, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Guardar PDF y descargar inmediatamente
    const filename = `Cotizacion_${cotizacionNum}_${clientName || 'Cliente'}.pdf`;
    doc.save(filename);
    
    // Generar base64 por separado (para Drive) - sin bloquear la UI
    const pdfBase64 = doc.output('datauristring');
    
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
      filename
    };
    
    // Guardar en localStorage (sin el PDF para no saturar)
    try {
      const existing = JSON.parse(localStorage.getItem('hmg_cotizaciones') || '[]');
      existing.unshift(historyEntry);
      localStorage.setItem('hmg_cotizaciones', JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
    
    onSaveHistory(historyEntry);
    setIsGenerating(false); // Liberar UI inmediatamente
    
    // Enviar a Google Sheets en segundo plano (no bloquea)
    const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (GOOGLE_SCRIPT_URL) {
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
      
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetData)
      }).catch(err => console.error('Error enviando a Sheets:', err));
    }
  };

  const generateExcel = () => {
    const cotizacionNum = `${brand.prefijo || 'COT'}${Date.now().toString().slice(-5)}`;
    const iva16 = (subtotalConExtras - descuentoMonto) * 0.16;
    const totalConIVA = (subtotalConExtras - descuentoMonto) + iva16 + viaticos;

    const partidas = selectedItems.map((item, idx) => {
      const basePrice = item.precioVentaManual !== undefined ? item.precioVentaManual : precioCalculadoPartida(item);
      // Cliente no ve extras internos
      return {
        'No': idx + 1,
        'Ubicación': (item as any).ubicacion || '',
        'Tipo': (item as any).tipoPersiana || '',
        'Tipo Tela': (item as any).tipoTela || '',
        'Nombre Tela': (item as any).nombreTela || (item as any).modelo || '',
        'Color': (item as any).color || '',
        'Mecanismo': (item as any).ladoMecanismo || 'Derecho',
        'Precio Unitario': basePrice / (item.cantidad || 1),
        'Cantidad': item.cantidad,
        'Subtotal': basePrice
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
      { 'Campo': 'Vendedor', 'Valor': brand.vendedor },
      { 'Campo': 'WhatsApp', 'Valor': brand.whatsapp },
      { 'Campo': 'Web', 'Valor': brand.web },
    ];
    const ws2 = XLSX.utils.json_to_sheet(info);
    ws2['!cols'] = [{ wch: 18 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Info');

    XLSX.writeFile(wb, `Cotizacion_${cotizacionNum}_${clientName || 'Cliente'}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-32">
      <datalist id="tipos-tela-list">{TIPOS_TELA.map(t => <option key={t} value={t} />)}</datalist>
      <datalist id="nombres-tela-list">{NOMBRES_TELA.map(t => <option key={t} value={t} />)}</datalist>
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
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Utilidad sobre costo ({markup}%)</label>
            <input type="range" min="0" max="150" step="5" className="w-full accent-blue-600" value={markup} onChange={e => setMarkup(Number(e.target.value))} />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">¿Qué vas a cotizar?</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CATEGORIAS.map(c => (
                <button key={c.id} type="button" onClick={() => setCategoria(c.id)}
                  className={`p-3 rounded-xl border text-sm font-bold transition-colors ${categoria === c.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400'}`}>
                  <span className="mr-1">{c.icon}</span>{c.label}
                </button>
              ))}
            </div>
            {categoria === 'libre' && <p className="text-[11px] text-slate-400 mt-2">Modo libre: agrega conceptos con su costo en el paso 3 (la utilidad se aplica igual).</p>}
          </div>
        </div>

        <details className="mt-6 border border-slate-200 rounded-xl p-4 bg-slate-50">
          <summary className="text-xs font-bold text-slate-600 cursor-pointer">🎨 Personalizar marca (nombre, logo y contacto)</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre del negocio</label>
              <input className="w-full p-2 bg-white border rounded-lg" value={brand.nombre} onChange={e => updateBrand({ nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Prefijo de folio</label>
              <input className="w-full p-2 bg-white border rounded-lg" value={brand.prefijo} onChange={e => updateBrand({ prefijo: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contacto / vendedor</label>
              <input className="w-full p-2 bg-white border rounded-lg" value={brand.vendedor} onChange={e => updateBrand({ vendedor: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">WhatsApp</label>
              <input className="w-full p-2 bg-white border rounded-lg" value={brand.whatsapp} onChange={e => updateBrand({ whatsapp: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sitio web</label>
              <input className="w-full p-2 bg-white border rounded-lg" value={brand.web} onChange={e => updateBrand({ web: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Logo (PNG/JPG)</label>
              <div className="flex items-center gap-3">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="text-xs" onChange={handleLogoUpload} />
                {brand.logo && <img src={brand.logo} alt="Logo" className="h-10 border rounded bg-white" />}
                {brand.logo && <button type="button" className="text-[10px] text-red-500 font-bold" onClick={() => updateBrand({ logo: '' })}>Quitar</button>}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Se guarda en este navegador. Sin logo cargado se usa el de Home My God.</p>
        </details>
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
              {tiposActuales.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}
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
            <input list="tipos-tela-list" placeholder="Escribe o elige" className="w-full p-2 text-sm border rounded-lg bg-white" value={currentMeasure.tipoTela} onChange={e => setCurrentMeasure({...currentMeasure, tipoTela: e.target.value})} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase">Nombre Tela</label>
            <input list="nombres-tela-list" placeholder="Escribe o elige" className="w-full p-2 text-sm border rounded-lg bg-white" value={currentMeasure.nombreTela} onChange={e => setCurrentMeasure({...currentMeasure, nombreTela: e.target.value})} />
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
        <div className={`mt-4 p-4 rounded-xl border ${categoria === 'libre' ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className="text-[11px] font-bold text-slate-600 mb-2">➕ Concepto libre / accesorio (manivela, motor, servicio…) — lleva costo y utilidad</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
            <input className="col-span-2 p-2 text-sm border rounded-lg bg-white" placeholder="Concepto" value={libreConcepto} onChange={e => setLibreConcepto(e.target.value)} />
            <input type="number" min="1" className="p-2 text-sm border rounded-lg bg-white" placeholder="Cant." value={libreCant || ''} onChange={e => setLibreCant(Number(e.target.value))} />
            <input type="number" min="0" step="0.01" className="p-2 text-sm border rounded-lg bg-white" placeholder="Costo unit." value={libreCosto || ''} onChange={e => setLibreCosto(Number(e.target.value))} />
            <Button variant="primary" className="h-[38px]" onClick={addLibre}>Agregar</Button>
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
                      <input list="tipos-tela-list" placeholder="Escribe o elige"
                        className="w-full p-1.5 text-xs border rounded-lg bg-slate-50"
                        value={(item as any).tipoTela || ''}
                        onChange={e => {
                          const updated = [...factoryItems];
                          (updated[idx] as any).tipoTela = e.target.value;
                          setFactoryItems(updated);
                        }} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Nombre Tela</label>
                      <input list="nombres-tela-list" placeholder="Escribe o elige"
                        className="w-full p-1.5 text-xs border rounded-lg bg-slate-50"
                        value={(item as any).nombreTela || ''}
                        onChange={e => {
                          const updated = [...factoryItems];
                          (updated[idx] as any).nombreTela = e.target.value;
                          setFactoryItems(updated);
                        }} />
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
                const currentPrice = item.precioVentaManual !== undefined ? item.precioVentaManual : Number(precioCalculadoPartida(item).toFixed(2));
                return (
                  <div key={item.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row gap-6 items-center shadow-lg">
                    <div className="flex-1 text-center md:text-left">
                      <p className="font-bold text-sm tracking-tight">{item.descripcion}</p>
                      <div className="flex items-center gap-2 mt-1 justify-center md:justify-start flex-wrap">
                        <span className="text-[10px] text-blue-400 font-bold uppercase">Sugerido: ${precioCalculadoPartida(item).toFixed(2)}</span>
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

