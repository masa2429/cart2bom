import { describe, expect, it } from "vitest";
import type { CartItem } from "../../src/core/models";
import { createProductImage } from "../../src/ui/product-image";

const item = {
  imageUrl: "https://akizukidenshi.com/img/goods/M/105148.jpg",
  productUrl: "https://www.akizukidenshi.com/catalog/g/g105148/",
  name: "商品",
} as CartItem;

describe("createProductImage", () => {
  it("商品と同じホストのHTTPS画像を安全な設定で生成する", () => {
    const image = createProductImage(document, item);
    expect(image?.src).toBe(item.imageUrl);
    expect(image?.referrerPolicy).toBe("no-referrer");
  });

  it("商品と異なるホストの画像を拒否する", () => {
    expect(createProductImage(document, { ...item, imageUrl: "https://tracker.example/pixel.gif" })).toBeNull();
  });
});
