import type { SavedList } from "../core/models";
import { EXPORT_COLUMNS, itemToExportValues, neutralizeFormula } from "./columns";

function escapeCsv(value: string): string {
  const text = neutralizeFormula(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportCsv(list: SavedList): string {
  const rows = [EXPORT_COLUMNS, ...list.items.map(itemToExportValues)];
  return `${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}
