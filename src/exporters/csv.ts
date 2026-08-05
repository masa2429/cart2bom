import type { SavedList } from "../core/models";
import { EXPORT_COLUMNS, itemToExportValues } from "./columns";

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportCsv(list: SavedList): string {
  const rows = [EXPORT_COLUMNS, ...list.items.map(itemToExportValues)];
  return `${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}
