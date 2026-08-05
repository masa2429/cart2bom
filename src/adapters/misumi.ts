import type { CartItem } from "../core/models";
import type {
  CartExtractionResult,
  ExtractionWarning,
  StoreAdapter,
} from "./adapter";

const ITEM_CHECKBOX_SELECTOR = '[data-testid="detail-checkbox-input"]';
const ITEM_ROW_SELECTOR = '[class*="CartDetailTile_tileRow"]';

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function parsePositiveInteger(value: string | null | undefined): number | null {
  if (!/^\d+$/.test((value ?? "").trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseMisumiYen(value: string | null | undefined): number | null {
  const normalized = (value ?? "").replace(/[￥¥,円\s]/g, "");
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
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

function firstPrice(container: Element | null): number | null {
  return parseMisumiYen(container?.querySelector("p")?.textContent);
}

export function normalizeMisumiPartNumber(value: string): string {
  return value.replace(/在庫品$/u, "").trim();
}

function readPartNumber(link: HTMLAnchorElement | null, codeElement: Element | null): string {
  if (link) {
    try {
      const productCode = new URL(link.href).searchParams.get("ProductCode");
      if (productCode) return normalizeMisumiPartNumber(productCode);
    } catch {
      // Fall back to the visible code when the product URL is malformed.
    }
  }
  const directText = Array.from(codeElement?.childNodes ?? [])
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("");
  return normalizeMisumiPartNumber(directText || normalizeText(codeElement?.textContent));
}

export class MisumiAdapter implements StoreAdapter {
  public readonly id = "misumi";
  public readonly name = "ミスミ";
  public readonly listNamePrefix = "ミスミカート";
  public readonly quickOrderName = "ミスミ見積・注文";
  public readonly quickOrderCodeRequirement = "型番は256文字以内で、タブと改行を含めない必要があります。";

  public constructor(private readonly now: () => Date = () => new Date()) {}

  public matches(url: URL): boolean {
    return url.hostname.toLowerCase() === "jp.misumi-ec.com";
  }

  public isCartPage(url: URL, _document: Document): boolean {
    return this.matches(url) && /^\/order\/cart\/?$/i.test(url.pathname);
  }

  public getCartUrl(): string {
    return "https://jp.misumi-ec.com/order/cart";
  }

  public getQuickOrderUrl(): string {
    return "https://jp.misumi-ec.com/order/part-number/create";
  }

  public isQuickOrderPage(url: URL, _document: Document): boolean {
    return this.matches(url) && /^\/order\/part-number\/create\/?$/i.test(url.pathname);
  }

  public validateQuickOrderCode(code: string): boolean {
    const normalized = normalizeMisumiPartNumber(code);
    return normalized.length > 0 && normalized.length <= 256 && !/[\t\r\n]/.test(normalized);
  }

  public createQuickOrderText(items: CartItem[]): string {
    return items
      .map((item) => `${normalizeMisumiPartNumber(item.orderCode)}\t${item.quantity}\t${item.manufacturerName ?? ""}`)
      .join("\n");
  }

  /** Selects cart lines so MISUMI loads current prices and shipping dates. */
  public async prepareCart(targetDocument: Document): Promise<void> {
    const rows = targetDocument.querySelectorAll(ITEM_CHECKBOX_SELECTOR);
    if (rows.length === 0) return;
    const pricesLoaded = (): boolean => Array.from(targetDocument.querySelectorAll(ITEM_ROW_SELECTOR))
      .every((row) => firstPrice(row.querySelector('[class*="CartDetailTile_unitPriceCell"]')) !== null);
    if (pricesLoaded()) return;
    const allCheckbox = targetDocument.querySelector<HTMLInputElement>('[data-testid="header-checkbox-all"]');
    if (!allCheckbox?.checked) {
      targetDocument.querySelector<HTMLButtonElement>('[data-testid="all-check-box"]')?.click();
    }
    await this.waitFor(targetDocument, pricesLoaded, 8_000);
  }

  /** Uses MISUMI's Excel-copy workflow and stops after adding items to the cart. */
  public async submitQuickOrder(targetDocument: Document, text: string): Promise<number> {
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => {
        const [code = "", ...columns] = line.split("\t");
        return [normalizeMisumiPartNumber(code), ...columns].join("\t");
      });
    const textarea = targetDocument.querySelector<HTMLTextAreaElement>(
      'textarea[data-testid="excel-copy-input"]',
    );
    if (!textarea) throw new Error("ミスミの一括入力欄を確認できませんでした。");

    const valueSetter = targetDocument.defaultView
      ? Object.getOwnPropertyDescriptor(targetDocument.defaultView.HTMLTextAreaElement.prototype, "value")?.set
      : undefined;
    if (valueSetter) valueSetter.call(textarea, rows.join("\n"));
    else textarea.value = rows.join("\n");
    const EventConstructor = targetDocument.defaultView?.Event ?? Event;
    textarea.dispatchEvent(new EventConstructor("input", { bubbles: true }));
    textarea.dispatchEvent(new EventConstructor("change", { bubbles: true }));

    const next = await this.waitForElement<HTMLButtonElement>(
      targetDocument,
      'button[data-testid="next-button"]:not([disabled])',
    );
    next.click();
    const mappingNext = await this.waitForElement<HTMLButtonElement>(
      targetDocument,
      'button[data-testid="mapping-item-modal-next-button"]',
    );
    mappingNext.click();
    const progressNext = await this.waitForElement<HTMLButtonElement>(
      targetDocument,
      'button[data-testid="progress-modal-next-input"]',
      15_000,
    );
    progressNext.click();
    const addToCart = await this.waitForElement<HTMLButtonElement>(
      targetDocument,
      'button[data-testid="add-to-cart-button"]:not([disabled])',
      20_000,
    );
    addToCart.click();
    await this.waitForElement(targetDocument, 'a[href="/order/cart"]', 20_000);
    targetDocument.location.assign(this.getCartUrl());
    return rows.length;
  }

  public extractCart(targetDocument: Document): CartExtractionResult {
    const rows = Array.from(targetDocument.querySelectorAll<HTMLInputElement>(ITEM_CHECKBOX_SELECTOR))
      .map((checkbox) => checkbox.closest(ITEM_ROW_SELECTOR))
      .filter((row): row is Element => row !== null);
    const items: CartItem[] = [];
    const warnings: ExtractionWarning[] = [];

    for (const row of rows) {
      const productLink = row.querySelector<HTMLAnchorElement>('a[href*="/vona2/detail/"]');
      const orderCode = readPartNumber(
        productLink,
        row.querySelector('[class*="CartDetailTile_productCode"]'),
      );
      const name = normalizeText(productLink?.textContent);
      const quantityCell = row.querySelector('[class*="CartDetailTile_quantityCell"]');
      const quantity = parsePositiveInteger(quantityCell?.querySelector<HTMLInputElement>("input")?.value);
      if (!orderCode) warnings.push(warning("part-number-not-found", "ミスミ型番を取得できませんでした。", name));
      if (!name) warnings.push(warning("name-not-found", "商品名を取得できませんでした。", orderCode));
      if (quantity === null) warnings.push(warning("quantity-not-found", "数量を取得できませんでした。", orderCode || name));
      if (!orderCode || !name || quantity === null) continue;

      const productInfo = row.querySelector('[class*="CartDetailTile_productCode"]')?.parentElement;
      const manufacturerName = normalizeText(productInfo?.lastElementChild?.textContent) || null;
      const unitPrice = firstPrice(row.querySelector('[class*="CartDetailTile_unitPriceCell"]'));
      const subtotal = firstPrice(row.querySelector('[class*="CartDetailTile_totalPriceCell"]'));
      const salesUnit = normalizeText(quantityCell?.textContent).replace(/^\(|\)$/g, "") || null;
      const leadTime = normalizeText(row.querySelector('[class*="CartDetailTile_deliveryDateCell"]')?.textContent) || null;
      const note = Array.from(row.querySelectorAll('[data-severity]'))
        .map((element) => normalizeText(element.textContent))
        .filter(Boolean)
        .join("\n");
      if (unitPrice === null) {
        warnings.push(warning("price-not-loaded", "単価を取得できませんでした。商品を選択して再読み取りしてください。", orderCode));
      }

      items.push({
        id: `${this.id}:${orderCode}`,
        storeId: this.id,
        storeName: this.name,
        orderCode,
        manufacturerName,
        manufacturerPartNumber: orderCode,
        name,
        salesUnit,
        quantity,
        unitPrice,
        subtotal: subtotal ?? (unitPrice === null ? null : unitPrice * quantity),
        currency: "JPY",
        productUrl: productLink?.href ?? this.getCartUrl(),
        imageUrl: absoluteUrl(row.querySelector<HTMLImageElement>("img")?.getAttribute("src") ?? null, "https://jp.misumi-ec.com/"),
        stockStatus: null,
        leadTime,
        note,
        capturedAt: this.now().toISOString(),
      });
    }

    return { items, warnings, detectedCount: rows.length };
  }

  private async waitForElement<T extends Element>(
    targetDocument: Document,
    selector: string,
    timeoutMs = 8_000,
  ): Promise<T> {
    let found: T | null = null;
    await this.waitFor(targetDocument, () => {
      found = targetDocument.querySelector<T>(selector);
      return found !== null;
    }, timeoutMs);
    if (!found) throw new Error("ミスミの画面操作が時間内に完了しませんでした。");
    return found;
  }

  private async waitFor(
    targetDocument: Document,
    predicate: () => boolean,
    timeoutMs: number,
  ): Promise<void> {
    const startedAt = Date.now();
    while (!predicate()) {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("ミスミの商品情報を時間内に確認できませんでした。");
      }
      await new Promise<void>((resolve) => {
        const schedule = targetDocument.defaultView?.setTimeout.bind(targetDocument.defaultView) ?? setTimeout;
        schedule(resolve, 100);
      });
    }
  }
}
