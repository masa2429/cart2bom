import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("クイックオーダーをサイト標準の送信先へ一括送信する", () => {
    document.body.innerHTML = `
      <form action="/monotaroMain.py" method="POST">
        <table><tbody>
          <tr><td></td><td><input aria-label="注文コード" name="q0"></td><td><input aria-label="数量" name="p0"></td><td>商品1</td></tr>
          <tr><td></td><td><input aria-label="注文コード" name="q1"></td><td><input aria-label="数量" name="p1"></td><td>商品2</td></tr>
          <tr><td></td><td><input aria-label="注文コード" name="q2"></td><td><input aria-label="数量" name="p2"></td><td></td></tr>
        </tbody></table>
        <button type="submit">バスケットに入れる</button>
      </form>`;
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function (this: HTMLFormElement) {
      expect(new URL(this.action).pathname).toBe("/monotaroMain.py");
      expect(new FormData(this).get("func")).toBe("monotaro.quickOrder.insertMultiServlet.InsertMultiServlet");
      expect(new FormData(this).get("q0")).toBe("47817527");
      expect(new FormData(this).get("p0")).toBe("2");
      expect(new FormData(this).get("q1")).toBe("42107457");
      expect(new FormData(this).get("p1")).toBe("10");
      expect(new FormData(this).get("q9")).toBe("");
    });

    const count = new MonotaroAdapter().submitQuickOrder(document, "47817527\t2\n42107457\t10");

    expect(count).toBe(2);
    expect(submit).toHaveBeenCalledOnce();
  });

  it("クイックオーダー画面以外では送信しない", () => {
    document.body.innerHTML = "<p>別の画面</p>";

    expect(() => new MonotaroAdapter().submitQuickOrder(document, "42107457\t10"))
      .toThrow("入力欄を確認できませんでした");
  });
});
