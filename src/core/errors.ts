export class StorageDataError extends Error {
  public constructor(message: string, public readonly rawValue: unknown) {
    super(message);
    this.name = "StorageDataError";
  }
}

export class DuplicateListNameError extends Error {
  public constructor(public readonly listName: string) {
    super(`同名のリスト「${listName}」が存在します。`);
    this.name = "DuplicateListNameError";
  }
}
