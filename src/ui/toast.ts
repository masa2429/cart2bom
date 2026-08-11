const TOAST_STACK_ID = "cart2bom-toast-stack";
const TOAST_DURATION_MS = 3500;

/** Stacks toasts instead of drawing them on top of each other. */
function getStack(targetDocument: Document): HTMLElement {
  const existing = targetDocument.getElementById(TOAST_STACK_ID);
  if (existing) return existing;
  const stack = targetDocument.createElement("div");
  stack.id = TOAST_STACK_ID;
  stack.className = "cart2bom-toast-stack";
  targetDocument.body.append(stack);
  return stack;
}

export function showToast(targetDocument: Document, message: string): void {
  const stack = getStack(targetDocument);
  const toast = targetDocument.createElement("div");
  toast.className = "cart2bom-toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  stack.append(toast);
  window.setTimeout(() => {
    toast.remove();
    if (stack.childElementCount === 0) stack.remove();
  }, TOAST_DURATION_MS);
}
