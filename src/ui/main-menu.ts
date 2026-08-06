import { createButton, openModal } from "./modal";

export interface MainMenuActions {
  storeName: string;
  onReadCart(): void;
  onSavedLists(): void;
  onImport(): void;
  onSettings(): void;
}

export function openMainMenu(targetDocument: Document, actions: MainMenuActions): void {
  if (targetDocument.querySelector(".cart2bom-overlay")) return;
  const modal = openModal(targetDocument, "Cart2BOM");
  const store = targetDocument.createElement("p");
  store.className = "cart2bom-store-context";
  store.textContent = `対象サイト：${actions.storeName}`;
  const menu = targetDocument.createElement("div");
  menu.className = "cart2bom-menu";
  for (const [label, handler] of [
    ["現在のカートを読み取る", actions.onReadCart],
    ["保存済みリスト", actions.onSavedLists],
    ["インポート", actions.onImport],
    ["設定", actions.onSettings],
  ] as const) {
    const button = createButton(targetDocument, label, label === "現在のカートを読み取る" ? "primary" : "secondary");
    button.addEventListener("click", () => {
      modal.close();
      handler();
    });
    menu.append(button);
  }
  const github = targetDocument.createElement("a");
  github.className = "cart2bom-button cart2bom-button-secondary";
  github.href = "https://github.com/masa2429/cart2bom";
  github.target = "_blank";
  github.rel = "noopener noreferrer";
  github.textContent = "GitHub";
  menu.append(github);
  modal.content.append(store, menu);
}
