export interface ModalHandle {
  overlay: HTMLDivElement;
  content: HTMLDivElement;
  close(): void;
}

export interface ModalOptions {
  /** Called after the modal is removed, however it was closed. */
  onClose?: (() => void) | undefined;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

let titleSequence = 0;

function overlaysIn(targetDocument: Document): HTMLElement[] {
  return Array.from(targetDocument.querySelectorAll<HTMLElement>(".cart2bom-overlay"));
}

function isTopmost(targetDocument: Document, overlay: HTMLElement): boolean {
  const overlays = overlaysIn(targetDocument);
  return overlays[overlays.length - 1] === overlay;
}

/**
 * Opens an accessible modal that closes on backdrop click, close button, or Escape.
 *
 * Escape and Tab act on the topmost modal only, so an error dialog opened over
 * the cart editor cannot close the editor and discard the user's edits.
 */
export function openModal(
  targetDocument: Document,
  titleText: string,
  options: ModalOptions = {},
): ModalHandle {
  const previouslyFocused = targetDocument.activeElement;
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
  title.id = `cart2bom-modal-title-${++titleSequence}`;
  panel.setAttribute("aria-labelledby", title.id);
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

  // Keeps Tab inside the dialog instead of reaching the store page behind it.
  const trapFocus = (event: KeyboardEvent): void => {
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = targetDocument.activeElement;
    if (!panel.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!isTopmost(targetDocument, overlay)) return;
    if (event.key === "Escape") close();
    else if (event.key === "Tab") trapFocus(event);
  };

  const close = (): void => {
    targetDocument.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    if (overlaysIn(targetDocument).length === 0) {
      targetDocument.body.style.overflow = targetDocument.body.dataset.cart2bomOverflow ?? "";
      delete targetDocument.body.dataset.cart2bomOverflow;
    }
    if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
      previouslyFocused.focus();
    }
    options.onClose?.();
  };

  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  targetDocument.addEventListener("keydown", onKeyDown);
  // Stops the page behind the overlay from scrolling. Only the first modal
  // records the original value so nested modals restore it correctly.
  if (overlaysIn(targetDocument).length === 0) {
    targetDocument.body.dataset.cart2bomOverflow = targetDocument.body.style.overflow;
    targetDocument.body.style.overflow = "hidden";
  }
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
  const actions = targetDocument.createElement("div");
  actions.className = "cart2bom-actions";
  actions.append(close);
  modal.content.append(paragraph, actions);
}

export interface ConfirmOptions {
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

/** Cart2BOM's replacement for window.confirm, so dialogs match the rest of the UI. */
export function openConfirm(
  targetDocument: Document,
  title: string,
  options: ConfirmOptions,
): Promise<boolean> {
  return new Promise((resolve) => {
    let answer = false;
    const modal = openModal(targetDocument, title, { onClose: () => resolve(answer) });
    const message = targetDocument.createElement("p");
    message.textContent = options.message;
    const confirm = createButton(
      targetDocument,
      options.confirmLabel ?? "実行",
      options.danger ? "danger" : "primary",
    );
    confirm.addEventListener("click", () => { answer = true; modal.close(); });
    const cancel = createButton(targetDocument, "キャンセル");
    cancel.addEventListener("click", modal.close);
    const actions = targetDocument.createElement("div");
    actions.className = "cart2bom-actions";
    actions.append(confirm, cancel);
    modal.content.append(message, actions);
    confirm.focus();
  });
}

export interface PromptOptions {
  label: string;
  value?: string;
  confirmLabel?: string;
}

/** Cart2BOM's replacement for window.prompt. Resolves to null when cancelled. */
export function openPrompt(
  targetDocument: Document,
  title: string,
  options: PromptOptions,
): Promise<string | null> {
  return new Promise((resolve) => {
    let answer: string | null = null;
    const modal = openModal(targetDocument, title, { onClose: () => resolve(answer) });
    const field = targetDocument.createElement("input");
    field.type = "text";
    field.value = options.value ?? "";
    field.setAttribute("aria-label", options.label);
    const label = targetDocument.createElement("label");
    label.textContent = options.label;
    label.append(field);
    const form = targetDocument.createElement("div");
    form.className = "cart2bom-form cart2bom-settings-form";
    form.append(label);
    const submit = createButton(targetDocument, options.confirmLabel ?? "決定", "primary");
    const accept = (): void => {
      const next = field.value.trim();
      if (!next) return;
      answer = next;
      modal.close();
    };
    submit.addEventListener("click", accept);
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") accept();
    });
    const cancel = createButton(targetDocument, "キャンセル");
    cancel.addEventListener("click", modal.close);
    const actions = targetDocument.createElement("div");
    actions.className = "cart2bom-actions";
    actions.append(submit, cancel);
    modal.content.append(form, actions);
    field.focus();
    field.select();
  });
}
