export function showToast(targetDocument: Document, message: string): void {
  const toast = targetDocument.createElement("div");
  toast.className = "cart2bom-toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  targetDocument.body.append(toast);
  window.setTimeout(() => toast.remove(), 3500);
}
