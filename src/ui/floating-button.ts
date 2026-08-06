import {
  CART2BOM_STYLES,
  FLOATING_BUTTON_ID,
  STYLE_ELEMENT_ID,
} from "./styles";

/** Adds the persistent Cart2BOM launcher without duplicating an existing UI. */
export function mountFloatingButton(
  targetDocument: Document,
  onClick?: () => void,
  side: "left" | "right" = "right",
): HTMLButtonElement {
  const existing = targetDocument.getElementById(FLOATING_BUTTON_ID);
  if (existing instanceof HTMLButtonElement) {
    return existing;
  }

  if (!targetDocument.getElementById(STYLE_ELEMENT_ID)) {
    const style = targetDocument.createElement("style");
    style.id = STYLE_ELEMENT_ID;
    style.textContent = CART2BOM_STYLES;
    targetDocument.head.append(style);
  }

  const button = targetDocument.createElement("button");
  button.id = FLOATING_BUTTON_ID;
  button.type = "button";
  button.textContent = "Cart2BOM";
  button.title = "Cart2BOMメニューを開く";
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-expanded", "false");
  button.dataset.side = side;
  if (onClick) button.addEventListener("click", onClick);
  targetDocument.body.append(button);

  return button;
}
