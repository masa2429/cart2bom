export const CURRENT_SCHEMA_VERSION = 1;

export interface CartItem {
  id: string;
  storeId: string;
  storeName: string;
  orderCode: string;
  manufacturerPartNumber: string | null;
  name: string;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
  currency: "JPY";
  productUrl: string;
  imageUrl: string | null;
  stockStatus: string | null;
  leadTime: string | null;
  note: string;
  capturedAt: string;
}

export interface SavedList {
  id: string;
  schemaVersion: number;
  name: string;
  description: string;
  tags: string[];
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  schemaVersion: number;
  buttonSide: "left" | "right";
  confirmBeforeDelete: boolean;
  defaultExportFormat: "csv" | "tsv" | "json" | "quickOrder";
}

export const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  buttonSide: "right",
  confirmBeforeDelete: true,
  defaultExportFormat: "csv",
};

export const STORAGE_KEYS = {
  settings: "cart2bom.settings",
  lists: "cart2bom.lists",
  migrations: "cart2bom.migrations",
} as const;
