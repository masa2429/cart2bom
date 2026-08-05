import {
  CURRENT_SCHEMA_VERSION,
  type AppSettings,
  type CartItem,
  type SavedList,
} from "./models";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isOptionalNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || isNullableString(value);
}

function isNullableNonNegativeInteger(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0)
  );
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

export function validateQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function validateOrderCode(storeId: string, value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  return storeId !== "akizuki" || /^\d{6}$/.test(value);
}

/** Validates imported item data without coercing potentially unsafe values. */
export function validateCartItem(
  value: unknown,
  path = "items[]",
): ValidationResult<CartItem> {
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path, message: "商品はオブジェクトである必要があります。" }] };
  }

  const issues: ValidationIssue[] = [];
  const requireString = (key: string): void => {
    if (typeof value[key] !== "string" || value[key].length === 0) {
      issues.push({ path: `${path}.${key}`, message: "空でない文字列が必要です。" });
    }
  };

  for (const key of ["id", "storeId", "storeName", "name", "productUrl", "capturedAt"] as const) {
    requireString(key);
  }
  if (!validateOrderCode(typeof value.storeId === "string" ? value.storeId : "", value.orderCode)) {
    issues.push({ path: `${path}.orderCode`, message: "通販コードが不正です。" });
  }
  if (!validateQuantity(value.quantity)) {
    issues.push({ path: `${path}.quantity`, message: "数量は正の整数である必要があります。" });
  }
  if (value.currency !== "JPY") {
    issues.push({ path: `${path}.currency`, message: "通貨はJPYである必要があります。" });
  }
  for (const key of ["manufacturerPartNumber", "imageUrl", "stockStatus", "leadTime"] as const) {
    if (!isNullableString(value[key])) {
      issues.push({ path: `${path}.${key}`, message: "文字列またはnullが必要です。" });
    }
  }
  // These additive fields are optional when reading schema v1 data saved by Cart2BOM 0.1.0.
  for (const key of ["manufacturerName", "salesUnit"] as const) {
    if (!isOptionalNullableString(value[key])) {
      issues.push({ path: `${path}.${key}`, message: "文字列またはnullが必要です。" });
    }
  }
  for (const key of ["unitPrice", "subtotal"] as const) {
    if (!isNullableNonNegativeInteger(value[key])) {
      issues.push({ path: `${path}.${key}`, message: "0以上の整数またはnullが必要です。" });
    }
  }
  if (typeof value.note !== "string") {
    issues.push({ path: `${path}.note`, message: "文字列が必要です。" });
  }
  if (!isIsoDate(value.capturedAt)) {
    issues.push({ path: `${path}.capturedAt`, message: "ISO 8601日時が必要です。" });
  }

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      ...(value as unknown as CartItem),
      manufacturerName: typeof value.manufacturerName === "string" ? value.manufacturerName : null,
      salesUnit: typeof value.salesUnit === "string" ? value.salesUnit : null,
    },
  };
}

/** Validates a complete saved list and rejects unknown schema versions. */
export function validateSavedList(value: unknown): ValidationResult<SavedList> {
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "$", message: "リストはオブジェクトである必要があります。" }] };
  }

  const issues: ValidationIssue[] = [];
  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    issues.push({ path: "schemaVersion", message: "未対応のスキーマバージョンです。" });
  }
  for (const key of ["id", "name", "description"] as const) {
    if (typeof value[key] !== "string" || (key !== "description" && value[key].length === 0)) {
      issues.push({ path: key, message: "有効な文字列が必要です。" });
    }
  }
  for (const key of ["createdAt", "updatedAt"] as const) {
    if (!isIsoDate(value[key])) {
      issues.push({ path: key, message: "ISO 8601日時が必要です。" });
    }
  }
  if (!Array.isArray(value.tags) || !value.tags.every((tag) => typeof tag === "string")) {
    issues.push({ path: "tags", message: "文字列の配列が必要です。" });
  }
  const items: CartItem[] = [];
  if (!Array.isArray(value.items)) {
    issues.push({ path: "items", message: "商品の配列が必要です。" });
  } else {
    value.items.forEach((item, index) => {
      const result = validateCartItem(item, `items[${index}]`);
      if (!result.ok) issues.push(...result.issues);
      else items.push(result.value);
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, value: { ...(value as unknown as SavedList), items } };
}

export function parseSavedListJson(text: string): ValidationResult<SavedList> {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, issues: [{ path: "$", message: "JSONの構文が不正です。" }] };
  }
  return validateSavedList(value);
}

export function validateAppSettings(value: unknown): ValidationResult<AppSettings> {
  if (
    !isRecord(value) ||
    value.schemaVersion !== CURRENT_SCHEMA_VERSION ||
    (value.buttonSide !== "left" && value.buttonSide !== "right") ||
    typeof value.confirmBeforeDelete !== "boolean" ||
    !["csv", "tsv", "json", "quickOrder"].includes(String(value.defaultExportFormat))
  ) {
    return { ok: false, issues: [{ path: "$", message: "設定データが不正です。" }] };
  }
  return { ok: true, value: value as unknown as AppSettings };
}
