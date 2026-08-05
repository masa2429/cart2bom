import type { SavedList } from "../core/models";

export function exportJson(list: SavedList): string {
  return `${JSON.stringify(list, null, 2)}\n`;
}
