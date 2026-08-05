import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_SCHEMA_VERSION, type SavedList } from "../../src/core/models";
import { openSharedListDialog } from "../../src/ui/shared-list-dialog";

const list: SavedList = {
  id: "shared", schemaVersion: CURRENT_SCHEMA_VERSION, name: "装置A", description: "", tags: [],
  items: [{
    id: "akizuki:105148", storeId: "akizuki", storeName: "秋月電子通商", orderCode: "105148",
    manufacturerName: null, manufacturerPartNumber: null, name: "商品", salesUnit: "1個", quantity: 2,
    unitPrice: 100, subtotal: 200, currency: "JPY", productUrl: "https://example.test/item", imageUrl: null,
    stockStatus: null, leadTime: null, note: "", capturedAt: "2026-08-05T00:00:00.000Z",
  }],
  createdAt: "2026-08-05T00:00:00.000Z", updatedAt: "2026-08-05T00:00:00.000Z",
};

describe("openSharedListDialog", () => {
  beforeEach(() => document.body.replaceChildren());

  it("リストの概要を確認してから取り込む", async () => {
    const onImport = vi.fn(async () => undefined);
    openSharedListDialog(document, list, onImport);
    expect(document.body.textContent).toContain("装置A");
    expect(document.body.textContent).toContain("1商品・合計 200円");
    expect(document.body.textContent).toContain("秋月電子通商: 1商品");
    expect(document.body.textContent).toContain("注文は行いません");
    const button = Array.from(document.querySelectorAll("button"))
      .find((candidate) => candidate.textContent === "このリストを取り込む");
    button?.click();
    await vi.waitFor(() => expect(onImport).toHaveBeenCalledWith(list));
  });
});
