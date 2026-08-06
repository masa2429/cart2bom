import type { AppSettings } from "../core/models";
import { createButton, openModal } from "./modal";

export function openSettings(
  targetDocument: Document,
  current: AppSettings,
  onSave: (settings: AppSettings) => Promise<void>,
): void {
  const modal = openModal(targetDocument, "設定");
  const intro = targetDocument.createElement("p");
  intro.className = "cart2bom-import-intro";
  intro.textContent = "Cart2BOMの表示位置と確認動作を設定します。";
  const form = targetDocument.createElement("div");
  form.className = "cart2bom-form cart2bom-settings-form";

  const side = targetDocument.createElement("select");
  for (const [value, label] of [["left", "左下"], ["right", "右下"]] as const) {
    const option = targetDocument.createElement("option");
    option.value = value;
    option.textContent = label;
    side.append(option);
  }
  side.value = current.buttonSide;
  const sideLabel = targetDocument.createElement("label");
  sideLabel.textContent = "固定ボタンの位置";
  sideLabel.append(side);

  const theme = targetDocument.createElement("select");
  for (const [value, label] of [["auto", "自動（OS設定に合わせる）"], ["light", "ライト"], ["dark", "ダーク"]] as const) {
    const option = targetDocument.createElement("option");
    option.value = value;
    option.textContent = label;
    theme.append(option);
  }
  theme.value = current.theme;
  const themeLabel = targetDocument.createElement("label");
  themeLabel.textContent = "表示テーマ";
  themeLabel.append(theme);

  const confirmDelete = targetDocument.createElement("input");
  confirmDelete.type = "checkbox";
  confirmDelete.checked = current.confirmBeforeDelete;
  const confirmLabel = targetDocument.createElement("label");
  confirmLabel.className = "cart2bom-checkbox-label";
  confirmLabel.append(confirmDelete, targetDocument.createTextNode("削除前に確認する"));
  form.append(sideLabel, themeLabel, confirmLabel);

  const error = targetDocument.createElement("p");
  error.className = "cart2bom-error";
  const save = createButton(targetDocument, "設定を保存", "primary");
  save.addEventListener("click", async () => {
    save.disabled = true;
    try {
      await onSave({
        ...current,
        buttonSide: side.value === "left" ? "left" : "right",
        confirmBeforeDelete: confirmDelete.checked,
        theme: theme.value === "dark" ? "dark" : theme.value === "light" ? "light" : "auto",
      });
      modal.close();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : "設定を保存できませんでした。";
    } finally {
      save.disabled = false;
    }
  });
  const actions = targetDocument.createElement("div");
  actions.className = "cart2bom-actions";
  actions.append(save);
  modal.content.append(intro, form, error, actions);
}
