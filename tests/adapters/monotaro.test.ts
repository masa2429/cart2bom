import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { MonotaroAdapter, parseMonotaroYen } from "../../src/adapters/monotaro";

const fixture = readFileSync(resolve("tests/fixtures/monotaro-cart.html"), "utf8");

describe("MonotaroAdapter", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = fixture;
  });

  it("www有無を判定し、バスケットページだけを識別する", () => {
    const adapter = new MonotaroAdapter();
    expect(adapter.matches(new URL("https://www.monotaro.com/"))).toBe(true);
    expect(adapter.matches(new URL("https://monotaro.com/"))).toBe(true);
    expect(adapter.isCartPage(new URL("https://www.monotaro.com/basket/"), document)).toBe(true);
    expect(adapter.isCartPage(new URL("https://www.monotaro.com/p/4781/7527/"), document)).toBe(false);
  });

  it("円表記を整数へ変換する", () => {
    expect(parseMonotaroYen("￥5,290")).toBe(5290);
    expect(parseMonotaroYen("価格未定")).toBeNull();
  });

  it("商品情報を抽出し、カート外の商品を含めない", () => {
    const adapter = new MonotaroAdapter(() => new Date("2026-08-05T00:00:00.000Z"));
    const result = adapter.extractCart(document);

    expect(result.detectedCount).toBe(3);
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      orderCode: "47817527",
      manufacturerName: "泰豊トレーディング",
      manufacturerPartNumber: "4366",
      name: "焼入れリボン",
      salesUnit: "1個",
      quantity: 1,
      unitPrice: 619,
      subtotal: 619,
      productUrl: "https://www.monotaro.com/p/4781/7527/",
      imageUrl: "https://jp.images-monotaro.com/Monotaro3/pi/middle/mono47817527.jpg",
      leadTime: "当日出荷",
    });
    expect(result.items[1]).toMatchObject({
      manufacturerName: "Namekawa(滑川軽銅)",
      manufacturerPartNumber: null,
      salesUnit: "1枚",
      note: "オプションを指定してください。",
    });
    expect(result.items[2]).toMatchObject({
      orderCode: "42107457",
      manufacturerPartNumber: "SB203040CD",
      salesUnit: "1パック(12個)",
      quantity: 10,
      unitPrice: 529,
      subtotal: 5290,
    });
    expect(result.items.some((item) => item.orderCode === "99999999")).toBe(false);
  });

  it("オプション未指定を警告し、商品自体は保持する", () => {
    const result = new MonotaroAdapter().extractCart(document);
    expect(result.warnings).toEqual([{
      code: "order-option-required",
      message: "オプションを指定してください。",
      itemHint: "58470702",
    }]);
    expect(result.items).toHaveLength(3);
  });

  it("空のバスケットを処理する", () => {
    document.body.replaceChildren();
    expect(new MonotaroAdapter().extractCart(document)).toEqual({
      items: [],
      warnings: [],
      detectedCount: 0,
    });
  });

  it("クイックオーダーの注文コードと数量を入力し、送信しない", () => {
    document.body.innerHTML = `
      <form>
        <input aria-label="注文コード" name="q0"><input aria-label="数量" name="p0">
        <input aria-label="注文コード" name="q1"><input aria-label="数量" name="p1">
        <input aria-label="注文コード" name="q2" value="99999999"><input aria-label="数量" name="p2" value="99">
        <button type="submit">バスケットに入れる</button>
      </form>`;
    const form = document.querySelector("form");
    const submit = document.querySelector("button");
    const submitted = { value: false };
    form?.addEventListener("submit", (event) => { event.preventDefault(); submitted.value = true; });

    const count = new MonotaroAdapter().fillQuickOrder(document, "47817527\t2\n42107457\t10");

    expect(count).toBe(2);
    expect(document.querySelector<HTMLInputElement>('input[name="q0"]')?.value).toBe("47817527");
    expect(document.querySelector<HTMLInputElement>('input[name="p0"]')?.value).toBe("2");
    expect(document.querySelector<HTMLInputElement>('input[name="q1"]')?.value).toBe("42107457");
    expect(document.querySelector<HTMLInputElement>('input[name="p1"]')?.value).toBe("10");
    expect(document.querySelector<HTMLInputElement>('input[name="q2"]')?.value).toBe("");
    expect(document.querySelector<HTMLInputElement>('input[name="p2"]')?.value).toBe("");
    expect(submitted.value).toBe(false);
    expect(submit).not.toBeNull();
  });
});
