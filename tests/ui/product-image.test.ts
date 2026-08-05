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

  it("モノタロウの公式画像ホストを許可する", () => {
    const image = createProductImage(document, {
      ...item,
      storeId: "monotaro",
      productUrl: "https://www.monotaro.com/p/4781/7527/",
      imageUrl: "https://jp.images-monotaro.com/Monotaro3/pi/middle/mono47817527.jpg",
    });
    expect(image?.src).toContain("jp.images-monotaro.com");
  });

  it("ミスミの公式画像ホストを許可する", () => {
    const image = createProductImage(document, {
      ...item,
      storeId: "misumi",
      productUrl: "https://jp.misumi-ec.com/vona2/detail/221004937839/",
      imageUrl: "https://content.misumi-ec.com/image/upload/test/product.jpg",
    });
    expect(image?.src).toContain("content.misumi-ec.com");
  });
});
