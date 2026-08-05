import type { StorageProvider } from "./provider";

/** Storage backed by the asynchronous GM.* UserScript API. */
export class GMStorageProvider implements StorageProvider {
  public constructor(private readonly api: Cart2BOMGMApi = GM) {}

  public get<T>(key: string, defaultValue: T): Promise<T> {
    return this.api.getValue(key, defaultValue);
  }

  public set<T>(key: string, value: T): Promise<void> {
    return this.api.setValue(key, value);
  }

  public remove(key: string): Promise<void> {
    return this.api.deleteValue(key);
  }
}
