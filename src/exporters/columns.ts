import type { CartItem } from "../core/models";

// Excel, LibreOffice and Google Sheets evaluate a cell that begins with one of
// these characters as a formula, including when it came from a quoted CSV field.
// Leading blanks are allowed for because spreadsheets ignore them when parsing.
const FORMULA_LEAD = /^[\t\r ]*[=+\-@]/;

/**
 * Prefixes a leading formula character with an apostrophe so spreadsheets treat
 * the cell as text. Shared lists come from other people, so an item name such as
 * `=HYPERLINK(...)` must not run when the recipient opens the export.
 *
 * Numeric columns are non-negative integers, so this never touches them.
 */
export function neutralizeFormula(value: string): string {
  return FORMULA_LEAD.test(value) ? `'${value}` : value;
}

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
