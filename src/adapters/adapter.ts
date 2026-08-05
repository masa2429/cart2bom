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
  extractCart(document: Document): CartExtractionResult;
  createQuickOrderText?(items: CartItem[]): string;
  getQuickOrderUrl?(): string | null;
}
