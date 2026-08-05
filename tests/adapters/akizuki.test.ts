import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AkizukiAdapter, extractAkizukiOrderCode, parseYen } from "../../src/adapters/akizuki";

const fixture = readFileSync(resolve("tests/fixtures/akizuki-cart.html"), "utf8");

describe("AkizukiAdapter", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = fixture;
  });

  it("www有無を判定し、カートページだけを識別する", () => {
    const adapter = new AkizukiAdapter();
    expect(adapter.matches(new URL("https://www.akizukidenshi.com/"))).toBe(true);
    expect(adapter.isCartPage(new URL("https://akizukidenshi.com/catalog/cart/cart.aspx"), document)).toBe(true);
    expect(adapter.isCartPage(new URL("https://akizukidenshi.com/catalog/g/g105148/"), document)).toBe(false);
  });

  it("商品URLから6桁の通販コードを取得する", () => {
    expect(extractAkizukiOrderCode("https://akizukidenshi.com/catalog/g/g105148/?x=1")).toBe("105148");
    expect(extractAkizukiOrderCode("https://akizukidenshi.com/catalog/g/g12345/")).toBeNull();
  });

  it("円表記を整数へ変換する", () => {
    expect(parseYen("￥1,200 円")).toBe(1200);
    expect(parseYen("価格未定")).toBeNull();
  });

  it("数量、商品名、価格を抽出し、複数リンクを二重計上しない", () => {
    const adapter = new AkizukiAdapter(() => new Date("2026-08-04T00:00:00.000Z"));
    const result = adapter.extractCart(document);

    expect(result.detectedCount).toBe(3);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      orderCode: "105148",
      name: "ブレッドボード用2.1mm標準DCジャックDIP化キット",
      manufacturerName: "Cart2BOM工業",
      manufacturerPartNumber: "C2B-105148",
      salesUnit: "1セット",
      quantity: 2,
      unitPrice: 100,
      subtotal: 200,
      imageUrl: "https://akizukidenshi.com/images/105148.jpg",
    });
    expect(result.items[1]).toMatchObject({
      orderCode: "131939",
      quantity: 3,
      unitPrice: 1200,
      subtotal: 3600,
    });
  });

  it("必須要素が欠けた商品を警告し、取得済み商品は返す", () => {
    const result = new AkizukiAdapter().extractCart(document);
    expect(result.items).toHaveLength(2);
    expect(result.warnings).toContainEqual(expect.objectContaining({
      code: "quantity-not-found",
      itemHint: "999999",
    }));
  });

  it("カート外の最近チェックした商品を警告対象にしない", () => {
    const recent = document.createElement("section");
    recent.innerHTML = '<ul><li><a href="/catalog/g/g131155/">最近チェックした商品</a></li></ul>';
    document.body.append(recent);

    const result = new AkizukiAdapter().extractCart(document);

    expect(result.detectedCount).toBe(3);
    expect(result.warnings).not.toContainEqual(expect.objectContaining({ itemHint: "131155" }));
  });

  it("空のカートを処理する", () => {
    document.body.replaceChildren();
    expect(new AkizukiAdapter().extractCart(document)).toEqual({
      items: [],
      warnings: [],
      detectedCount: 0,
    });
  });

  it("一括注文を秋月標準フォームから買い物かごへ送信する", () => {
    document.body.innerHTML = `
      <form id="quickorder_form" action="/catalog/cart/cart.aspx" method="GET">
        <input name="crsirefo_hidden" value="test-token">
      </form>`;
    const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function (this: HTMLFormElement) {
      const data = new FormData(this);
      expect(new URL(this.action).pathname).toBe("/catalog/cart/cart.aspx");
      expect(this.method).toBe("get");
      expect(data.get("crsirefo_hidden")).toBe("test-token");
      expect(data.getAll("goods").slice(0, 3)).toEqual(["105148", "131939", ""]);
      expect(data.getAll("qty").slice(0, 3)).toEqual(["2", "3", ""]);
      expect(data.getAll("goods")).toHaveLength(30);
    });

    const adapter = new AkizukiAdapter();
    expect(adapter.isQuickOrderPage(
      new URL("https://akizukidenshi.com/catalog/quickorder/quickorder.aspx"),
      document,
    )).toBe(true);
    expect(adapter.submitQuickOrder(document, "105148\t2\n131939\t3")).toBe(2);
    expect(submit).toHaveBeenCalledOnce();
  });

  it("トークンのない一括注文画面では送信しない", () => {
    document.body.innerHTML = '<form id="quickorder_form" action="/catalog/cart/cart.aspx"></form>';
    expect(() => new AkizukiAdapter().submitQuickOrder(document, "105148\t2"))
      .toThrow("一括注文フォームを確認できませんでした");
  });
});
