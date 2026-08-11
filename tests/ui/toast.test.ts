import { beforeEach, describe, expect, it, vi } from "vitest";
import { showToast } from "../../src/ui/toast";

describe("showToast", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.useFakeTimers();
  });

  it("連続した通知を重ねずに積み上げ、時間経過で片付ける", () => {
    showToast(document, "1件目");
    showToast(document, "2件目");

    const stack = document.getElementById("cart2bom-toast-stack");
    expect(stack).not.toBeNull();
    expect(Array.from(stack?.children ?? [], (node) => node.textContent)).toEqual(["1件目", "2件目"]);

    vi.advanceTimersByTime(3500);
    // Both expire and the container is removed so it cannot block clicks.
    expect(document.getElementById("cart2bom-toast-stack")).toBeNull();
    vi.useRealTimers();
  });
});
