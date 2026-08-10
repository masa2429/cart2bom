import type { SavedList } from "../core/models";
import { EXPORT_COLUMNS, itemToExportValues, neutralizeFormula } from "./columns";

// Neutralize before collapsing, so a value led by a tab is still recognized.
function normalizeTsv(value: string): string {
  return neutralizeFormula(value).replace(/[\t\r\n]+/g, " ");
}

export function exportTsv(list: SavedList): string {
  const rows = [EXPORT_COLUMNS, ...list.items.map(itemToExportValues)];
  return `${rows.map((row) => row.map(normalizeTsv).join("\t")).join("\r\n")}\r\n`;
}
