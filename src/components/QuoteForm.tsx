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

    // --- PDF o Imagen: usa Claude Vision API via proxy ---
    if (fileExt === 'pdf' || ['jpg','jpeg','png','webp'].includes(fileExt || '')) {
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          const mediaType = file.type || (fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg');

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
    const logoBase64 = 'data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAFlAqsDASIAAhEBAxEB/8QAHAABAAMBAQEBAQAAAAAAAAAAAAYHCAUEAwIB/8QAWxAAAQMCAgMICg0ICQIFBQEAAQACAwQFBhEHITEIEhMXNkFhshQiN1FVcXR1ktIyNUJSYnJzgZOUobGzFSNTVJGkwdEWM1aCg4TCw+FjoiREo9PwGGVmpeND/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AMZIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIuphrD92xFcBQ2mkfPJq37tjIx33O2AffzZoOWrP0e6J6+7cHcMQiSgoTrbBllNKOn3g8evoGoqwdHujO04aEdbW7y4XQAHhXN/NxH4DTz/COvvZbFPUHFkwph2SxNsj7RSmgaO1i3nsTllvg7bvvhZ59KpvSBoluFq4Svw8ZbhRDW6DLOaIdGXsx4tfQdqv5EGMjqORRaR0haNLTiYSVtHvLfdCM+Fa3tJT8No6w1+PLJUHibD92w5cHUN2pHwSa947ayQd9rthH3c+SDlIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAi6Fgstzv1wbQWqjkqZ3ayGjU0d9x2AdJV86PdF1sw/wdfdeDuNzbk5uYzihPwQdp+EejIBBXuj3RXc76I6+88Jbrce2a0jKaYdAPsR0n5gc81e9is9tsdvZQWqkjpaduvesGtx75O0npK96ICIiAi/hcAQCQMzkMztX9QF4L7Z7bfLe+gutJHVU7te9eNbT3wdoPSF70QZ50haK7nYuEr7Nwlxtw7ZzQM5oR0geyHSPnAyzVcLZqrzSFouteIOEr7Vwduubs3OIH5qY/CA2H4Q6cwUGdUXRxBZLpYbg6gu1HJTTDWN8O1eO+07COkLnICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiL22a1XC817KC10ktVUv2MYNg75OwDpOpB4lP9HujG64j4OuuG/t1rOTg9zfzkw+ADzfCOrXqzVhaPdFFvs3B19+4K4V41tiyzhiPiPsj0nV0as1ZiDmYcsVqw9b20NppGU8Q1uI1uee+47SV00RARF5brcaG1UMldcaqKlpoxm6SR2Q8XSegayg9ShWP9I1mws19KwivuYGqmjdqYfhu9z4tuzVlrVd6QdLdbceEt+GuEoqTW11UdU0g+D7wfbs2bFVjiXOLnEkk5knnQdvFGK75iO5NrrlWvLo3b6GOMlrIdfuBzHp26hrU/wBHWluek4O24pc+op9TWVoGcjPjj3Q6dvjzVSIg2PR1VNW0sdVSTxVEEg3zJI3BzXDoIX2WVMF4yveFKrf26ff0znZy0smuN/TlzHpGvVzjUtAYEx5ZMWQiOnk7Frw3OSkld23SWn3Q6Rr74CCVoiIObiKx2rEFvdQ3ajjqYTrbnqcw99p2g+JULpC0YXXDvCV1t4S42xubi4N/Owj4YG0fCGrbmAtGIgxki0HpC0VW698JX2PgrdcD2zmZZQzHpA9iekfONeaoq92m42W4PoLpSS0tQzax42jvg7COkakHhREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBF6rXb626V0dDbqWWpqZTkyONuZPT0DpOoK79HuiSjt3B3DEojrav2TaUa4Yz8L35+zbt2oK+0faN7vihzKucOoLWTmZ3t7aQf9NvP49njyyV/YWw5aMNW8UdppWxNOXCSHXJKe+53P8AcOYBdYAAAAAAbAF/UBERAReW63GhtVDJXXGqipaaMZukkdkPF0noGsqkNIOlutuPCW/DXCUVJra6qOqaQfB94Pt2bNiCxMf6RrNhZr6WMivuYGqmjdqjPw3e58W3Zqy1qgcWYnvOJ67sq7VRkDSeDhZ2scQ7zW/x1k85XGcS5xc4kknMk86/iAiIgIiIC/cMssEzJoZHxyscHMexxDmkbCCNhX4RBcGj7S/JDwdvxXvpYx2ra5jc3t+O0bfGNfQdqueiqqatpY6qjniqIJBvmSRuDmuHQQscKRYLxje8KVXCW6o31O52ctLJrjk6cuY9I16u9qQarRRPAmPLJiyIR08nYteBm+kld23SWn3Q8WvvgKWIC5OJ8O2jElvNFdqRszNe8eNT4z32u2g/YefNdZEGbdIOjW74ZMlZS764WsEnhmN7eIfDbzfGGrxZ5KCLZpAIyOsKrtIWiahunCXDDvB0FadbqfZDKej3h8WroGsoKDReu7W2vtNfJQ3KllpamM5OjkGR8Y746RqK8iAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIiICIiAiIgIi+9BSVVfVx0lFTy1FRKcmRxtLnOPQAg+CmOAdHt5xW9tQGmitufbVUjfZdDB7o/Zt18ysDR7oigpeDuOKQyonGTmUTTnGw/DPuj0DV4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';
    
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
    doc.text(\`$\${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\`, totalsVal, finalY + 5, { align: 'right' });
    
    doc.text(\`DESCUENTO (\${descuentoPct}%)\`, totalsX, finalY + 12);
    doc.setTextColor(200, 0, 0);
    doc.text(\`-$\${descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\`, totalsVal, finalY + 12, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    doc.text('SUBTOTAL', totalsX, finalY + 19);
    doc.text(\`$\${sub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\`, totalsVal, finalY + 19, { align: 'right' });
    
    if (viaticos > 0) {
      doc.text('VIÁTICOS', totalsX, finalY + 26);
      doc.text(\`$\${viaticos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\`, totalsVal, finalY + 26, { align: 'right' });
    }
    
    const ivaY = finalY + (viaticos > 0 ? 33 : 26);
    doc.text('IVA (16%)', totalsX, ivaY);
    doc.text(\`$\${iva16.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\`, totalsVal, ivaY, { align: 'right' });
    
    doc.setFillColor(220, 235, 250);
    doc.rect(totalsX - 2, ivaY + 3, totalsVal - totalsX + 4, 9, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL CON IVA', totalsX, ivaY + 9);
    doc.text(\`$\${totalConIVA.toLocaleString('es-MX', { minimumFractionDigits: 2 })}\`, totalsVal, ivaY + 9, { align: 'right' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    doc.text('ANTICIPO (70%)', totalsX, ivaY + 18);
    doc.text(\`$\${(totalConIVA * 0.7).toLocaleString('es-MX', { minimumFractionDigits: 2 })}\`, totalsVal, ivaY + 18, { align: 'right' });
    
    doc.text('SALDO (30%)', totalsX, ivaY + 25);
    doc.text(\`$\${(totalConIVA * 0.3).toLocaleString('es-MX', { minimumFractionDigits: 2 })}\`, totalsVal, ivaY + 25, { align: 'right' });
    
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
