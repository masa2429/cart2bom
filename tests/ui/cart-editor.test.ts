import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "../../src/core/models";
import { openCartEditor } from "../../src/ui/cart-editor";

const item: CartItem = {
  id: "akizuki:105148", storeId: "akizuki", storeName: "秋月電子通商", orderCode: "105148",
  manufacturerName: "旧メーカー", manufacturerPartNumber: "OLD-1", name: "<script>商品</script>", salesUnit: "1個", quantity: 1, unitPrice: 100,
  subtotal: 100, currency: "JPY", productUrl: "https://example.test/item", imageUrl: "https://example.test/item.jpg",
  stockStatus: null, leadTime: null, note: "", capturedAt: "2026-08-04T00:00:00.000Z",
};

describe("openCartEditor", () => {
  beforeEach(() => document.body.replaceChildren());

  it("商品名をHTMLとして解釈せず、編集値を保存する", async () => {
    const onSave = vi.fn(async () => undefined);
    openCartEditor(document, { items: [item], onSave });
    expect(document.querySelector("script")).toBeNull();

    const listName = document.querySelector<HTMLInputElement>('input[aria-label="リスト名"]');
    const quantity = document.querySelector<HTMLInputElement>('input[aria-label="105148の数量"]');
    const manufacturer = document.querySelector<HTMLInputElement>('input[aria-label="105148のメーカー名"]');
    const mpn = document.querySelector<HTMLInputElement>('input[aria-label="105148のメーカー型番"]');
    const salesUnit = document.querySelector<HTMLInputElement>('input[aria-label="105148の販売単位"]');
    if (!listName || !quantity || !manufacturer || !mpn || !salesUnit) throw new Error("テスト対象の入力欄がありません。");
    expect(document.querySelector<HTMLImageElement>(".cart2bom-product-image")?.src).toBe("https://example.test/item.jpg");
    expect(document.querySelector(".cart2bom-list-total")?.textContent).toBe("合計 100円");
    listName.value = "保存名";
    quantity.value = "2";
    quantity.dispatchEvent(new Event("input"));
    manufacturer.value = "新メーカー";
    mpn.value = "NEW-2";
    salesUnit.value = "1袋10個入";
    expect(document.querySelector(".cart2bom-list-total")?.textContent).toBe("合計 200円");
    const save = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "リストを保存");
    save?.click();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: "保存名",
      items: [expect.objectContaining({
        manufacturerName: "新メーカー",
        manufacturerPartNumber: "NEW-2",
        salesUnit: "1袋10個入",
        quantity: 2,
        subtotal: 200,
      })],
    }));
  });

  it("数量0を拒否する", async () => {
    const onSave = vi.fn(async () => undefined);
    openCartEditor(document, { items: [item], onSave });
    const quantity = document.querySelector<HTMLInputElement>('input[aria-label="105148の数量"]');
    if (!quantity) throw new Error("テスト対象の入力欄がありません。");
    quantity.value = "0";
    const save = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "リストを保存");
    save?.click();
    expect(document.querySelector(".cart2bom-error")?.textContent).toContain("正の整数");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("読み取り警告の対象商品と内容を表示する", () => {
    openCartEditor(document, {
      items: [item],
      warnings: [{
        code: "quantity-not-found",
        message: "数量を取得できませんでした。",
        itemHint: "999999",
      }],
      onSave: vi.fn(async () => undefined),
    });

    expect(document.querySelector(".cart2bom-warning-details summary")?.textContent)
      .toBe("読み取り警告（1件）");
    expect(document.querySelector(".cart2bom-warning-details li")?.textContent)
      .toBe("999999: 数量を取得できませんでした。");
  });
});
