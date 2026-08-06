import { describe, expect, it, vi } from "vitest";
import { applyCart2BOMTheme, THEME_ATTRIBUTE, THEME_PREFERENCE_ATTRIBUTE } from "../../src/ui/styles";

describe("表示テーマ", () => {
  it("自動設定でOS配色へ追従し、明示設定を優先する", () => {
    const media = {
      matches: true,
      addEventListener: vi.fn(),
    };
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => media),
    });

    applyCart2BOMTheme(document, "auto");
    expect(document.documentElement.getAttribute(THEME_PREFERENCE_ATTRIBUTE)).toBe("auto");
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe("dark");

    applyCart2BOMTheme(document, "light");
    expect(document.documentElement.getAttribute(THEME_PREFERENCE_ATTRIBUTE)).toBe("light");
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe("light");
  });
});
