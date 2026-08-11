const BUSY_ID = "cart2bom-busy";

export interface BusyHandle {
  update(message: string): void;
  close(): void;
}

/**
 * Covers the page while Cart2BOM waits on the store.
 *
 * MISUMI needs several seconds to load prices and up to twenty per step when
 * adding to the cart. Without this the user sees an idle page and assumes the
 * click did nothing.
 */
export function showBusy(targetDocument: Document, message: string): BusyHandle {
  const existing = targetDocument.getElementById(BUSY_ID);
  existing?.remove();

  const overlay = targetDocument.createElement("div");
  overlay.id = BUSY_ID;
  overlay.className = "cart2bom-busy";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");

  const panel = targetDocument.createElement("div");
  panel.className = "cart2bom-busy-panel";
  const spinner = targetDocument.createElement("span");
  spinner.className = "cart2bom-busy-spinner";
  spinner.setAttribute("aria-hidden", "true");
  const label = targetDocument.createElement("p");
  label.className = "cart2bom-busy-message";
  label.textContent = message;
  const note = targetDocument.createElement("p");
  note.className = "cart2bom-busy-note";
  note.textContent = "通販サイトの応答を待っています。このタブを閉じないでください。";
  panel.append(spinner, label, note);
  overlay.append(panel);
  targetDocument.body.append(overlay);

  return {
    update: (next: string): void => { label.textContent = next; },
    close: (): void => { overlay.remove(); },
  };
}
