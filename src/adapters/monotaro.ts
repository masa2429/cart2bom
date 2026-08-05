import type { CartItem } from "../core/models";
import type {
  CartExtractionResult,
  ExtractionWarning,
  StoreAdapter,
} from "./adapter";

const ITEM_SELECTOR = "main section.BasketItem[data-monotaro-no]";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parsePositiveInteger(value: string | null | undefined): number | null {
  if (!/^\d+$/.test((value ?? "").trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseMonotaroYen(value: string | null | undefined): number | null {
  const normalized = (value ?? "").replace(/[￥¥,\s]/g, "");
  const match = normalized.match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function splitMaker(value: string): { manufacturerName: string | null; manufacturerPartNumber: string | null } {
  const separator = value.lastIndexOf("/");
  if (separator < 0) {
    return { manufacturerName: value || null, manufacturerPartNumber: null };
  }
  const manufacturerName = value.slice(0, separator).trim();
  const partNumber = value.slice(separator + 1).trim();
  return {
    manufacturerName: manufacturerName || null,
    manufacturerPartNumber: partNumber && partNumber !== "-" ? partNumber : null,
  };
}

function readAmountRow(container: Element, title: string): number | null {
  for (const row of container.querySelectorAll(".BasketItemAmount tr")) {
    const heading = normalizeText(row.querySelector(".BasketItemAmount__Title")?.textContent);
    if (heading === title) {
      return parseMonotaroYen(row.querySelector(".BasketItemAmount__Content")?.textContent);
    }
  }
  return null;
}

function readSalesUnit(container: Element): string | null {
  const specification = normalizeText(
    container.querySelector(".BasketItemInformation .u-LineHeight--Default")?.textContent,
  );
  const match = specification.match(/内容量\s*[:：]\s*(.+?)(?=\s+[^\s:：]+\s*[:：]|$)/u);
  return match?.[1]?.trim() || null;
}

function absoluteUrl(value: string | null, base: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, base).href;
  } catch {
    return null;
  }
}

function warning(code: string, message: string, itemHint?: string): ExtractionWarning {
  return itemHint ? { code, message, itemHint } : { code, message };
}

export class MonotaroAdapter implements StoreAdapter {
  public readonly id = "monotaro";
  public readonly name = "モノタロウ";
  public readonly listNamePrefix = "モノタロウカート";

  public constructor(private readonly now: () => Date = () => new Date()) {}

  public matches(url: URL): boolean {
    return /^(?:www\.)?monotaro\.com$/i.test(url.hostname);
  }

  public isCartPage(url: URL, _document: Document): boolean {
    return this.matches(url) && /^\/basket\/?$/i.test(url.pathname);
  }

  public getCartUrl(): string {
    return "https://www.monotaro.com/basket/";
  }

  /** Reads only basket item sections so recommendations below the basket are excluded. */
  public extractCart(targetDocument: Document): CartExtractionResult {
    const containers = Array.from(targetDocument.querySelectorAll(ITEM_SELECTOR));
    const warnings: ExtractionWarning[] = [];
    const items: CartItem[] = [];

    for (const container of containers) {
      const orderCode = normalizeText(container.getAttribute("data-monotaro-no"));
      const name = normalizeText(
        container.getAttribute("data-product-name")
          ?? container.querySelector(".BasketItemName__Link")?.textContent,
      );
      const quantityInput = container.querySelector<HTMLInputElement>(
        "input.TextInput--BasketAmount",
      );
      const quantity = parsePositiveInteger(
        quantityInput?.value ?? container.getAttribute("data-quantity"),
      );

      if (!/^\d{8}$/.test(orderCode)) {
        warnings.push(warning("order-code-not-found", "注文コードを取得できませんでした。", name));
      }
      if (!name) {
        warnings.push(warning("name-not-found", "商品名を取得できませんでした。", orderCode));
      }
      if (quantity === null) {
        warnings.push(warning("quantity-not-found", "数量を取得できませんでした。", orderCode || name));
      }
      if (!/^\d{8}$/.test(orderCode) || !name || quantity === null) continue;

      const makerText = normalizeText(
        container.querySelector(".BasketItemInformation > .u-FontSize--Default")?.textContent,
      );
      const maker = splitMaker(makerText);
      const unitPrice = parseMonotaroYen(container.getAttribute("data-sales-price"))
        ?? readAmountRow(container, "通常");
      const displayedSubtotal = readAmountRow(container, "小計");
      const productLink = container.querySelector<HTMLAnchorElement>(
        `.BasketItemImage a[href^="/p/"][data-js-monotaro-no="${orderCode}"], .BasketItemImage a[href^="/p/"]`,
      );
      const productUrl = absoluteUrl(productLink?.getAttribute("href") ?? null, "https://www.monotaro.com/")
        ?? `https://www.monotaro.com/p/${orderCode.slice(0, 4)}/${orderCode.slice(4)}/`;
      const imageUrl = absoluteUrl(
        container.querySelector<HTMLImageElement>("img.BasketItemImage__Img")?.getAttribute("src") ?? null,
        "https://www.monotaro.com/",
      );
      const leadTime = normalizeText(
        container.querySelector(".Label--ShippingSpeed")?.textContent,
      ) || null;
      const optionWarning = normalizeText(container.querySelector(".Alert--OrderOption")?.textContent);
      if (optionWarning) {
        warnings.push(warning("order-option-required", optionWarning, orderCode));
      }

      items.push({
        id: `${this.id}:${orderCode}`,
        storeId: this.id,
        storeName: this.name,
        orderCode,
        manufacturerName: maker.manufacturerName,
        manufacturerPartNumber: maker.manufacturerPartNumber,
        name,
        salesUnit: readSalesUnit(container),
        quantity,
        unitPrice,
        subtotal: displayedSubtotal ?? (unitPrice === null ? null : unitPrice * quantity),
        currency: "JPY",
        productUrl,
        imageUrl,
        stockStatus: null,
        leadTime,
        note: optionWarning,
        capturedAt: this.now().toISOString(),
      });
    }

    return { items, warnings, detectedCount: containers.length };
  }
}
