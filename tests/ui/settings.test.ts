import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/core/models";
import { openSettings } from "../../src/ui/settings";

describe("設定画面", () => {
  beforeEach(() => document.body.replaceChildren());

  it("自動・ライト・ダークからテーマを選んで保存する", async () => {
    const onSave = vi.fn(async () => undefined);
    openSettings(document, DEFAULT_SETTINGS, onSave);
    const theme = Array.from(document.querySelectorAll("label"))
      .find((label) => label.textContent?.startsWith("表示テーマ"))
      ?.querySelector("select");
    expect(Array.from(theme?.options ?? []).map((option) => option.value)).toEqual(["auto", "light", "dark"]);
    if (!theme) throw new Error("テーマ選択欄がありません。");
    theme.value = "dark";
    const save = Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent === "設定を保存");
    save?.click();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, theme: "dark" }));
  });
});
