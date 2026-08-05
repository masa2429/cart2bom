import type { SavedList } from "../core/models";
import { parseSavedListJson } from "../core/validation";
import { createButton, openModal } from "./modal";

export function openImportDialog(
  targetDocument: Document,
  onImport: (list: SavedList) => Promise<void>,
): void {
  const modal = openModal(targetDocument, "JSONインポート");
  const file = targetDocument.createElement("input");
  file.type = "file";
  file.accept = ".json,application/json";
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
  modal.content.append(file, textarea, error, importButton);
}
