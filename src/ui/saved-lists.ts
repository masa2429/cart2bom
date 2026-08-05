import type { SavedList } from "../core/models";
import { calculateListTotal, formatListTotal } from "../core/totals";
import { createButton, openModal } from "./modal";
import { createProductImage } from "./product-image";

export interface SavedListActions {
  confirmBeforeDelete: boolean;
  onOpen(list: SavedList): void;
  onDuplicate(list: SavedList): Promise<void>;
  onRename(list: SavedList, name: string): Promise<void>;
  onDelete(list: SavedList): Promise<void>;
  onExport(list: SavedList, format: "csv" | "tsv" | "json" | "markdown"): void;
  onCopyQuickOrder(list: SavedList): Promise<void>;
  onOpenQuickOrder(list: SavedList): Promise<void>;
  onDefaultExport(list: SavedList): Promise<void> | void;
}

export function openSavedLists(
  targetDocument: Document,
  lists: SavedList[],
  actions: SavedListActions,
): void {
  const modal = openModal(targetDocument, "保存済みリスト");
  const status = targetDocument.createElement("p");
  status.className = "cart2bom-error";
  if (lists.length === 0) {
    const empty = targetDocument.createElement("p");
    empty.textContent = "保存済みリストはありません。";
    modal.content.append(empty);
    return;
  }
  const container = targetDocument.createElement("div");
  container.className = "cart2bom-list-grid";
  for (const list of lists) {
    const card = targetDocument.createElement("article");
    card.className = "cart2bom-list-card";
    const title = targetDocument.createElement("h3");
    title.textContent = list.name;
    const meta = targetDocument.createElement("p");
    meta.textContent = `${list.items.length}商品・${formatListTotal(calculateListTotal(list.items))}・更新 ${new Date(list.updatedAt).toLocaleString("ja-JP")}`;
    const images = targetDocument.createElement("div");
    images.className = "cart2bom-list-images";
    for (const item of list.items) {
      if (images.childElementCount >= 6) break;
      const image = createProductImage(targetDocument, item);
      if (!image) continue;
      image.title = item.name;
      images.append(image);
    }
    const buttons = targetDocument.createElement("div");
    buttons.className = "cart2bom-actions";
    const open = createButton(targetDocument, "開く", "primary");
    open.addEventListener("click", () => { modal.close(); actions.onOpen(list); });
    const rename = createButton(targetDocument, "名前変更");
    rename.addEventListener("click", async () => {
      const next = window.prompt("新しいリスト名", list.name)?.trim();
      if (!next || next === list.name) return;
      try { await actions.onRename(list, next); title.textContent = next; list.name = next; }
      catch (error) { status.textContent = error instanceof Error ? error.message : "名前変更に失敗しました。"; }
    });
    const duplicate = createButton(targetDocument, "複製");
    duplicate.addEventListener("click", async () => {
      try { await actions.onDuplicate(list); modal.close(); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "複製に失敗しました。"; }
    });
    const remove = createButton(targetDocument, "削除", "danger");
    remove.addEventListener("click", async () => {
      if (actions.confirmBeforeDelete && !window.confirm(`「${list.name}」を削除しますか？`)) return;
      try { await actions.onDelete(list); card.remove(); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "削除に失敗しました。"; }
    });
    for (const [label, format] of [["CSV", "csv"], ["TSV", "tsv"], ["JSON", "json"], ["Markdown", "markdown"]] as const) {
      const exportButton = createButton(targetDocument, `${label}出力`);
      exportButton.addEventListener("click", () => actions.onExport(list, format));
      buttons.append(exportButton);
    }
    const quickCopy = createButton(targetDocument, "秋月一括注文をコピー");
    quickCopy.addEventListener("click", async () => {
      try { await actions.onCopyQuickOrder(list); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "コピーに失敗しました。"; }
    });
    const quickOpen = createButton(targetDocument, "秋月一括注文画面を開く");
    quickOpen.addEventListener("click", async () => {
      try { await actions.onOpenQuickOrder(list); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "一括注文画面を開けませんでした。"; }
    });
    const defaultExport = createButton(targetDocument, "既定形式で出力", "primary");
    defaultExport.addEventListener("click", async () => {
      try { await actions.onDefaultExport(list); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "出力に失敗しました。"; }
    });
    buttons.prepend(open, defaultExport, rename, duplicate);
    buttons.append(quickCopy, quickOpen, remove);
    card.append(title, meta);
    if (images.childElementCount > 0) card.append(images);
    card.append(buttons);
    container.append(card);
  }
  modal.content.append(status, container);
}
