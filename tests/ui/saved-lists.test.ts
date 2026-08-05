import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_SCHEMA_VERSION, type SavedList } from "../../src/core/models";
import {
  filterSavedListsByStore,
  openSavedLists,
  type SavedListActions,
} from "../../src/ui/saved-lists";

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
      onCopyPlainText: vi.fn(async () => undefined),
      onCopyShareUrl: vi.fn(async () => undefined),
      onCopyQuickOrder: vi.fn(async () => undefined),
      onOpenQuickOrder: vi.fn(async () => undefined),
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
      onCopyPlainText: vi.fn(async () => undefined),
      onCopyShareUrl: vi.fn(async () => undefined),
      onCopyQuickOrder: vi.fn(async () => undefined),
      onOpenQuickOrder: vi.fn(async () => undefined),
    };

    openSavedLists(document, [list], actions);

    expect(document.body.textContent).not.toContain("秋月一括注文");
  });

  it("一括注文関連の操作を簡潔な名前で表示する", () => {
    const actions: SavedListActions = {
      confirmBeforeDelete: true,
      quickOrderAvailable: true,
      quickOrderAutoFill: true,
      onOpen: vi.fn(),
      onDuplicate: vi.fn(async () => undefined),
      onRename: vi.fn(async () => undefined),
      onDelete: vi.fn(async () => undefined),
      onExport: vi.fn(),
      onCopyPlainText: vi.fn(async () => undefined),
      onCopyShareUrl: vi.fn(async () => undefined),
      onCopyQuickOrder: vi.fn(async () => undefined),
      onOpenQuickOrder: vi.fn(async () => undefined),
    };

    openSavedLists(document, [list], actions);

    expect(document.body.textContent).toContain("一括注文テキストをコピー");
    expect(document.body.textContent).toContain("一括注文画面へ入力");
  });

  it("自動送信対応店舗ではバスケットへの自動追加を明示する", () => {
    openSavedLists(document, [list], {
      confirmBeforeDelete: true,
      quickOrderAvailable: true,
      quickOrderAutoSubmit: true,
      onOpen: vi.fn(),
      onDuplicate: vi.fn(async () => undefined),
      onRename: vi.fn(async () => undefined),
      onDelete: vi.fn(async () => undefined),
      onExport: vi.fn(),
      onCopyPlainText: vi.fn(async () => undefined),
      onCopyShareUrl: vi.fn(async () => undefined),
      onCopyQuickOrder: vi.fn(async () => undefined),
      onOpenQuickOrder: vi.fn(async () => undefined),
    });

    expect(document.body.textContent).toContain("バスケットへ追加");
  });

  it("主要操作だけを直接表示し、残りをメニューへまとめる", () => {
    const onExport = vi.fn();
    const onCopyPlainText = vi.fn(async () => undefined);
    const onCopyShareUrl = vi.fn(async () => undefined);
    openSavedLists(document, [list], {
      confirmBeforeDelete: true,
      quickOrderAvailable: true,
      quickOrderAutoSubmit: true,
      onOpen: vi.fn(),
      onDuplicate: vi.fn(async () => undefined),
      onRename: vi.fn(async () => undefined),
      onDelete: vi.fn(async () => undefined),
      onExport,
      onCopyPlainText,
      onCopyShareUrl,
      onCopyQuickOrder: vi.fn(async () => undefined),
      onOpenQuickOrder: vi.fn(async () => undefined),
    });

    const directButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(
      ".cart2bom-list-actions > .cart2bom-button",
    )).map((button) => button.textContent);
    expect(directButtons).toEqual(["開く", "バスケットへ追加"]);
    expect(Array.from(document.querySelectorAll(".cart2bom-action-menu summary"))
      .map((summary) => summary.textContent)).toEqual(["出力 ▾", "その他 ▾"]);
    expect(document.body.textContent).not.toContain("既定形式で出力");
    expect(document.querySelectorAll(".cart2bom-action-menu-panel")[1]?.textContent)
      .toContain("削除");
    const csv = Array.from(document.querySelectorAll<HTMLButtonElement>(
      ".cart2bom-action-menu-panel .cart2bom-button",
    )).find((button) => button.textContent === "CSV出力");
    csv?.click();
    expect(onExport).toHaveBeenCalledWith(list, "csv");
    const share = Array.from(document.querySelectorAll<HTMLButtonElement>(
      ".cart2bom-action-menu-panel .cart2bom-button",
    )).find((button) => button.textContent === "共有URLをコピー");
    const plain = Array.from(document.querySelectorAll<HTMLButtonElement>(
      ".cart2bom-action-menu-panel .cart2bom-button",
    )).find((button) => button.textContent === "平文をコピー");
    share?.click();
    plain?.click();
    expect(onCopyShareUrl).toHaveBeenCalledWith(list);
    expect(onCopyPlainText).toHaveBeenCalledWith(list);
  });

  it("現在の店舗の商品を含むリストだけへ絞り込む", () => {
    const monotaroList: SavedList = {
      ...list,
      id: "monotaro-list",
      name: "モノタロウリスト",
      items: [{ ...list.items[0]!, id: "monotaro:47817527", storeId: "monotaro" }],
    };

    expect(filterSavedListsByStore([list, monotaroList], "monotaro"))
      .toEqual([monotaroList]);
    expect(filterSavedListsByStore([list, monotaroList], "akizuki"))
      .toEqual([list]);
  });
});
