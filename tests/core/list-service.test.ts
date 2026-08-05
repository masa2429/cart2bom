import { describe, expect, it } from "vitest";
import { DuplicateListNameError, StorageDataError } from "../../src/core/errors";
import { ListService } from "../../src/core/list-service";
import type { CartItem } from "../../src/core/models";
import { STORAGE_KEYS } from "../../src/core/models";
import { MemoryStorageProvider } from "../../src/storage/memory-storage";

const item: CartItem = {
  id: "akizuki:105148", storeId: "akizuki", storeName: "秋月電子通商",
  orderCode: "105148", manufacturerName: null, manufacturerPartNumber: null, name: "商品", salesUnit: "1個", quantity: 1,
  unitPrice: null, subtotal: null, currency: "JPY", productUrl: "https://example.test/item",
  imageUrl: null, stockStatus: null, leadTime: null, note: "", capturedAt: "2026-08-04T00:00:00.000Z",
};

function createService(storage = new MemoryStorageProvider()): ListService {
  return new ListService(storage, () => new Date("2026-08-04T00:00:00.000Z"), () => "list-1");
}

describe("ListService", () => {
  it("リストを作成して取得する", async () => {
    const service = createService();
    await service.create({ name: "部品", description: "説明", tags: ["基板"], items: [item] });
    expect(await service.getAll()).toEqual([expect.objectContaining({ id: "list-1", name: "部品" })]);
  });

  it("同名リストは確認なしに上書きしない", async () => {
    const service = createService();
    await service.create({ name: "部品", description: "", tags: [], items: [item] });
    await expect(service.create({ name: "部品", description: "", tags: [], items: [item] }))
      .rejects.toBeInstanceOf(DuplicateListNameError);
  });

  it("破損データを削除せずエラーにする", async () => {
    const storage = new MemoryStorageProvider();
    await storage.set(STORAGE_KEYS.lists, { broken: true });
    await expect(createService(storage).getAll()).rejects.toBeInstanceOf(StorageDataError);
    expect(await storage.get(STORAGE_KEYS.lists, null)).toEqual({ broken: true });
  });

  it("リストを複製して削除する", async () => {
    let id = 0;
    const service = new ListService(
      new MemoryStorageProvider(),
      () => new Date("2026-08-04T00:00:00.000Z"),
      () => `list-${++id}`,
    );
    const original = await service.create({ name: "部品", description: "", tags: [], items: [item] });
    const copy = await service.duplicate(original.id);
    expect(copy.name).toBe("部品 のコピー");
    await service.remove(original.id);
    expect(await service.getAll()).toEqual([copy]);
  });
});
