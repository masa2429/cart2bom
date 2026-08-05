import type { CartItem } from "../core/models";
import type {
  CartExtractionResult,
  ExtractionWarning,
  StoreAdapter,
} from "./adapter";

const PRODUCT_LINK_SELECTOR = 'a[href*="/catalog/g/g"]';
// Current Akizuki rows plus explicit fixture/adapter extension hooks.
const ITEM_CONTAINER_SELECTOR = "tr.block-cart--goods-list, [data-cart-item], .cart-item";
const ORDER_CODE_PATTERN = /\/catalog\/g\/g(\d{6})(?:\/|[?#]|$)/i;

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function extractAkizukiOrderCode(url: string): string | null {
  try {
    const parsed = new URL(url, "https://akizukidenshi.com/");
    return parsed.pathname.match(ORDER_CODE_PATTERN)?.[1] ?? null;
  } catch {
    return null;
  }
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseYen(value: string): number | null {
  const normalized = value.replace(/[￥¥,\s]/g, "").replace(/円(?:税込|税別)?$/u, "");
  const match = normalized.match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function findQuantity(container: Element): number | null {
  const controls = Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select"),
  ).filter((control) => !control.disabled && control.getAttribute("type") !== "hidden");

  const scored = controls
    .map((control) => {
      const metadata = normalizeText(
        [
          control.name,
          control.id,
          control.className,
          control.title,
          control.getAttribute("aria-label"),
          control.getAttribute("placeholder"),
        ].join(" "),
      );
      let score = 0;
      if (/qty|quantity|数量|個数|購入数/i.test(metadata)) score += 100;
      if (control.getAttribute("type") === "number") score += 10;
      const surroundingText = normalizeText(control.closest("td, div, label")?.textContent);
      if (/数量|個数|購入数/.test(surroundingText)) score += 30;
      return { quantity: parsePositiveInteger(control.value), score };
    })
    .filter((candidate) => candidate.quantity !== null && candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored[0]?.quantity ?? null;
}

function findItemContainer(link: HTMLAnchorElement, code: string): Element | null {
  let candidate = link.closest(ITEM_CONTAINER_SELECTOR);
  while (candidate) {
    const codes = new Set(
      Array.from(candidate.querySelectorAll<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR))
        .map((itemLink) => extractAkizukiOrderCode(itemLink.href))
        .filter((itemCode): itemCode is string => itemCode !== null),
    );
    if (codes.size === 1 && codes.has(code)) return candidate;
    candidate = candidate.parentElement?.closest(ITEM_CONTAINER_SELECTOR) ?? null;
  }
  return null;
}

function readMoney(container: Element, selector: string): number | null {
  const element = container.querySelector(selector);
  return element ? parseYen(element.textContent ?? "") : null;
}

function readSalesUnit(container: Element): string | null {
  const value = normalizeText(
    container.querySelector("[data-sales-unit], .block-goods-sales_unit")?.textContent,
  ).replace(/^[：:]\s*/u, "");
  return value || null;
}

function warning(code: string, message: string, itemHint?: string): ExtractionWarning {
  return itemHint ? { code, message, itemHint } : { code, message };
}

export class AkizukiAdapter implements StoreAdapter {
  public readonly id = "akizuki";
  public readonly name = "秋月電子通商";

  public constructor(private readonly now: () => Date = () => new Date()) {}

  public matches(url: URL): boolean {
    return /^(?:www\.)?akizukidenshi\.com$/i.test(url.hostname);
  }

  public isCartPage(url: URL, _document: Document): boolean {
    return (
      this.matches(url) &&
      url.pathname.toLowerCase() === "/catalog/cart/cart.aspx"
    );
  }

  public getCartUrl(): string {
    return "https://akizukidenshi.com/catalog/cart/cart.aspx";
  }

  /** Extracts one item per product container and reports incomplete rows. */
  public extractCart(targetDocument: Document): CartExtractionResult {
    // Scope product links to cart rows so recommendations below the cart are not warned about.
    const links = Array.from(targetDocument.querySelectorAll(ITEM_CONTAINER_SELECTOR))
      .flatMap((container) =>
        Array.from(container.querySelectorAll<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR)),
      );
    const containers = new Map<Element, { code: string; link: HTMLAnchorElement }>();
    const warnings: ExtractionWarning[] = [];

    for (const link of links) {
      const code = extractAkizukiOrderCode(link.href);
      if (!code) continue;
      const container = findItemContainer(link, code);
      if (!container) {
        warnings.push(warning("item-container-not-found", "商品行を特定できませんでした。", code));
        continue;
      }
      const existing = containers.get(container);
      if (!existing || normalizeText(link.textContent).length > normalizeText(existing.link.textContent).length) {
        containers.set(container, { code, link });
      }
    }

    const items: CartItem[] = [];
    for (const [container, entry] of containers) {
      const matchingLinks = Array.from(
        container.querySelectorAll<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR),
      ).filter((link) => extractAkizukiOrderCode(link.href) === entry.code);
      const nameLink = matchingLinks
        .filter((link) => normalizeText(link.textContent).length > 0)
        .sort((left, right) => normalizeText(right.textContent).length - normalizeText(left.textContent).length)[0];
      const name = normalizeText(nameLink?.textContent);
      const quantity = findQuantity(container);
      if (!name) {
        warnings.push(warning("name-not-found", "商品名を取得できませんでした。", entry.code));
      }
      if (quantity === null) {
        warnings.push(warning("quantity-not-found", "数量を取得できませんでした。", entry.code));
      }
      if (!name || quantity === null) continue;

      // Current Akizuki cart uses `.item-price`; keep site-specific variants isolated here.
      const unitPrice = readMoney(container, "[data-unit-price], .unit-price, .item-price");
      const displayedSubtotal = readMoney(container, "[data-subtotal], .subtotal");
      // Limit the image lookup to product links so compliance and quantity icons are not captured.
      const image = matchingLinks
        .map((link) => link.querySelector<HTMLImageElement>("img"))
        .find((candidate): candidate is HTMLImageElement => candidate !== null);
      const capturedAt = this.now().toISOString();
      items.push({
        id: `${this.id}:${entry.code}`,
        storeId: this.id,
        storeName: this.name,
        orderCode: entry.code,
        manufacturerName: normalizeText(
          nameLink?.getAttribute("data-brand") ?? container.getAttribute("data-manufacturer-name"),
        ) || null,
        manufacturerPartNumber: normalizeText(container.getAttribute("data-manufacturer-part-number")) || null,
        name,
        salesUnit: readSalesUnit(container),
        quantity,
        unitPrice,
        subtotal: displayedSubtotal ?? (unitPrice === null ? null : unitPrice * quantity),
        currency: "JPY",
        productUrl: nameLink?.href ?? entry.link.href,
        imageUrl: image?.src || null,
        stockStatus: normalizeText(container.querySelector("[data-stock-status], .stock-status")?.textContent) || null,
        leadTime: normalizeText(container.querySelector("[data-lead-time], .lead-time")?.textContent) || null,
        note: "",
        capturedAt,
      });
    }

    return { items, warnings, detectedCount: containers.size };
  }

  public createQuickOrderText(items: CartItem[]): string {
    return items.map((item) => `${item.orderCode}\t${item.quantity}`).join("\n");
  }

  public getQuickOrderUrl(): string {
    return "https://akizukidenshi.com/catalog/quickorder/blanketorder.aspx";
  }
}
