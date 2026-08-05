import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MisumiAdapter,
  normalizeMisumiPartNumber,
  parseMisumiYen,
} from "../../src/adapters/misumi";
import type { CartItem } from "../../src/core/models";

const fixture = readFileSync(resolve("tests/fixtures/misumi-cart.html"), "utf8");

describe("MisumiAdapter", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = fixture;
  });

  it("ミスミドメインとカート・見積注文ページを識別する", () => {
    const adapter = new MisumiAdapter();
    expect(adapter.matches(new URL("https://jp.misumi-ec.com/"))).toBe(true);
    expect(adapter.isCartPage(new URL("https://jp.misumi-ec.com/order/cart"), document)).toBe(true);
    expect(adapter.isQuickOrderPage(new URL("https://jp.misumi-ec.com/order/part-number/create"), document)).toBe(true);
    expect(adapter.isCartPage(new URL("https://jp.misumi-ec.com/vona2/detail/1"), document)).toBe(false);
  });

  it("金額表記を整数へ変換する", () => {
    expect(parseMisumiYen("10,512円")).toBe(10512);
    expect(parseMisumiYen("-")).toBeNull();
  });

  it("型番末尾へ表示された在庫ラベルを除去する", () => {
    expect(normalizeMisumiPartNumber("DR1-2000在庫品")).toBe("DR1-2000");
  });

  it("型番、メーカー、数量、価格、出荷日、画像を抽出する", () => {
    const result = new MisumiAdapter(() => new Date("2026-08-05T00:00:00.000Z"))
      .extractCart(document);

    expect(result.detectedCount).toBe(2);
    expect(result.warnings).toEqual([]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      orderCode: "MPCL840",
      manufacturerName: "ミスミ",
      manufacturerPartNumber: "MPCL840",
      name: "パーツクリーナー MPCL840",
      salesUnit: "パック30個入",
      quantity: 1,
      unitPrice: 10512,
      subtotal: 10512,
      leadTime: "2026/08/06",
      imageUrl: "https://content.misumi-ec.com/image/upload/test/mpcl840.jpg",
      note: "16:00以後は出荷日が1日追加になります。",
    });
    expect(result.items[1]).toMatchObject({
      orderCode: "CB3-10",
      quantity: 4,
      unitPrice: 300,
      subtotal: 1200,
    });
  });

  it("価格未表示の商品を選択して照会する", async () => {
    document.querySelector('[class*="CartDetailTile_unitPriceCell"]')?.replaceChildren(document.createTextNode("-"));
    const button = document.querySelector<HTMLButtonElement>('[data-testid="all-check-box"]');
    button?.addEventListener("click", () => {
      const price = document.querySelector('[class*="CartDetailTile_unitPriceCell"]');
      const value = document.createElement("p");
      value.textContent = "10,512";
      price?.replaceChildren(value);
    });

    await new MisumiAdapter().prepareCart(document);

    expect(button).not.toBeNull();
    expect(parseMisumiYen(document.querySelector('[class*="CartDetailTile_unitPriceCell"] p')?.textContent)).toBe(10512);
  });

  it("見積・注文形式へ型番と数量を出力する", () => {
    const adapter = new MisumiAdapter();
    expect(adapter.validateQuickOrderCode("CB3-10")).toBe(true);
    expect(adapter.validateQuickOrderCode("bad\tcode")).toBe(false);
    expect(adapter.createQuickOrderText([
      { orderCode: "CB3-10在庫品", quantity: 4, manufacturerName: "ミスミ" },
      { orderCode: "MPCL840", quantity: 1, manufacturerName: "ミスミ" },
    ] as CartItem[])).toBe("CB3-10\t4\tミスミ\nMPCL840\t1\tミスミ");
  });

  it("一括入力欄がなければ送信しない", async () => {
    document.body.replaceChildren();
    await expect(new MisumiAdapter(undefined, 0).submitQuickOrder(document, "CB3-10\t4"))
      .rejects.toThrow("一括入力欄を確認できませんでした");
  });

  it("画面描画後に追加される一括入力欄を待つ", async () => {
    document.body.replaceChildren();
    window.setTimeout(() => {
      const textarea = document.createElement("textarea");
      textarea.dataset.testid = "excel-copy-input";
      document.body.append(textarea);
    }, 10);

    await expect(new MisumiAdapter(undefined, 30).submitQuickOrder(document, "CB3-10\t4"))
      .rejects.toThrow("画面操作が時間内に完了しませんでした");
  });

  it("一括入力の処理完了を待ってカートへ追加する", async () => {
    document.body.innerHTML = `
      <textarea data-testid="excel-copy-input"></textarea>
      <button data-testid="next-button" disabled>次へ</button>
    `;
    const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    const next = document.querySelector<HTMLButtonElement>('[data-testid="next-button"]');
    textarea?.addEventListener("input", () => next?.removeAttribute("disabled"));
    next?.addEventListener("click", () => {
      const mappingSelects = ["型番 【必須】", "数量 【必須】", "取り込み不要"].map((selected) => {
        const select = document.createElement("select");
        for (const label of ["取り込み不要", "型番 【必須】", "数量 【必須】", "メーカー名"]) {
          const option = document.createElement("option");
          option.value = label;
          option.textContent = label;
          option.selected = label === selected;
          select.append(option);
        }
        document.body.append(select);
        return select;
      });
      const mappingNext = document.createElement("button");
      mappingNext.dataset.testid = "mapping-item-modal-next-button";
      mappingNext.addEventListener("click", () => {
        expect(mappingSelects[2]?.value).toBe("メーカー名");
        const progressNext = document.createElement("button");
        progressNext.dataset.testid = "progress-modal-next-input";
        progressNext.disabled = true;
        progressNext.addEventListener("click", () => {
          const addToCart = document.createElement("button");
          addToCart.dataset.testid = "add-to-cart-button";
          addToCart.addEventListener("click", () => {
            const cartLink = document.createElement("a");
            cartLink.href = "/order/cart";
            document.body.append(cartLink);
          });
          document.body.append(addToCart);
        });
        document.body.append(progressNext);
        window.setTimeout(() => progressNext.removeAttribute("disabled"), 10);
      });
      document.body.append(mappingNext);
    });

    const navigationWarning = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(new MisumiAdapter(undefined, 2_000).submitQuickOrder(
      document,
      "DR1-2000在庫品\t1\t小原歯車工業",
    )).resolves.toBe(1);
    navigationWarning.mockRestore();
    expect(textarea?.value).toBe("DR1-2000\t1\t小原歯車工業");
  });

  it("空のカートを処理する", () => {
    document.body.replaceChildren();
    expect(new MisumiAdapter().extractCart(document)).toEqual({
      items: [],
      warnings: [],
      detectedCount: 0,
    });
  });
});
