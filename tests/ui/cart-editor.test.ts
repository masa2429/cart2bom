import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "../../src/core/models";
import { openCartEditor } from "../../src/ui/cart-editor";

const item: CartItem = {
  id: "akizuki:105148", storeId: "akizuki", storeName: "秋月電子通商", orderCode: "105148",
  manufacturerPartNumber: null, name: "<script>商品</script>", quantity: 1, unitPrice: 100,
  subtotal: 100, currency: "JPY", productUrl: "https://example.test/item", imageUrl: null,
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
    if (!listName || !quantity) throw new Error("テスト対象の入力欄がありません。");
    listName.value = "保存名";
    quantity.value = "2";
    const save = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "リストを保存");
    save?.click();
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: "保存名",
      items: [expect.objectContaining({ quantity: 2, subtotal: 200 })],
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
});
