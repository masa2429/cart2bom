import { describe, expect, it } from "vitest";
import { AkizukiAdapter } from "../../src/adapters/akizuki";
import { CURRENT_SCHEMA_VERSION, type CartItem, type SavedList } from "../../src/core/models";
import { parseSavedListJson } from "../../src/core/validation";
import { exportCsv } from "../../src/exporters/csv";
import { exportJson } from "../../src/exporters/json";
import { exportQuickOrder, QuickOrderValidationError } from "../../src/exporters/quick-order";
import { exportTsv } from "../../src/exporters/tsv";

const item: CartItem = {
  id: "akizuki:105148", storeId: "akizuki", storeName: "秋月電子通商", orderCode: "105148",
  manufacturerPartNumber: 'MPN"1', name: "抵抗, 1kΩ\n高精度", quantity: 2, unitPrice: 100,
  subtotal: 200, currency: "JPY", productUrl: "https://example.test/item", imageUrl: null,
  stockStatus: null, leadTime: null, note: "A\tB\nC", capturedAt: "2026-08-04T00:00:00.000Z",
};
const list: SavedList = {
  id: "list-1", schemaVersion: CURRENT_SCHEMA_VERSION, name: "テスト", description: "", tags: [],
  items: [item], createdAt: "2026-08-04T00:00:00.000Z", updatedAt: "2026-08-04T00:00:00.000Z",
};

describe("exporters", () => {
  it("CSVのカンマ、引用符、改行をRFC 4180相当にエスケープする", () => {
    const csv = exportCsv(list);
    expect(csv).toContain('"MPN""1"');
    expect(csv).toContain('"抵抗, 1kΩ\n高精度"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("TSVのタブと改行を空白へ正規化する", () => {
    const tsv = exportTsv(list);
    expect(tsv).toContain("A B C");
    expect(tsv).not.toContain("A\tB");
  });

  it("JSONを再インポートできる", () => {
    expect(parseSavedListJson(exportJson(list))).toEqual({ ok: true, value: list });
  });

  it("秋月一括注文で同じ通販コードの数量を合算する", () => {
    expect(exportQuickOrder({ ...list, items: [item, { ...item, quantity: 3 }] }, new AkizukiAdapter()))
      .toBe("105148\t5");
  });

  it("不正な通販コードと数量を拒否する", () => {
    const invalid = { ...item, orderCode: "123", quantity: 0 };
    expect(() => exportQuickOrder({ ...list, items: [invalid] }, new AkizukiAdapter()))
      .toThrow(QuickOrderValidationError);
  });
});
