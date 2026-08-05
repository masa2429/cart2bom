import type { CartItem } from "./models";

export interface ListTotal {
  amount: number;
  pricedItemCount: number;
  itemCount: number;
}

/** Calculates a display total and reports how many lines had usable price data. */
export function calculateListTotal(items: CartItem[]): ListTotal {
  let amount = 0;
  let pricedItemCount = 0;
  for (const item of items) {
    const subtotal = item.subtotal ?? (item.unitPrice === null ? null : item.unitPrice * item.quantity);
    if (subtotal === null) continue;
    amount += subtotal;
    pricedItemCount += 1;
  }
  return { amount, pricedItemCount, itemCount: items.length };
}

export function formatListTotal(total: ListTotal): string {
  const amount = `${total.amount.toLocaleString("ja-JP")}円`;
  const missing = total.itemCount - total.pricedItemCount;
  return missing === 0 ? `合計 ${amount}` : `合計 ${amount}（価格不明${missing}商品を除く）`;
}
