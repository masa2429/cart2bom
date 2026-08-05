import type { StorageProvider } from "./provider";

/** In-memory StorageProvider for deterministic tests and local previews. */
export class MemoryStorageProvider implements StorageProvider {
  private readonly values = new Map<string, unknown>();

  public async get<T>(key: string, defaultValue: T): Promise<T> {
    const value = this.values.has(key) ? this.values.get(key) : defaultValue;
    return structuredClone(value) as T;
  }

  public async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, structuredClone(value));
  }

  public async remove(key: string): Promise<void> {
    this.values.delete(key);
  }
}
