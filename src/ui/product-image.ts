import type { CartItem } from "../core/models";

function comparableHost(value: string): string {
  return value.toLowerCase().replace(/^www\./, "");
}

function isAllowedHost(item: CartItem, imageHost: string, productHost: string): boolean {
  if (comparableHost(imageHost) === comparableHost(productHost)) return true;
  return item.storeId === "monotaro" && imageHost.toLowerCase() === "jp.images-monotaro.com";
}

/** Creates an image only when it is HTTPS and hosted by the store or its known image host. */
export function createProductImage(
  targetDocument: Document,
  item: CartItem,
): HTMLImageElement | null {
  if (!item.imageUrl) return null;
  try {
    const imageUrl = new URL(item.imageUrl);
    const productUrl = new URL(item.productUrl);
    if (
      imageUrl.protocol !== "https:" ||
      !isAllowedHost(item, imageUrl.hostname, productUrl.hostname)
    ) return null;
    const image = targetDocument.createElement("img");
    image.src = imageUrl.href;
    image.alt = item.name;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.className = "cart2bom-product-image";
    return image;
  } catch {
    return null;
  }
}
