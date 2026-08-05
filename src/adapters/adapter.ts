import type { CartItem } from "../core/models";

export interface ExtractionWarning {
  code: string;
  message: string;
  itemHint?: string;
}

export interface CartExtractionResult {
  items: CartItem[];
  warnings: ExtractionWarning[];
  detectedCount: number | null;
}

export interface StoreAdapter {
  readonly id: string;
  readonly name: string;
  readonly listNamePrefix: string;
  matches(url: URL): boolean;
  isCartPage(url: URL, document: Document): boolean;
  getCartUrl(): string | null;
  prepareCart?(document: Document): Promise<void>;
  extractCart(document: Document): CartExtractionResult;
  readonly quickOrderName?: string;
  readonly quickOrderCodeRequirement?: string;
  readonly quickOrderCapacity?: number;
  validateQuickOrderCode?(code: string): boolean;
  createQuickOrderText?(items: CartItem[]): string;
  getQuickOrderUrl?(): string | null;
  isQuickOrderPage?(url: URL, document: Document): boolean;
  fillQuickOrder?(document: Document, text: string): number | Promise<number>;
  submitQuickOrder?(document: Document, text: string): number | Promise<number>;
}
