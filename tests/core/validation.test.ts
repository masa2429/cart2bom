import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION, type CartItem, type SavedList } from "../../src/core/models";
import {
  parseSavedListJson,
  validateCartItem,
  validateOrderCode,
  validateQuantity,
} from "../../src/core/validation";

const item: CartItem = {
  id: "akizuki:105148",
  storeId: "akizuki",
  storeName: "秋月電子通商",
  orderCode: "105148",
  manufacturerName: null,
  manufacturerPartNumber: null,
  name: "テスト商品",
  salesUnit: "1セット",
  quantity: 2,
  unitPrice: 100,
  subtotal: 200,
  currency: "JPY",
  productUrl: "https://akizukidenshi.com/catalog/g/g105148/",
  imageUrl: null,
  stockStatus: null,
  leadTime: null,
  note: "",
  capturedAt: "2026-08-04T00:00:00.000Z",
};

const list: SavedList = {
  id: "list-1",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  name: "テスト",
  description: "",
  tags: [],
  items: [item],
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
};

describe("validation", () => {
  it("数量0と小数を拒否する", () => {
    expect(validateQuantity(0)).toBe(false);
    expect(validateQuantity(1.5)).toBe(false);
    expect(validateQuantity(1)).toBe(true);
  });

  it("秋月の不正な通販コードを拒否する", () => {
    expect(validateOrderCode("akizuki", "12345")).toBe(false);
    expect(validateOrderCode("akizuki", "105148")).toBe(true);
  });

  it("有効な商品を受理する", () => {
    expect(validateCartItem(item).ok).toBe(true);
  });

  it("HTTPS以外の商品URLを拒否する", () => {
    for (const productUrl of ["javascript:alert(1)", "data:text/html,x", "http://example.test/", "/catalog/g/g105148/"]) {
      expect(validateCartItem({ ...item, productUrl }).ok).toBe(false);
    }
  });

  it("不正なJSONを拒否する", () => {
    expect(parseSavedListJson("{broken").ok).toBe(false);
  });

  it("未知のスキーマバージョンを拒否する", () => {
    expect(parseSavedListJson(JSON.stringify({ ...list, schemaVersion: 99 })).ok).toBe(false);
  });

  it("有効な保存リストを受理する", () => {
    expect(parseSavedListJson(JSON.stringify(list))).toEqual({ ok: true, value: list });
  });

  it("旧保存データの追加項目欠落をnullとして補完する", () => {
    const legacyItem = { ...item } as Partial<CartItem>;
    delete legacyItem.manufacturerName;
    delete legacyItem.salesUnit;
    const result = parseSavedListJson(JSON.stringify({ ...list, items: [legacyItem] }));
    expect(result).toEqual({
      ok: true,
      value: {
        ...list,
        items: [{ ...item, manufacturerName: null, salesUnit: null }],
      },
    });
  });
});
