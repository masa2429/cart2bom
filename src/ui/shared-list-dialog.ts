import type { SavedList } from "../core/models";
import { calculateListTotal, formatListTotal } from "../core/totals";
import { createButton, openModal } from "./modal";

export function openSharedListDialog(
  targetDocument: Document,
  list: SavedList,
  onImport: (list: SavedList) => Promise<void>,
): void {
  const modal = openModal(targetDocument, "共有リストを取り込む");
  const summaryPanel = targetDocument.createElement("section");
  summaryPanel.className = "cart2bom-shared-summary";
  const name = targetDocument.createElement("h3");
  name.textContent = list.name;
  const summary = targetDocument.createElement("p");
  summary.textContent = `${list.items.length}商品・${formatListTotal(calculateListTotal(list.items))}`;
  const stores = targetDocument.createElement("ul");
  stores.className = "cart2bom-store-counts";
  const counts = new Map<string, number>();
  for (const item of list.items) counts.set(item.storeName, (counts.get(item.storeName) ?? 0) + 1);
  for (const [storeName, count] of counts) {
    const entry = targetDocument.createElement("li");
    entry.textContent = `${storeName}: ${count}商品`;
    stores.append(entry);
  }
  const notice = targetDocument.createElement("p");
  notice.className = "cart2bom-notice";
  notice.textContent = "内容を確認してから取り込んでください。取り込みだけではカートへの追加や注文は行いません。";
  const error = targetDocument.createElement("p");
  error.className = "cart2bom-error";
  error.setAttribute("role", "alert");
  const actions = targetDocument.createElement("div");
  actions.className = "cart2bom-actions";
  const importButton = createButton(targetDocument, "このリストを取り込む", "primary");
  const cancel = createButton(targetDocument, "キャンセル");
  cancel.addEventListener("click", modal.close);
  importButton.addEventListener("click", async () => {
    importButton.disabled = true;
    try {
      await onImport(list);
      modal.close();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : "共有リストを取り込めませんでした。";
    } finally {
      importButton.disabled = false;
    }
  });
  actions.append(importButton, cancel);
  summaryPanel.append(name, summary, stores);
  modal.content.append(summaryPanel, notice, error, actions);
}
