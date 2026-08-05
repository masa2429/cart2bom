import type { SavedList } from "../core/models";
import { calculateListTotal, formatListTotal } from "../core/totals";

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

export function exportMarkdown(list: SavedList): string {
  const lines = [
    `# ${list.name}`,
    "",
    list.description,
    "",
    "| 画像 | 店舗 | 通販コード | 商品名 | メーカー | メーカー型番 | 販売単位 | 数量 | 単価 | 小計 | 備考 |",
    "|---|---|---|---|---|---|---|---:|---:|---:|---|",
    ...list.items.map((item) =>
      `| ${item.imageUrl ? `[画像](${item.imageUrl})` : ""} | ${escapeCell(item.storeName)} | ${escapeCell(item.orderCode)} | ${escapeCell(item.name)} | ${escapeCell(item.manufacturerName ?? "")} | ${escapeCell(item.manufacturerPartNumber ?? "")} | ${escapeCell(item.salesUnit ?? "")} | ${item.quantity} | ${item.unitPrice ?? ""} | ${item.subtotal ?? ""} | ${escapeCell(item.note)} |`,
    ),
    "",
    `**${formatListTotal(calculateListTotal(list.items))}**`,
    "",
  ];
  return lines.join("\n");
}
