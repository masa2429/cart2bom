import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_SCHEMA_VERSION, type SavedList } from "../../src/core/models";
import { renderErrorPage, renderLandingPage, renderSharedListPage } from "../../src/viewer/viewer";

const list: SavedList = {
  id: "viewer-list",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  name: "装置A 電装部品",
  description: "サークル共有用",
  tags: ["電装", "試作"],
  items: [{
    id: "akizuki:105148", storeId: "akizuki", storeName: "秋月電子通商", orderCode: "105148",
    manufacturerName: "メーカーA", manufacturerPartNumber: "MPN-A", name: "モータードライバ",
    salesUnit: "1個", quantity: 2, unitPrice: 100, subtotal: 200, currency: "JPY",
    productUrl: "https://akizukidenshi.com/catalog/g/g105148/",
    imageUrl: "https://akizukidenshi.com/images/goods/105148.jpg",
    stockStatus: null, leadTime: null, note: "要確認", capturedAt: "2026-08-05T00:00:00.000Z",
  }, {
    id: "monotaro:47817527", storeId: "monotaro", storeName: "モノタロウ", orderCode: "47817527",
    manufacturerName: "メーカーB", manufacturerPartNumber: "MPN-B", name: "ケーブル",
    salesUnit: "1本", quantity: 3, unitPrice: 200, subtotal: 600, currency: "JPY",
    productUrl: "https://www.monotaro.com/p/4781/7527/", imageUrl: null,
    stockStatus: null, leadTime: null, note: "", capturedAt: "2026-08-05T00:00:00.000Z",
  }],
  createdAt: "2026-08-05T00:00:00.000Z", updatedAt: "2026-08-05T00:00:00.000Z",
};

describe("GitHub Pages viewer", () => {
  let root: HTMLDivElement;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
    root = document.createElement("div");
    document.body.append(root);
    writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("PartsCabi風の商品一覧と店舗別操作を表示する", () => {
    const shareUrl = "https://masa2429.github.io/cart2bom/share/#cart2bom=j.test";
    renderSharedListPage(document, root, list, shareUrl);

    expect(document.querySelector(".viewer-list-title")?.textContent).toBe("装置A 電装部品");
    expect(document.querySelector(".viewer-total")?.textContent).toContain("2/2商品を選択・合計 800円");
    expect(document.querySelectorAll(".viewer-item-card")).toHaveLength(2);
    expect(document.querySelector(".viewer-content-layout")?.children).toHaveLength(2);
    expect(document.querySelector(".viewer-sidebar")?.textContent).toContain("共有・ファイル出力");
    expect(document.querySelector(".viewer-sidebar")?.textContent).toContain("店舗で注文する");
    expect(document.querySelector<HTMLImageElement>(".viewer-item-media img")?.referrerPolicy).toBe("no-referrer");
    expect(document.body.textContent).toContain("秋月電子通商（1商品）");
    expect(document.body.textContent).toContain("モノタロウ（1商品）");
    const importLink = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
      .find((candidate) => candidate.textContent === "Cart2BOMへ取り込む");
    expect(importLink?.href).toContain("akizukidenshi.com/catalog/cart/cart.aspx#cart2bom=j.test");
  });

  it("商品の選択解除を合計と店舗別出力へ反映する", () => {
    renderSharedListPage(document, root, list, "https://masa2429.github.io/cart2bom/share/#cart2bom=j.test");
    const checkbox = document.querySelector<HTMLInputElement>('input[aria-label="モータードライバを選択"]');
    if (!checkbox) throw new Error("商品選択欄がありません。");
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event("change"));
    expect(document.querySelector(".viewer-total")?.textContent).toContain("1/2商品を選択・合計 600円");
    expect(document.body.textContent).not.toContain("秋月電子通商（1商品）");
    expect(document.body.textContent).toContain("モノタロウ（1商品）");
  });

  it("平文と店舗用データをクリップボードへコピーする", async () => {
    renderSharedListPage(document, root, list, "https://masa2429.github.io/cart2bom/share/#cart2bom=j.test");
    const plain = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find((candidate) => candidate.textContent === "平文をコピー");
    const quickOrder = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find((candidate) => candidate.textContent === "一括入力データをコピー");
    plain?.click();
    quickOrder?.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(writeText.mock.calls[0]?.[0]).toContain("装置A 電装部品");
    expect(writeText.mock.calls[1]?.[0]).toMatch(/105148\t2|47817527\t3/);
  });

  it("通常ページと不正URL用の画面を安全に表示する", () => {
    renderLandingPage(document, root);
    expect(document.body.textContent).toContain("共有リストが指定されていません");
    expect(document.body.textContent).toContain("Cart2BOMをインストール");
    renderErrorPage(document, root, "<script>危険</script>");
    expect(document.querySelector("script")).toBeNull();
    expect(document.body.textContent).toContain("<script>危険</script>");
  });
});
