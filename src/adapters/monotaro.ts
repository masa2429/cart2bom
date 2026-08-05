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
  public readonly quickOrderCodeRequirement = "注文コードは8桁の数字である必要があります。";
  public readonly quickOrderCapacity = 10;

  public constructor(private readonly now: () => Date = () => new Date()) {}

  public matches(url: URL): boolean {
    return /^(?:www\.)?monotaro\.com$/i.test(url.hostname);
  }

  public isCartPage(url: URL, targetDocument: Document): boolean {
    if (!this.matches(url)) return false;
    if (/^\/basket\/?$/i.test(url.pathname)) return true;
    return /^\/monotaroMain\.py$/i.test(url.pathname)
      && (
        targetDocument.querySelector(ITEM_SELECTOR) !== null
        || normalizeText(targetDocument.title).startsWith("バスケットの内容")
      );
  }

  public getCartUrl(): string {
    return "https://www.monotaro.com/basket/";
  }

  public validateQuickOrderCode(code: string): boolean {
    return /^\d{8}$/.test(code);
  }

  public createQuickOrderText(items: CartItem[]): string {
    return items.map((item) => `${item.orderCode}\t${item.quantity}`).join("\n");
  }

  public getQuickOrderUrl(): string {
    return "https://www.monotaro.com/quick-order/";
  }

  public isQuickOrderPage(url: URL, _document: Document): boolean {
    return this.matches(url) && /^\/quick-order\/?$/i.test(url.pathname);
  }

  /** Posts one batch through MonotaRO's native quick-order endpoint. */
  public submitQuickOrder(targetDocument: Document, text: string): number {
    const rows = text.split(/\r?\n/).filter((line) => line.trim()).map((line) => line.split("\t"));
    if (rows.length > this.quickOrderCapacity) {
      throw new Error(`モノタロウのクイックオーダーへ入力できる商品は${this.quickOrderCapacity}件までです。`);
    }
    const sourceForm = targetDocument.querySelector<HTMLFormElement>(
      'form[action="/monotaroMain.py"]',
    );
    if (!sourceForm) {
      throw new Error("モノタロウのクイックオーダー入力欄を確認できませんでした。");
    }

    const form = targetDocument.createElement("form");
    form.method = "POST";
    form.action = sourceForm.action;
    form.hidden = true;
    const appendField = (name: string, value: string): void => {
      const input = targetDocument.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.append(input);
    };
    appendField("func", "monotaro.quickOrder.insertMultiServlet.InsertMultiServlet");
    for (let index = 0; index < this.quickOrderCapacity; index += 1) {
      const [code = "", quantity = ""] = rows[index] ?? [];
      appendField(`q${index}`, code);
      appendField(`p${index}`, quantity);
    }
    targetDocument.body.append(form);
    const formPrototype = targetDocument.defaultView?.HTMLFormElement.prototype;
    const nativeSubmit = formPrototype?.submit;
    if (!nativeSubmit) throw new Error("クイックオーダーフォームを送信できませんでした。");
    nativeSubmit.call(form);
    return rows.length;
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
