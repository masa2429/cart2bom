import type { SavedList } from "../core/models";

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

export function exportMarkdown(list: SavedList): string {
  const lines = [
    `# ${list.name}`,
    "",
    list.description,
    "",
    "| 店舗 | 通販コード | 商品名 | 数量 | 単価 | 小計 | 備考 |",
    "|---|---|---|---:|---:|---:|---|",
    ...list.items.map((item) =>
      `| ${escapeCell(item.storeName)} | ${escapeCell(item.orderCode)} | ${escapeCell(item.name)} | ${item.quantity} | ${item.unitPrice ?? ""} | ${item.subtotal ?? ""} | ${escapeCell(item.note)} |`,
    ),
    "",
  ];
  return lines.join("\n");
}
