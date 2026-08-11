import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_SCHEMA_VERSION, type SavedList } from "../../src/core/models";
import { renderErrorPage, renderInstallPage, renderLandingPage, renderSharedListPage } from "../../src/viewer/viewer";

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
    expect(document.querySelectorAll(".viewer-filters .viewer-button-filter")).toHaveLength(3);
    expect(document.querySelector(".viewer-content-layout")?.children).toHaveLength(2);
    expect(document.querySelector(".viewer-sidebar")?.textContent).toContain("共有・ファイル出力");
    expect(document.querySelector(".viewer-sidebar")?.textContent).toContain("店舗で注文する");
    expect(document.querySelector(".viewer-sidebar > :first-child .viewer-section-title")?.textContent)
      .toBe("店舗で注文する");
    expect(document.querySelector<HTMLImageElement>(".viewer-item-media img")?.referrerPolicy).toBe("no-referrer");
    expect(document.body.textContent).toContain("秋月電子通商（1商品）");
    expect(document.body.textContent).toContain("モノタロウ（1商品）");
    const akizukiProceed = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
      .find((candidate) => candidate.textContent === "入力済みの画面を開く");
    expect(akizukiProceed?.href).toContain("blanketorder.aspx?regist_goods=105148+2#cart2bom=");
    expect(new URL(akizukiProceed?.href ?? "https://example.com").searchParams.get("regist_goods")).toBe("105148 2");
    expect(akizukiProceed?.href).toContain("&action=quick-order&store=akizuki");
    const monotaroAutoFill = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
      .find((candidate) => candidate.textContent === "Cart2BOMで自動入力");
    expect(monotaroAutoFill?.href).toContain("www.monotaro.com/quick-order/#cart2bom=");
    expect(monotaroAutoFill?.href).toContain("&action=quick-order&store=monotaro");
    const monotaroProceed = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
      .find((candidate) => candidate.textContent === "公式入力画面を開く");
    expect(monotaroProceed?.href).toBe("https://www.monotaro.com/quick-order/");
    expect(document.body.textContent).toContain("入力補助（1商品）");
    expect(document.body.textContent).not.toContain("入力データをコピー");
    expect(document.body.textContent).not.toContain("公式の一括入力画面を開く");
    const importLink = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
      .find((candidate) => candidate.textContent === "Cart2BOMへ取り込む");
    expect(importLink?.href).toContain("akizukidenshi.com/catalog/cart/cart.aspx#cart2bom=j.test");
  });

  it("単一店舗のリストでは冗長な店舗フィルタを表示しない", () => {
    const singleStoreList: SavedList = { ...list, items: [list.items[1]!] };
    renderSharedListPage(document, root, singleStoreList, "https://masa2429.github.io/cart2bom/share/#cart2bom=j.test");

    expect(document.querySelector(".viewer-filters")).toBeNull();
    expect(document.querySelector(".viewer-controls")?.classList).toContain("viewer-controls-selection-only");
    expect(document.querySelector(".viewer-selection-actions")?.textContent).toContain("すべて選択");
    expect(document.querySelector(".viewer-selection-actions")?.textContent).toContain("すべて解除");
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

  it("平文をクリップボードへコピーする", async () => {
    renderSharedListPage(document, root, list, "https://masa2429.github.io/cart2bom/share/#cart2bom=j.test");
    const plain = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find((candidate) => candidate.textContent === "平文をコピー");
    plain?.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]?.[0]).toContain("装置A 電装部品");
  });

  it("ミスミは入力データのコピーと公式画面への移動を1つのボタンにまとめる", async () => {
    const misumiList: SavedList = {
      ...list,
      items: [{
        ...list.items[0]!,
        id: "misumi:HNTTBS5-5",
        storeId: "misumi",
        storeName: "ミスミ",
        orderCode: "HNTTBS5-5",
        manufacturerName: "ミスミ",
        manufacturerPartNumber: "HNTTBS5-5",
        name: "後入れロックナット",
        productUrl: "https://jp.misumi-ec.com/vona2/detail/110302247050/",
      }],
    };
    renderSharedListPage(document, root, misumiList, "https://masa2429.github.io/cart2bom/share/#cart2bom=j.test");
    const proceed = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
      .find((candidate) => candidate.textContent === "コピーして開く");
    expect(proceed?.href).toContain("jp.misumi-ec.com/order/part-number/create#cart2bom=j.test");
    expect(proceed?.href).toContain("&action=quick-order&store=misumi");
    proceed?.addEventListener("click", (event) => event.preventDefault(), { capture: true });
    proceed?.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("HNTTBS5-5\t2\tミスミ"));
    await vi.waitFor(() => expect(document.querySelector(".viewer-status")?.textContent)
      .toContain("エクセルから一括コピー"));
    expect(document.body.textContent).not.toContain("公式の一括入力画面を開く");
  });

  it("モノタロウは一括入力用データとq0-p9へ貼り付ける値をコピーできる", async () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      ...list.items[1]!,
      id: `monotaro:${10_000_000 + index}`,
      orderCode: String(10_000_000 + index),
      name: `モノタロウ商品${index + 1}`,
      quantity: index + 1,
    }));
    const monotaroList: SavedList = { ...list, items };
    renderSharedListPage(document, root, monotaroList, "https://masa2429.github.io/cart2bom/share/#cart2bom=j.test");

    const guides = document.querySelectorAll<HTMLDetailsElement>(".viewer-copy-guide");
    expect(guides).toHaveLength(2);
    expect(guides[0]?.open).toBe(true);
    expect(guides[0]?.textContent).toContain("1回目の入力補助（10商品）");
    expect(guides[1]?.textContent).toContain("2回目の入力補助（1商品）");
    const bulk = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find((candidate) => candidate.textContent === "全商品をコピー");
    const code = document.querySelector<HTMLButtonElement>('button[aria-label="q0用の10000000をコピー"]');
    const quantity = document.querySelector<HTMLButtonElement>('button[aria-label="p0用の1をコピー"]');
    bulk?.click();
    code?.click();
    quantity?.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(3));
    expect(writeText.mock.calls[0]?.[0]).toContain("10000000 1\n10000001 2");
    expect(writeText.mock.calls[0]?.[0]).toContain("10000010 11");
    expect(writeText.mock.calls[1]?.[0]).toBe("10000000");
    expect(writeText.mock.calls[2]?.[0]).toBe("1");
    await vi.waitFor(() => expect(bulk?.classList.contains("viewer-copy-done")).toBe(true));
    await vi.waitFor(() => expect(code?.classList.contains("viewer-copy-done")).toBe(true));
    expect(bulk?.textContent).toBe("✓ コピー済み");
    expect(code?.textContent).toBe("✓ 10000000");
    expect(code?.getAttribute("aria-label")).toContain("コピー済み");
    expect(document.querySelector('form[action="https://www.monotaro.com/monotaroMain.py"]')).toBeNull();
  });

  it("通常ページと不正URL用の画面を安全に表示する", () => {
    renderLandingPage(document, root);
    expect(document.body.textContent).toContain("通販サイトのカートを、保存・共有できる部品リストへ変換します");
    const installGuide = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"))
      .find((candidate) => candidate.textContent === "インストール方法を見る");
    expect(installGuide?.getAttribute("href")).toBe("../install/");
    renderErrorPage(document, root, "<script>危険</script>");
    expect(document.querySelector("script")).toBeNull();
    expect(document.body.textContent).toContain("<script>危険</script>");
    expect(document.body.textContent).toContain("共有画面へ戻る");
  });

  it("Tampermonkeyを先に案内するインストールページを表示する", () => {
    renderInstallPage(document, root);
    expect(document.body.textContent).toContain("Tampermonkeyを準備");
    expect(document.body.textContent).toContain("Cart2BOMを追加");
    expect(document.body.textContent).toContain("対応サイトで使う");
    expect(document.querySelectorAll(".viewer-install-step")).toHaveLength(3);
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe("インストール");
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"));
    expect(links.find((candidate) => candidate.textContent === "Tampermonkey公式サイト ↗")?.href)
      .toBe("https://www.tampermonkey.net/");
    expect(links.find((candidate) => candidate.textContent === "Cart2BOMをインストール")?.href)
      .toBe("https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js");
  });
});
