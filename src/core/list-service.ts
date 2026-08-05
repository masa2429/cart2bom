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

export class ListService {
  public constructor(
    private readonly storage: StorageProvider,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  public async getAll(): Promise<SavedList[]> {
    const raw = await this.storage.get<unknown>(STORAGE_KEYS.lists, []);
    if (!Array.isArray(raw)) {
      throw new StorageDataError("保存済みリストの形式が壊れています。", raw);
    }
    const lists: SavedList[] = [];
    for (const value of raw) {
      const result = validateSavedList(value);
      if (!result.ok) {
        throw new StorageDataError("保存済みリストに不正なデータがあります。", raw);
      }
      lists.push(result.value);
    }
    return lists.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  public async create(input: ListInput, overwrite = false): Promise<SavedList> {
    const lists = await this.getAll();
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
    await this.storage.set(STORAGE_KEYS.lists, [...remaining, next]);
    return next;
  }

  public async update(list: SavedList, overwriteName = false): Promise<SavedList> {
    const lists = await this.getAll();
    const duplicate = lists.find((candidate) => candidate.name === list.name && candidate.id !== list.id);
    if (duplicate && !overwriteName) throw new DuplicateListNameError(list.name);
    const updated = { ...structuredClone(list), updatedAt: this.now().toISOString() };
    const remaining = lists.filter(
      (candidate) => candidate.id !== list.id && (overwriteName ? candidate.id !== duplicate?.id : true),
    );
    await this.storage.set(STORAGE_KEYS.lists, [...remaining, updated]);
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
    const lists = await this.getAll();
    await this.storage.set(STORAGE_KEYS.lists, lists.filter((list) => list.id !== id));
  }

  public async importList(list: SavedList, overwrite = false): Promise<void> {
    const validation = validateSavedList(list);
    if (!validation.ok) throw new StorageDataError("インポートするリストが不正です。", list);
    const lists = await this.getAll();
    const duplicate = lists.find((candidate) => candidate.id === list.id || candidate.name === list.name);
    if (duplicate && !overwrite) throw new DuplicateListNameError(list.name);
    await this.storage.set(
      STORAGE_KEYS.lists,
      [
        ...lists.filter(
          (candidate) => !overwrite || (candidate.id !== list.id && candidate.name !== list.name),
        ),
        structuredClone(list),
      ],
    );
  }
}
