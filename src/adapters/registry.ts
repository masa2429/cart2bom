import type { StoreAdapter } from "./adapter";
import { AkizukiAdapter } from "./akizuki";
import { MonotaroAdapter } from "./monotaro";

const adapters: readonly StoreAdapter[] = [new AkizukiAdapter(), new MonotaroAdapter()];

export function findAdapter(url: URL): StoreAdapter | null {
  return adapters.find((adapter) => adapter.matches(url)) ?? null;
}

export function getAdapters(): readonly StoreAdapter[] {
  return adapters;
}
