import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_SCHEMA_VERSION, type SavedList } from "../../src/core/models";
import { openSavedLists, type SavedListActions } from "../../src/ui/saved-lists";

const list: SavedList = {
  id: "list-1",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  name: "画像付きリスト",
  description: "",
  tags: [],
  items: [{
    id: "akizuki:105148",
    storeId: "akizuki",
    storeName: "秋月電子通商",
    orderCode: "105148",
    manufacturerName: "メーカー",
    manufacturerPartNumber: "MPN-1",
    name: "画像付き商品",
    salesUnit: "1セット",
    quantity: 3,
    unitPrice: 100,
    subtotal: 300,
    currency: "JPY",
    productUrl: "https://example.test/item",
    imageUrl: "https://example.test/item.jpg",
    stockStatus: null,
    leadTime: null,
    note: "",
    capturedAt: "2026-08-05T00:00:00.000Z",
  }],
  createdAt: "2026-08-05T00:00:00.000Z",
  updatedAt: "2026-08-05T00:00:00.000Z",
};

describe("openSavedLists", () => {
  beforeEach(() => document.body.replaceChildren());

  it("商品画像と合計金額をリストカードへ表示する", () => {
    const actions: SavedListActions = {
      confirmBeforeDelete: true,
      onOpen: vi.fn(),
      onDuplicate: vi.fn(async () => undefined),
      onRename: vi.fn(async () => undefined),
      onDelete: vi.fn(async () => undefined),
      onExport: vi.fn(),
      onCopyQuickOrder: vi.fn(async () => undefined),
      onOpenQuickOrder: vi.fn(async () => undefined),
      onDefaultExport: vi.fn(),
    };

    openSavedLists(document, [list], actions);

    expect(document.querySelector(".cart2bom-list-card p")?.textContent).toContain("合計 300円");
    const image = document.querySelector<HTMLImageElement>(".cart2bom-list-images img");
    expect(image?.src).toBe("https://example.test/item.jpg");
    expect(image?.alt).toBe("画像付き商品");
  });

  it("非対応店舗では秋月一括注文ボタンを表示しない", () => {
    const actions: SavedListActions = {
      confirmBeforeDelete: true,
      quickOrderAvailable: false,
      onOpen: vi.fn(),
      onDuplicate: vi.fn(async () => undefined),
      onRename: vi.fn(async () => undefined),
      onDelete: vi.fn(async () => undefined),
      onExport: vi.fn(),
      onCopyQuickOrder: vi.fn(async () => undefined),
      onOpenQuickOrder: vi.fn(async () => undefined),
      onDefaultExport: vi.fn(),
    };

    openSavedLists(document, [list], actions);

    expect(document.body.textContent).not.toContain("秋月一括注文");
  });
});
