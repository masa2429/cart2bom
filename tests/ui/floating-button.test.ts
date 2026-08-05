import { beforeEach, describe, expect, it } from "vitest";
import { mountFloatingButton } from "../../src/ui/floating-button";
import {
  FLOATING_BUTTON_ID,
  STYLE_ELEMENT_ID,
} from "../../src/ui/styles";

describe("mountFloatingButton", () => {
  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
  });

  it("固定ボタンとスタイルを追加する", () => {
    const button = mountFloatingButton(document);

    expect(button.id).toBe(FLOATING_BUTTON_ID);
    expect(button.textContent).toContain("Cart2BOM");
    expect(document.getElementById(STYLE_ELEMENT_ID)).not.toBeNull();
  });

  it("複数回呼び出してもボタンを重複させない", () => {
    const first = mountFloatingButton(document);
    const second = mountFloatingButton(document);

    expect(second).toBe(first);
    expect(document.querySelectorAll(`#${FLOATING_BUTTON_ID}`)).toHaveLength(1);
  });
});
