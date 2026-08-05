import { StorageDataError } from "./errors";
import { DEFAULT_SETTINGS, STORAGE_KEYS, type AppSettings } from "./models";
import { validateAppSettings } from "./validation";
import type { StorageProvider } from "../storage/provider";

export class SettingsService {
  public constructor(private readonly storage: StorageProvider) {}

  public async get(): Promise<AppSettings> {
    const raw = await this.storage.get<unknown>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    const result = validateAppSettings(raw);
    if (!result.ok) throw new StorageDataError("設定データが壊れています。", raw);
    return result.value;
  }

  public async save(settings: AppSettings): Promise<void> {
    const result = validateAppSettings(settings);
    if (!result.ok) throw new Error("設定内容が不正です。");
    await this.storage.set(STORAGE_KEYS.settings, settings);
  }
}
