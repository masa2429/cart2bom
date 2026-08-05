import type { CartItem } from "../core/models";

export const EXPORT_COLUMNS = [
  "store", "orderCode", "manufacturerPartNumber", "name", "quantity", "unitPrice",
  "subtotal", "currency", "productUrl", "note", "capturedAt",
] as const;

export function itemToExportValues(item: CartItem): string[] {
  return [
    item.storeName,
    item.orderCode,
    item.manufacturerPartNumber ?? "",
    item.name,
    String(item.quantity),
    item.unitPrice === null ? "" : String(item.unitPrice),
    item.subtotal === null ? "" : String(item.subtotal),
    item.currency,
    item.productUrl,
    item.note,
    item.capturedAt,
  ];
}
