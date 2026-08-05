import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS, type SavedList } from "../../src/core/models";
import { startCart2BOM } from "../../src/app";

const fixture = readFileSync(resolve("tests/fixtures/akizuki-cart.html"), "utf8");

function buttonByText(label: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`ボタン「${label}」が見つかりません。`);
  }
  return button;
}

describe("Cart2BOM app flow", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = fixture;
    vi.stubGlobal("__CART2BOM_VERSION__", "0.1.0-test");
    vi.stubGlobal("__CART2BOM_DEVELOPMENT__", false);
  });

  it("カートを読み取り、編集結果をGMストレージへ保存して再表示する", async () => {
    const values = new Map<string, unknown>();
    vi.stubGlobal("GM", {
      async getValue<T>(key: string, defaultValue: T): Promise<T> {
        return structuredClone(values.has(key) ? values.get(key) : defaultValue) as T;
      },
      async setValue<T>(key: string, value: T): Promise<void> {
        values.set(key, structuredClone(value));
      },
      async deleteValue(key: string): Promise<void> {
        values.delete(key);
      },
    } satisfies Cart2BOMGMApi);

    startCart2BOM();
    const launcher = document.getElementById("cart2bom-floating-button");
    expect(launcher).toBeInstanceOf(HTMLButtonElement);
    launcher?.click();
    buttonByText("現在のカートを読み取る").click();

    const listName = document.querySelector<HTMLInputElement>('input[aria-label="リスト名"]');
    const quantity = document.querySelector<HTMLInputElement>('input[aria-label="105148の数量"]');
    expect(listName).not.toBeNull();
    expect(quantity?.value).toBe("2");
    if (!listName || !quantity) throw new Error("編集欄を表示できませんでした。");
    listName.value = "統合テスト用リスト";
    quantity.value = "4";
    buttonByText("リストを保存").click();

    await vi.waitFor(() => {
      const saved = values.get(STORAGE_KEYS.lists) as SavedList[] | undefined;
      expect(saved).toHaveLength(1);
      expect(saved?.[0]).toMatchObject({
        name: "統合テスト用リスト",
        items: [expect.objectContaining({ orderCode: "105148", quantity: 4, subtotal: 400 }), expect.any(Object)],
      });
    });

    launcher?.click();
    buttonByText("保存済みリスト").click();
    await vi.waitFor(() => {
      expect(document.querySelector(".cart2bom-list-card h3")?.textContent).toBe("統合テスト用リスト");
      expect(document.querySelector(".cart2bom-list-card p")?.textContent).toContain("2商品");
    });
  });
});
