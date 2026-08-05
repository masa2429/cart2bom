import { describe, expect, it } from "vitest";
import { createSharedListUrl, hasSharedListFragment, readSharedListUrl } from "../../src/core/share-url";
import { CURRENT_SCHEMA_VERSION, type SavedList } from "../../src/core/models";

const list: SavedList = {
  id: "shared-list",
  schemaVersion: CURRENT_SCHEMA_VERSION,
  name: "共有テスト",
  description: "サークル内共有",
  tags: ["電装"],
  items: [{
    id: "akizuki:105148",
    storeId: "akizuki",
    storeName: "秋月電子通商",
    orderCode: "105148",
    manufacturerName: "メーカー",
    manufacturerPartNumber: "MPN-1",
    name: "共有商品",
    salesUnit: "1個",
    quantity: 2,
    unitPrice: 100,
    subtotal: 200,
    currency: "JPY",
    productUrl: "https://akizukidenshi.com/catalog/g/g105148/",
    imageUrl: null,
    stockStatus: null,
    leadTime: null,
    note: "確認用",
    capturedAt: "2026-08-05T00:00:00.000Z",
  }],
  createdAt: "2026-08-05T00:00:00.000Z",
  updatedAt: "2026-08-05T00:00:00.000Z",
};

describe("共有URL", () => {
  it("保存リストをURLへ埋め込み、検証して復元する", async () => {
    const href = await createSharedListUrl(list, "https://akizukidenshi.com/catalog/cart/cart.aspx");
    const url = new URL(href);
    expect(url.origin).toBe("https://akizukidenshi.com");
    expect(hasSharedListFragment(url)).toBe(true);
    const restored = await readSharedListUrl(url, {
      now: () => new Date("2026-08-06T00:00:00.000Z"),
      createId: () => "restored-list",
    });
    expect(restored).toMatchObject({
      id: "restored-list",
      name: list.name,
      description: list.description,
      tags: list.tags,
      items: [expect.objectContaining({
        storeId: "akizuki",
        orderCode: "105148",
        name: "共有商品",
        quantity: 2,
        capturedAt: "2026-08-06T00:00:00.000Z",
      })],
    });
  });

  it("0.5.4形式の保存リスト全体を埋め込んだURLも読み取る", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(list));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const payload = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    const url = new URL(`https://akizukidenshi.com/#cart2bom=j.${payload}`);
    expect(await readSharedListUrl(url)).toEqual(list);
  });

  it("通常URLを共有URLとして扱わない", async () => {
    const url = new URL("https://akizukidenshi.com/catalog/cart/cart.aspx");
    expect(hasSharedListFragment(url)).toBe(false);
    expect(await readSharedListUrl(url)).toBeNull();
  });

  it("壊れた共有データを拒否する", async () => {
    const url = new URL("https://akizukidenshi.com/#cart2bom=j.invalid-");
    await expect(readSharedListUrl(url)).rejects.toThrow("共有");
  });
});
