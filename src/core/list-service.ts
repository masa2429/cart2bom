import { DuplicateListNameError, StorageDataError } from "./errors";
import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEYS,
  type CartItem,
  type SavedList,
} from "./models";
import { validateSavedList } from "./validation";
import type { StorageProvider } from "../storage/provider";

export interface ListInput {
  name: string;
  description: string;
  tags: string[];
  items: CartItem[];
}

export interface LoadedLists {
  /** Lists that passed validation, newest first. */
  lists: SavedList[];
  /** Entries that failed validation. Kept as-is so they are never lost. */
  broken: unknown[];
}

export class ListService {
  public constructor(
    private readonly storage: StorageProvider,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  /**
   * Reads storage without letting one damaged entry hide the rest.
   *
   * Only a non-array value fails outright, because then no individual list can
   * be recovered. Damaged entries are returned untouched and written back by
   * every mutation, so a later Cart2BOM version can still repair them.
   */
  public async load(): Promise<LoadedLists> {
    const raw = await this.storage.get<unknown>(STORAGE_KEYS.lists, []);
    if (!Array.isArray(raw)) {
      throw new StorageDataError("保存済みリストの形式が壊れています。", raw);
    }
    const lists: SavedList[] = [];
    const broken: unknown[] = [];
    for (const value of raw) {
      const result = validateSavedList(value);
      if (result.ok) lists.push(result.value);
      else broken.push(value);
    }
    lists.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return { lists, broken };
  }

  public async getAll(): Promise<SavedList[]> {
    return (await this.load()).lists;
  }

  public async create(input: ListInput, overwrite = false): Promise<SavedList> {
    const { lists, broken } = await this.load();
    const duplicate = lists.find((list) => list.name === input.name);
    if (duplicate && !overwrite) throw new DuplicateListNameError(input.name);

    const timestamp = this.now().toISOString();
    const next: SavedList = duplicate
      ? { ...duplicate, ...input, items: structuredClone(input.items), updatedAt: timestamp }
      : {
          id: this.createId(),
          schemaVersion: CURRENT_SCHEMA_VERSION,
          ...input,
          items: structuredClone(input.items),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
    const remaining = lists.filter((list) => list.id !== next.id);
    await this.storage.set(STORAGE_KEYS.lists, [...remaining, next, ...broken]);
    return next;
  }

  public async update(list: SavedList, overwriteName = false): Promise<SavedList> {
    const { lists, broken } = await this.load();
    const duplicate = lists.find((candidate) => candidate.name === list.name && candidate.id !== list.id);
    if (duplicate && !overwriteName) throw new DuplicateListNameError(list.name);
    const updated = { ...structuredClone(list), updatedAt: this.now().toISOString() };
    const remaining = lists.filter(
      (candidate) => candidate.id !== list.id && (overwriteName ? candidate.id !== duplicate?.id : true),
    );
    await this.storage.set(STORAGE_KEYS.lists, [...remaining, updated, ...broken]);
    return updated;
  }

  public async duplicate(id: string): Promise<SavedList> {
    const source = (await this.getAll()).find((list) => list.id === id);
    if (!source) throw new Error("複製元のリストが見つかりません。");
    let name = `${source.name} のコピー`;
    const existingNames = new Set((await this.getAll()).map((list) => list.name));
    let suffix = 2;
    while (existingNames.has(name)) name = `${source.name} のコピー ${suffix++}`;
    return this.create({
      name,
      description: source.description,
      tags: [...source.tags],
      items: source.items,
    });
  }

  public async remove(id: string): Promise<void> {
    const { lists, broken } = await this.load();
    await this.storage.set(STORAGE_KEYS.lists, [...lists.filter((list) => list.id !== id), ...broken]);
  }

  public async importList(list: SavedList, overwrite = false): Promise<void> {
    const validation = validateSavedList(list);
    if (!validation.ok) throw new StorageDataError("インポートするリストが不正です。", list);
    const { lists, broken } = await this.load();
    const duplicate = lists.find((candidate) => candidate.id === list.id || candidate.name === list.name);
    if (duplicate && !overwrite) throw new DuplicateListNameError(list.name);
    await this.storage.set(
      STORAGE_KEYS.lists,
      [
        ...lists.filter(
          (candidate) => !overwrite || (candidate.id !== list.id && candidate.name !== list.name),
        ),
        structuredClone(list),
        ...broken,
      ],
    );
  }
}
