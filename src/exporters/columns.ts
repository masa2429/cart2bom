import type { CartItem } from "../core/models";

export const EXPORT_COLUMNS = [
  "store", "orderCode", "manufacturerName", "manufacturerPartNumber", "name", "salesUnit",
  "quantity", "unitPrice", "subtotal", "currency", "productUrl", "imageUrl", "note", "capturedAt",
] as const;

export function itemToExportValues(item: CartItem): string[] {
  return [
    item.storeName,
    item.orderCode,
    item.manufacturerName ?? "",
    item.manufacturerPartNumber ?? "",
    item.name,
    item.salesUnit ?? "",
    String(item.quantity),
    item.unitPrice === null ? "" : String(item.unitPrice),
    item.subtotal === null ? "" : String(item.subtotal),
    item.currency,
    item.productUrl,
    item.imageUrl ?? "",
    item.note,
    item.capturedAt,
  ];
}
