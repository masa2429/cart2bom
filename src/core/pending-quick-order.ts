import { STORAGE_KEYS } from "./models";
import type { StorageProvider } from "../storage/provider";

export interface PendingQuickOrder {
  storeId: string;
  text: string;
  createdAt: string;
}

const MAX_AGE_MS = 5 * 60 * 1000;

export async function savePendingQuickOrder(
  storage: StorageProvider,
  value: PendingQuickOrder,
): Promise<void> {
  await storage.set(STORAGE_KEYS.pendingQuickOrder, value);
}

/** Returns and removes a recent pending order for this store. */
export async function consumePendingQuickOrder(
  storage: StorageProvider,
  storeId: string,
  now = new Date(),
): Promise<PendingQuickOrder | null> {
  const value = await storage.get<unknown>(STORAGE_KEYS.pendingQuickOrder, null);
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PendingQuickOrder>;
  if (candidate.storeId !== storeId) return null;
  const createdAt = typeof candidate.createdAt === "string" ? Date.parse(candidate.createdAt) : Number.NaN;
  if (
    typeof candidate.text !== "string"
    || !candidate.text.trim()
    || !Number.isFinite(createdAt)
    || now.getTime() - createdAt > MAX_AGE_MS
    || createdAt - now.getTime() > MAX_AGE_MS
  ) {
    await storage.remove(STORAGE_KEYS.pendingQuickOrder);
    return null;
  }
  await storage.remove(STORAGE_KEYS.pendingQuickOrder);
  return candidate as PendingQuickOrder;
}
