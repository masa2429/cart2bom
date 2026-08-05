import type { SavedList } from "../core/models";
import type { StoreAdapter } from "../adapters/adapter";
import { validateQuantity } from "../core/validation";

export class QuickOrderValidationError extends Error {
  public constructor(public readonly issues: string[]) {
    super(issues.join("\n"));
    this.name = "QuickOrderValidationError";
  }
}

export function exportQuickOrder(list: SavedList, adapter: StoreAdapter): string {
  return exportQuickOrderBatches(list, adapter).join("\n");
}

export function exportQuickOrderBatches(list: SavedList, adapter: StoreAdapter): string[] {
  if (!adapter.createQuickOrderText) throw new QuickOrderValidationError(["この店舗は一括注文形式に対応していません。"]);
  const quantities = new Map<string, number>();
  const representative = new Map<string, SavedList["items"][number]>();
  const issues: string[] = [];
  for (const item of list.items.filter((candidate) => candidate.storeId === adapter.id)) {
    const validCode = adapter.validateQuickOrderCode?.(item.orderCode) ?? /^\d{6}$/.test(item.orderCode);
    if (!validCode) {
      issues.push(`${item.name}: ${adapter.quickOrderCodeRequirement ?? "注文コードが正しくありません。"}`);
      continue;
    }
    if (!validateQuantity(item.quantity)) {
      issues.push(`${item.orderCode}: 数量は正の整数である必要があります。`);
      continue;
    }
    quantities.set(item.orderCode, (quantities.get(item.orderCode) ?? 0) + item.quantity);
    representative.set(item.orderCode, item);
  }
  if (quantities.size === 0) issues.push("一括注文へ出力できる商品がありません。");
  if (issues.length > 0) throw new QuickOrderValidationError(issues);
  const items = Array.from(quantities, ([code, quantity]) => ({ ...representative.get(code)!, quantity }));
  const capacity = adapter.quickOrderCapacity ?? items.length;
  const batches: string[] = [];
  for (let index = 0; index < items.length; index += capacity) {
    batches.push(adapter.createQuickOrderText(items.slice(index, index + capacity)));
  }
  return batches;
}
