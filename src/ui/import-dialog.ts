import type { SavedList } from "../core/models";
import { parseSavedListJson } from "../core/validation";
import { createButton, openModal } from "./modal";

export function openImportDialog(
  targetDocument: Document,
  onImport: (list: SavedList) => Promise<void>,
): void {
  const modal = openModal(targetDocument, "JSONインポート");
  const intro = targetDocument.createElement("p");
  intro.className = "cart2bom-import-intro";
  intro.textContent = "Cart2BOMから書き出したJSONファイルを選ぶか、内容を貼り付けてください。";
  const fileLabel = targetDocument.createElement("label");
  fileLabel.className = "cart2bom-file-field";
  fileLabel.append(targetDocument.createTextNode("JSONファイルを選択"));
  const file = targetDocument.createElement("input");
  file.type = "file";
  file.accept = ".json,application/json";
  fileLabel.append(file);
  const textarea = targetDocument.createElement("textarea");
  textarea.className = "cart2bom-import-text";
  textarea.placeholder = "JSONを貼り付けてください。";
  file.addEventListener("change", async () => {
    const selected = file.files?.[0];
    if (selected) textarea.value = await selected.text();
  });
  const error = targetDocument.createElement("p");
  error.className = "cart2bom-error";
  error.setAttribute("role", "alert");
  const importButton = createButton(targetDocument, "インポート", "primary");
  importButton.addEventListener("click", async () => {
    const result = parseSavedListJson(textarea.value);
    if (!result.ok) {
      error.textContent = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join(" / ");
      return;
    }
    importButton.disabled = true;
    try {
      await onImport(result.value);
      modal.close();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : "インポートに失敗しました。";
    } finally {
      importButton.disabled = false;
    }
  });
  const actions = targetDocument.createElement("div");
  actions.className = "cart2bom-actions";
  actions.append(importButton);
  modal.content.append(intro, fileLabel, textarea, error, actions);
}
