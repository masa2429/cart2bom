import { describe, expect, it } from "vitest";
import { MemoryStorageProvider } from "../../src/storage/memory-storage";

describe("MemoryStorageProvider", () => {
  it("既定値、保存、削除を扱う", async () => {
    const storage = new MemoryStorageProvider();

    expect(await storage.get("missing", [1])).toEqual([1]);
    await storage.set("items", [2, 3]);
    expect(await storage.get("items", [])).toEqual([2, 3]);
    await storage.remove("items");
    expect(await storage.get("items", [])).toEqual([]);
  });

  it("保存値を参照共有しない", async () => {
    const storage = new MemoryStorageProvider();
    const source = { name: "before" };
    await storage.set("value", source);
    source.name = "after";

    expect(await storage.get("value", { name: "" })).toEqual({ name: "before" });
  });
});
