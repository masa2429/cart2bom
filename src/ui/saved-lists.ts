import type { SavedList } from "../core/models";
import { calculateListTotal, formatListTotal } from "../core/totals";
import { createButton, openModal } from "./modal";
import { createProductImage } from "./product-image";

export interface SavedListActions {
  confirmBeforeDelete: boolean;
  quickOrderAvailable?: boolean;
  quickOrderAutoFill?: boolean;
  quickOrderAutoSubmit?: boolean;
  onOpen(list: SavedList): void;
  onDuplicate(list: SavedList): Promise<void>;
  onRename(list: SavedList, name: string): Promise<void>;
  onDelete(list: SavedList): Promise<void>;
  onExport(list: SavedList, format: "csv" | "tsv" | "json" | "markdown"): void;
  onCopyPlainText(list: SavedList): Promise<void>;
  onCopyShareUrl(list: SavedList): Promise<void>;
  onCopyQuickOrder(list: SavedList): Promise<void>;
  onOpenQuickOrder(list: SavedList): Promise<void>;
}

export function filterSavedListsByStore(lists: SavedList[], storeId: string): SavedList[] {
  return lists.filter((list) => list.items.some((item) => item.storeId === storeId));
}

function createActionMenu(
  targetDocument: Document,
  label: string,
): { details: HTMLDetailsElement; panel: HTMLDivElement } {
  const details = targetDocument.createElement("details");
  details.className = "cart2bom-action-menu";
  const summary = targetDocument.createElement("summary");
  summary.className = "cart2bom-button cart2bom-button-secondary";
  summary.textContent = `${label} ▾`;
  const panel = targetDocument.createElement("div");
  panel.className = "cart2bom-action-menu-panel";
  details.append(summary, panel);
  details.addEventListener("toggle", () => {
    if (!details.open) return;
    for (const other of targetDocument.querySelectorAll<HTMLDetailsElement>(".cart2bom-action-menu[open]")) {
      if (other !== details) other.open = false;
    }
  });
  return { details, panel };
}

function appendMenuButton(
  menu: { details: HTMLDetailsElement; panel: HTMLDivElement },
  button: HTMLButtonElement,
): void {
  button.addEventListener("click", () => { menu.details.open = false; });
  menu.panel.append(button);
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
    empty.textContent = "この店舗の商品を含む保存済みリストはありません。";
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
    buttons.className = "cart2bom-actions cart2bom-list-actions";
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
    const exportMenu = createActionMenu(targetDocument, "出力");
    const shareUrl = createButton(targetDocument, "共有URLをコピー");
    shareUrl.addEventListener("click", async () => {
      try { await actions.onCopyShareUrl(list); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "共有URLをコピーできませんでした。"; }
    });
    appendMenuButton(exportMenu, shareUrl);
    const plainText = createButton(targetDocument, "平文をコピー");
    plainText.addEventListener("click", async () => {
      try { await actions.onCopyPlainText(list); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "平文をコピーできませんでした。"; }
    });
    appendMenuButton(exportMenu, plainText);
    for (const [label, format] of [["CSV", "csv"], ["TSV", "tsv"], ["JSON", "json"], ["Markdown", "markdown"]] as const) {
      const exportButton = createButton(targetDocument, `${label}出力`);
      exportButton.addEventListener("click", () => actions.onExport(list, format));
      appendMenuButton(exportMenu, exportButton);
    }
    const quickCopy = createButton(targetDocument, "一括注文テキストをコピー");
    quickCopy.addEventListener("click", async () => {
      try { await actions.onCopyQuickOrder(list); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "コピーに失敗しました。"; }
    });
    const quickOpen = createButton(
      targetDocument,
      actions.quickOrderAutoSubmit
        ? "バスケットへ追加"
        : actions.quickOrderAutoFill
        ? "一括注文画面へ入力"
        : "一括注文画面を開く",
      "primary",
    );
    quickOpen.addEventListener("click", async () => {
      try { await actions.onOpenQuickOrder(list); }
      catch (error) { status.textContent = error instanceof Error ? error.message : "一括注文画面を開けませんでした。"; }
    });
    const otherMenu = createActionMenu(targetDocument, "その他");
    appendMenuButton(otherMenu, rename);
    appendMenuButton(otherMenu, duplicate);
    appendMenuButton(otherMenu, remove);
    buttons.append(open);
    if (actions.quickOrderAvailable) {
      buttons.append(quickOpen);
      appendMenuButton(exportMenu, quickCopy);
    }
    buttons.append(exportMenu.details, otherMenu.details);
    card.append(title, meta);
    if (images.childElementCount > 0) card.append(images);
    card.append(buttons);
    container.append(card);
  }
  modal.content.append(status, container);
}
