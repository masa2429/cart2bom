import { describe, expect, it } from "vitest";
import {
  consumePendingQuickOrder,
  readPendingQuickOrder,
  removePendingQuickOrder,
  savePendingQuickOrder,
} from "../../src/core/pending-quick-order";
import { STORAGE_KEYS } from "../../src/core/models";
import { MemoryStorageProvider } from "../../src/storage/memory-storage";

describe("pending quick order", () => {
  it("同じ店舗の5分以内の入力を一度だけ返す", async () => {
    const storage = new MemoryStorageProvider();
    await savePendingQuickOrder(storage, {
      storeId: "monotaro",
      text: "47817527\t2",
      createdAt: "2026-08-05T00:00:00.000Z",
    });

    await expect(consumePendingQuickOrder(
      storage,
      "monotaro",
      new Date("2026-08-05T00:01:00.000Z"),
    )).resolves.toEqual({
      storeId: "monotaro",
      text: "47817527\t2",
      createdAt: "2026-08-05T00:00:00.000Z",
    });
    await expect(storage.get(STORAGE_KEYS.pendingQuickOrder, null)).resolves.toBeNull();
  });

  it("期限切れと別店舗の入力を返さない", async () => {
    const storage = new MemoryStorageProvider();
    await savePendingQuickOrder(storage, {
      storeId: "monotaro",
      text: "47817527\t2",
      createdAt: "2026-08-05T00:00:00.000Z",
    });

    await expect(consumePendingQuickOrder(
      storage,
      "akizuki",
      new Date("2026-08-05T00:01:00.000Z"),
    )).resolves.toBeNull();
    await expect(consumePendingQuickOrder(
      storage,
      "monotaro",
      new Date("2026-08-05T00:06:00.000Z"),
    )).resolves.toBeNull();
  });

  it("自動追加の進行状態を削除せずに読み取る", async () => {
    const storage = new MemoryStorageProvider();
    const pending = {
      storeId: "monotaro",
      text: "47817527\t2\n42107457\t10",
      createdAt: "2026-08-05T00:00:00.000Z",
      phase: "submitted" as const,
      submittedLineCount: 1,
    };
    await savePendingQuickOrder(storage, pending);

    await expect(readPendingQuickOrder(
      storage,
      "monotaro",
      new Date("2026-08-05T00:01:00.000Z"),
    )).resolves.toEqual(pending);
    await expect(storage.get(STORAGE_KEYS.pendingQuickOrder, null)).resolves.toEqual(pending);
    await removePendingQuickOrder(storage);
    await expect(storage.get(STORAGE_KEYS.pendingQuickOrder, null)).resolves.toBeNull();
  });
});
