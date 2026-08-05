import type { AppSettings } from "../core/models";
import { createButton, openModal } from "./modal";

export function openSettings(
  targetDocument: Document,
  current: AppSettings,
  onSave: (settings: AppSettings) => Promise<void>,
): void {
  const modal = openModal(targetDocument, "設定");
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

  const format = targetDocument.createElement("select");
  for (const [value, label] of [["csv", "CSV"], ["tsv", "TSV"], ["json", "JSON"], ["quickOrder", "秋月一括注文"]] as const) {
    const option = targetDocument.createElement("option");
    option.value = value;
    option.textContent = label;
    format.append(option);
  }
  format.value = current.defaultExportFormat;
  const formatLabel = targetDocument.createElement("label");
  formatLabel.textContent = "既定の出力形式";
  formatLabel.append(format);

  const confirmDelete = targetDocument.createElement("input");
  confirmDelete.type = "checkbox";
  confirmDelete.checked = current.confirmBeforeDelete;
  const confirmLabel = targetDocument.createElement("label");
  confirmLabel.className = "cart2bom-checkbox-label";
  confirmLabel.append(confirmDelete, targetDocument.createTextNode("削除前に確認する"));
  form.append(sideLabel, formatLabel, confirmLabel);

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
        defaultExportFormat: format.value as AppSettings["defaultExportFormat"],
      });
      modal.close();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : "設定を保存できませんでした。";
    } finally {
      save.disabled = false;
    }
  });
  modal.content.append(form, error, save);
}
