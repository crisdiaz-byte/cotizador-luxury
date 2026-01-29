
export interface Measurement {
  id: string;
  no: number;
  ancho: number;
  alto: number;
  mt2: number;
  tipoPersiana: string;
  tipoTela: string;
  nombreTela: string;
  color: string;
  ladoMecanismo: 'Izquierdo' | 'Derecho';
  ubicacion: string;
  notas?: string;
}

export interface FactoryItem {
  id: string;
  descripcion: string;
  costoBase: number;
  medidas?: string;
}

export interface QuoteItem extends FactoryItem {
  cantidad: number;
  precioVenta: number;
  precioVentaManual?: number; 
}

export interface HistoryEntry {
  id: string;
  fecha: string;
  cliente: string;
  totalVenta: number;
  utilidad: number;
  markupAplicado: number;
  items: number;
}

export enum AppTab {
  NEW_QUOTE = 'new',
  HISTORY = 'history'
}
