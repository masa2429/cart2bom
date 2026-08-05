declare const __CART2BOM_VERSION__: string;
declare const __CART2BOM_DEVELOPMENT__: boolean;

interface Cart2BOMGMApi {
  getValue<T>(key: string, defaultValue: T): Promise<T>;
  setValue<T>(key: string, value: T): Promise<void>;
  deleteValue(key: string): Promise<void>;
}

declare const GM: Cart2BOMGMApi;
