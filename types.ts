
export type ChecklistType = 'Diário' | 'Semanal';
export type ItemStatus = 'OK' | 'CN' | 'PENDING';
export type ItemFrequency = 'Diário' | 'Semanal' | 'Ambos';
export type AspectRatio = 'landscape' | 'portrait';

export interface DamagePoint {
  id: string;
  x: number;
  y: number;
  imageIndex: number;
  description: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: ItemStatus;
  frequency: ItemFrequency;
  observation?: string;
  photos?: string[];
}

export interface InspectionData {
  id: string;
  date: string;
  prefix: string;
  checklistType: ChecklistType;
  plate: string;
  km: string;
  items: ChecklistItem[];
  damages: DamagePoint[];
  photos: string[];
  vehicleImages: string[];
  vehicleImageRatios?: AspectRatio[];
  generalObservation: string;
  signatureName?: string;
  signatureRank?: string;
}

export interface AppSettings {
  vehicleImages: string[];
  vehicleImageRatios?: AspectRatio[];
  defaultItems: Omit<ChecklistItem, 'status'>[];
  headerTitle?: string;
  headerLogoUrl1?: string;
  headerLogoUrl2?: string;
  headerBgColor?: string;
  printScale?: number;
  googleSheetUrl?: string; 
}

export interface LogEntry {
  id: string;
  date: string;
  prefix: string;
  plate: string;
  checklistType: string;
  km: string;
  inspector: string;
  itemsStatus: string; 
  itemsDetail?: string; // JSON string dos itens sem fotos
  fullData?: string;    // JSON string completo da inspeção (para reimpressão fiel)
  generalObservation?: string;
  screenshot?: string;   // Base64 da imagem do checklist preenchido
}
