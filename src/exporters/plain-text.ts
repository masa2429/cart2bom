import type { SavedList } from "../core/models";
import { calculateListTotal, formatListTotal } from "../core/totals";

function oneLine(value: string): string {
  return value.replace(/[\t\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function yen(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("ja-JP")}円`;
}

/** Exports a list as readable plain text for chat and email. */
export function exportPlainText(list: SavedList): string {
  const lines = [list.name];
  if (list.description.trim()) lines.push(oneLine(list.description));
  if (list.tags.length > 0) lines.push(`タグ: ${list.tags.map(oneLine).join(", ")}`);
  lines.push("");
  const stores = new Map<string, typeof list.items>();
  for (const item of list.items) {
    const group = stores.get(item.storeName) ?? [];
    group.push(item);
    stores.set(item.storeName, group);
  }
  for (const [storeName, items] of stores) {
    lines.push(`【${oneLine(storeName)}】`);
    items.forEach((item, index) => {
      lines.push(`${index + 1}. ${oneLine(item.name)}`);
      lines.push(`   通販コード・型番: ${oneLine(item.orderCode)}`);
      const manufacturer = oneLine(item.manufacturerName ?? "");
      const mpn = oneLine(item.manufacturerPartNumber ?? "");
      if (manufacturer || mpn) {
        lines.push(`   メーカー: ${manufacturer || "—"} / メーカー型番: ${mpn || "—"}`);
      }
      lines.push(`   数量: ${item.quantity}${item.salesUnit ? ` / 販売単位: ${oneLine(item.salesUnit)}` : ""}`);
      const subtotal = item.subtotal ?? (item.unitPrice === null ? null : item.unitPrice * item.quantity);
      lines.push(`   単価: ${yen(item.unitPrice)} / 小計: ${yen(subtotal)}`);
      if (item.note.trim()) lines.push(`   備考: ${oneLine(item.note)}`);
      lines.push(`   ${item.productUrl}`);
    });
    lines.push("");
  }
  lines.push(formatListTotal(calculateListTotal(list.items)));
  return `${lines.join("\n")}\n`;
}
