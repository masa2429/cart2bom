import { describe, expect, it } from "vitest";
import { deduplicateItems } from "../../src/core/deduplicate";
import type { CartItem } from "../../src/core/models";

const item: CartItem = {
  id: "akizuki:105148", storeId: "akizuki", storeName: "秋月電子通商", orderCode: "105148",
  manufacturerName: null, manufacturerPartNumber: null, name: "商品", salesUnit: "1個", quantity: 1, unitPrice: 100, subtotal: 100,
  currency: "JPY", productUrl: "https://example.test/item", imageUrl: null, stockStatus: null,
  leadTime: null, note: "最初", capturedAt: "2026-08-04T00:00:00.000Z",
};

describe("deduplicateItems", () => {
  it("同一商品を数量合算する", () => {
    const result = deduplicateItems([item, { ...item, quantity: 2, note: "次" }]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ quantity: 3, subtotal: 300, note: "最初\n次" });
  });

  it("単価が違う商品は統合せず警告する", () => {
    const result = deduplicateItems([item, { ...item, unitPrice: 200 }]);
    expect(result.items).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
  });
});
