import { describe, expect, it } from "vitest";
import { SettingsService } from "../../src/core/settings-service";
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../../src/core/models";
import { MemoryStorageProvider } from "../../src/storage/memory-storage";

describe("SettingsService", () => {
  it("既定設定を返し、設定を保存する", async () => {
    const service = new SettingsService(new MemoryStorageProvider());
    expect(await service.get()).toEqual(DEFAULT_SETTINGS);
    const next = { ...DEFAULT_SETTINGS, buttonSide: "left" as const };
    await service.save(next);
    expect(await service.get()).toEqual(next);
  });

  it("破損設定を拒否する", async () => {
    const storage = new MemoryStorageProvider();
    await storage.set(STORAGE_KEYS.settings, { buttonSide: "center" });
    await expect(new SettingsService(storage).get()).rejects.toThrow("設定データが壊れています");
  });

  it("テーマ設定がない旧形式を自動テーマへ移行する", async () => {
    const storage = new MemoryStorageProvider();
    const { theme: _theme, ...legacy } = DEFAULT_SETTINGS;
    await storage.set(STORAGE_KEYS.settings, legacy);
    await expect(new SettingsService(storage).get()).resolves.toEqual({ ...legacy, theme: "auto" });
  });
});
