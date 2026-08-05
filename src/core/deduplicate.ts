import type { CartItem } from "./models";

export interface DeduplicationResult {
  items: CartItem[];
  warnings: string[];
}

/** Merges identical store/code rows only when their known prices do not conflict. */
export function deduplicateItems(items: CartItem[]): DeduplicationResult {
  const merged = new Map<string, CartItem>();
  const conflicts: CartItem[] = [];
  const warnings: string[] = [];
  for (const source of items) {
    const key = `${source.storeId}:${source.orderCode}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, structuredClone(source));
      continue;
    }
    if (
      existing.unitPrice !== null &&
      source.unitPrice !== null &&
      existing.unitPrice !== source.unitPrice
    ) {
      warnings.push(`${source.storeName} ${source.orderCode}は単価が異なるため統合しませんでした。`);
      conflicts.push(structuredClone(source));
      continue;
    }
    const quantity = existing.quantity + source.quantity;
    const mergedUnitPrice = source.unitPrice ?? existing.unitPrice;
    merged.set(key, {
      ...existing,
      name: source.name || existing.name,
      quantity,
      unitPrice: mergedUnitPrice,
      subtotal: mergedUnitPrice === null ? null : mergedUnitPrice * quantity,
      note: [existing.note, source.note].filter(Boolean).join("\n"),
      productUrl: existing.productUrl || source.productUrl,
      capturedAt: source.capturedAt,
    });
  }
  return { items: [...merged.values(), ...conflicts], warnings };
}
