import type { StoreAdapter } from "./adapter";
import { AkizukiAdapter } from "./akizuki";
import { MonotaroAdapter } from "./monotaro";
import { MisumiAdapter } from "./misumi";

const adapters: readonly StoreAdapter[] = [new AkizukiAdapter(), new MonotaroAdapter(), new MisumiAdapter()];

export function findAdapter(url: URL): StoreAdapter | null {
  return adapters.find((adapter) => adapter.matches(url)) ?? null;
}

export function getAdapters(): readonly StoreAdapter[] {
  return adapters;
}
