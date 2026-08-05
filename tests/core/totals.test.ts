import { describe, expect, it } from "vitest";
import type { CartItem } from "../../src/core/models";
import { calculateListTotal, formatListTotal } from "../../src/core/totals";

const baseItem: CartItem = {
  id: "akizuki:105148",
  storeId: "akizuki",
  storeName: "秋月電子通商",
  orderCode: "105148",
  manufacturerName: null,
  manufacturerPartNumber: null,
  name: "商品",
  salesUnit: "1個",
  quantity: 2,
  unitPrice: 100,
  subtotal: 200,
  currency: "JPY",
  productUrl: "https://example.test/item",
  imageUrl: null,
  stockStatus: null,
  leadTime: null,
  note: "",
  capturedAt: "2026-08-05T00:00:00.000Z",
};

describe("list totals", () => {
  it("明細の小計から合計金額を算出する", () => {
    const total = calculateListTotal([baseItem, { ...baseItem, id: "akizuki:105149", subtotal: 350 }]);
    expect(total).toEqual({ amount: 550, pricedItemCount: 2, itemCount: 2 });
    expect(formatListTotal(total)).toBe("合計 550円");
  });

  it("価格不明の商品数を表示する", () => {
    const total = calculateListTotal([{ ...baseItem, unitPrice: null, subtotal: null }]);
    expect(formatListTotal(total)).toBe("合計 0円（価格不明1商品を除く）");
  });
});
