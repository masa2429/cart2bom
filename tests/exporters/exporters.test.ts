import { describe, expect, it } from "vitest";
import { AkizukiAdapter } from "../../src/adapters/akizuki";
import { MonotaroAdapter } from "../../src/adapters/monotaro";
import { MisumiAdapter } from "../../src/adapters/misumi";
import { CURRENT_SCHEMA_VERSION, type CartItem, type SavedList } from "../../src/core/models";
import { parseSavedListJson } from "../../src/core/validation";
import { exportCsv } from "../../src/exporters/csv";
import { exportJson } from "../../src/exporters/json";
import { exportMarkdown } from "../../src/exporters/markdown";
import { exportPlainText } from "../../src/exporters/plain-text";
import {
  exportQuickOrder,
  exportQuickOrderBatches,
  QuickOrderValidationError,
} from "../../src/exporters/quick-order";
import { exportTsv } from "../../src/exporters/tsv";

const item: CartItem = {
  id: "akizuki:105148", storeId: "akizuki", storeName: "秋月電子通商", orderCode: "105148",
  manufacturerName: "部品メーカー", manufacturerPartNumber: 'MPN"1', name: "抵抗, 1kΩ\n高精度", salesUnit: "1袋100本入", quantity: 2, unitPrice: 100,
  subtotal: 200, currency: "JPY", productUrl: "https://example.test/item", imageUrl: "https://example.test/item.jpg",
  stockStatus: null, leadTime: null, note: "A\tB\nC", capturedAt: "2026-08-04T00:00:00.000Z",
};
const list: SavedList = {
  id: "list-1", schemaVersion: CURRENT_SCHEMA_VERSION, name: "テスト", description: "", tags: [],
  items: [item], createdAt: "2026-08-04T00:00:00.000Z", updatedAt: "2026-08-04T00:00:00.000Z",
};

describe("exporters", () => {
  it("CSVのカンマ、引用符、改行をRFC 4180相当にエスケープする", () => {
    const csv = exportCsv(list);
    expect(csv).toContain("manufacturerName,manufacturerPartNumber,name,salesUnit");
    expect(csv).toContain("productUrl,imageUrl,note");
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

  it("Markdownへ画像、メーカー情報、販売単位、合計金額を出力する", () => {
    const markdown = exportMarkdown(list);
    expect(markdown).toContain("[画像](https://example.test/item.jpg)");
    expect(markdown).toContain("部品メーカー");
    expect(markdown).toContain("1袋100本入");
    expect(markdown).toContain("**合計 200円**");
  });

  it("チャットへ貼り付けやすい平文を出力する", () => {
    const plain = exportPlainText(list);
    expect(plain).toContain("【秋月電子通商】");
    expect(plain).toContain("1. 抵抗, 1kΩ 高精度");
    expect(plain).toContain('メーカー: 部品メーカー / メーカー型番: MPN"1');
    expect(plain).toContain("数量: 2 / 販売単位: 1袋100本入");
    expect(plain).toContain("単価: 100円 / 小計: 200円");
    expect(plain).toContain("備考: A B C");
    expect(plain).toContain("https://example.test/item");
    expect(plain).toContain("合計 200円");
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

  it("モノタロウクイックオーダーへ8桁の注文コードと数量を出力する", () => {
    const monotaroItem = {
      ...item,
      id: "monotaro:47817527",
      storeId: "monotaro",
      storeName: "モノタロウ",
      orderCode: "47817527",
      quantity: 2,
    };
    expect(exportQuickOrder({ ...list, items: [monotaroItem] }, new MonotaroAdapter()))
      .toBe("47817527\t2");
  });

  it("モノタロウの11商品を10件以下のバッチへ分割する", () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      ...item,
      id: `monotaro:${String(10000000 + index)}`,
      storeId: "monotaro",
      storeName: "モノタロウ",
      orderCode: String(10000000 + index),
    }));
    const batches = exportQuickOrderBatches({ ...list, items }, new MonotaroAdapter());
    expect(batches).toHaveLength(2);
    expect(batches[0]?.split("\n")).toHaveLength(10);
    expect(batches[1]).toBe("10000010\t2");
  });

  it("ミスミ見積・注文へ型番、数量、メーカー名を出力する", () => {
    const misumiItem = {
      ...item,
      id: "misumi:CB3-10",
      storeId: "misumi",
      storeName: "ミスミ",
      orderCode: "CB3-10",
      manufacturerName: "ミスミ",
      quantity: 4,
    };
    expect(exportQuickOrder({ ...list, items: [misumiItem] }, new MisumiAdapter()))
      .toBe("CB3-10\t4\tミスミ");
  });
});
