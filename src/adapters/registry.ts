import type { StoreAdapter } from "./adapter";
import { AkizukiAdapter } from "./akizuki";

const adapters: readonly StoreAdapter[] = [new AkizukiAdapter()];

export function findAdapter(url: URL): StoreAdapter | null {
  return adapters.find((adapter) => adapter.matches(url)) ?? null;
}

export function getAdapters(): readonly StoreAdapter[] {
  return adapters;
}
