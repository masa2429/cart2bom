export interface ModalHandle {
  overlay: HTMLDivElement;
  content: HTMLDivElement;
  close(): void;
}

/** Opens an accessible modal that closes on backdrop click, close button, or Escape. */
export function openModal(targetDocument: Document, titleText: string): ModalHandle {
  const overlay = targetDocument.createElement("div");
  overlay.className = "cart2bom-overlay";
  overlay.setAttribute("role", "presentation");

  const panel = targetDocument.createElement("section");
  panel.className = "cart2bom-modal";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");

  const header = targetDocument.createElement("header");
  header.className = "cart2bom-modal-header";
  const title = targetDocument.createElement("h2");
  title.textContent = titleText;
  const closeButton = targetDocument.createElement("button");
  closeButton.type = "button";
  closeButton.className = "cart2bom-icon-button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "閉じる");
  header.append(title, closeButton);

  const content = targetDocument.createElement("div");
  content.className = "cart2bom-modal-content";
  panel.append(header, content);
  overlay.append(panel);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") close();
  };
  const close = (): void => {
    targetDocument.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  };
  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  targetDocument.addEventListener("keydown", onKeyDown);
  targetDocument.body.append(overlay);
  closeButton.focus();
  return { overlay, content, close };
}

export function createButton(
  targetDocument: Document,
  label: string,
  kind: "primary" | "secondary" | "danger" = "secondary",
): HTMLButtonElement {
  const button = targetDocument.createElement("button");
  button.type = "button";
  button.className = `cart2bom-button cart2bom-button-${kind}`;
  button.textContent = label;
  return button;
}

export function showMessage(targetDocument: Document, title: string, message: string): void {
  const modal = openModal(targetDocument, title);
  const paragraph = targetDocument.createElement("p");
  paragraph.textContent = message;
  const close = createButton(targetDocument, "閉じる", "primary");
  close.addEventListener("click", modal.close);
  modal.content.append(paragraph, close);
}
