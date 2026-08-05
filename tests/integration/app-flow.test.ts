import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_SCHEMA_VERSION, STORAGE_KEYS, type SavedList } from "../../src/core/models";
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

function installMemoryGm(values: Map<string, unknown>): void {
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
}

describe("Cart2BOM app flow", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = fixture;
    vi.stubGlobal("__CART2BOM_VERSION__", "0.1.0-test");
    vi.stubGlobal("__CART2BOM_DEVELOPMENT__", false);
  });

  it("カートを読み取り、編集結果をGMストレージへ保存して再表示する", async () => {
    const values = new Map<string, unknown>();
    installMemoryGm(values);

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

  it("JSONテキストを検証してGMストレージへインポートする", async () => {
    const values = new Map<string, unknown>();
    installMemoryGm(values);
    const imported: SavedList = {
      id: "import-test-list",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      name: "JSONインポート統合テスト",
      description: "JSONテキストから復元",
      tags: ["test"],
      items: [{
        id: "akizuki:105148",
        storeId: "akizuki",
        storeName: "秋月電子通商",
        orderCode: "105148",
        manufacturerName: "テストメーカー",
        manufacturerPartNumber: null,
        name: "テスト商品",
        salesUnit: "1個",
        quantity: 3,
        unitPrice: 100,
        subtotal: 300,
        currency: "JPY",
        productUrl: "https://akizukidenshi.com/catalog/g/g105148/",
        imageUrl: null,
        stockStatus: null,
        leadTime: null,
        note: "復元確認",
        capturedAt: "2026-08-05T00:00:00.000Z",
      }],
      createdAt: "2026-08-05T00:00:00.000Z",
      updatedAt: "2026-08-05T00:00:00.000Z",
    };

    startCart2BOM();
    document.getElementById("cart2bom-floating-button")?.click();
    buttonByText("インポート").click();
    const textarea = document.querySelector<HTMLTextAreaElement>(".cart2bom-import-text");
    expect(textarea).not.toBeNull();
    if (!textarea) throw new Error("JSON入力欄を表示できませんでした。");
    textarea.value = JSON.stringify(imported);
    buttonByText("インポート").click();

    await vi.waitFor(() => {
      expect(values.get(STORAGE_KEYS.lists)).toEqual([imported]);
      expect(document.body.textContent).toContain("リストをインポートしました。");
    });
  });
});
