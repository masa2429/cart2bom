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
  public readonly quickOrderName = "モノタロウクイックオーダー";
  public readonly quickOrderCodeRequirement = "注文コードは8桁の数字である必要があります。";
  public readonly quickOrderCapacity = 10;

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

  /** Staggers code input, waits for lookups in parallel, then fills quantities. */
  public async fillQuickOrder(targetDocument: Document, text: string): Promise<number> {
    const rows = text.split(/\r?\n/).filter((line) => line.trim()).map((line) => line.split("\t"));
    if (rows.length > this.quickOrderCapacity) {
      throw new Error(`モノタロウのクイックオーダーへ入力できる商品は${this.quickOrderCapacity}件までです。`);
    }
    const codeInputs = Array.from(targetDocument.querySelectorAll<HTMLInputElement>(
      'input[aria-label="注文コード"][name^="q"]',
    ));
    const quantityInputs = Array.from(targetDocument.querySelectorAll<HTMLInputElement>(
      'input[aria-label="数量"][name^="p"]',
    ));
    if (codeInputs.length < rows.length || quantityInputs.length < rows.length) {
      throw new Error("モノタロウのクイックオーダー入力欄を確認できませんでした。");
    }
    if (
      codeInputs.some((input) => input.value.trim())
      || quantityInputs.some((input) => input.value.trim())
    ) {
      throw new Error("入力済みの行があります。空のクイックオーダー画面で実行してください。");
    }

    const inputPrototype = targetDocument.defaultView?.HTMLInputElement.prototype;
    const valueSetter = inputPrototype
      ? Object.getOwnPropertyDescriptor(inputPrototype, "value")?.set
      : undefined;
    const InputEvent = targetDocument.defaultView?.Event ?? Event;
    const setValue = (input: HTMLInputElement, value: string): void => {
      if (valueSetter) valueSetter.call(input, value);
      else input.value = value;
      input.dispatchEvent(new InputEvent("input", { bubbles: true }));
      input.dispatchEvent(new InputEvent("change", { bubbles: true }));
    };

    const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => {
      const schedule = targetDocument.defaultView?.setTimeout.bind(targetDocument.defaultView) ?? setTimeout;
      schedule(resolve, milliseconds);
    });
    const waitForProduct = async (input: HTMLInputElement): Promise<void> => {
      const productCell = input.closest("tr")?.querySelector("td:last-child");
      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (normalizeText(productCell?.textContent)) return;
        await wait(100);
      }
    };

    for (let index = 0; index < rows.length; index += 1) {
      const [code = ""] = rows[index] ?? [];
      const codeInput = codeInputs[index];
      if (!codeInput) continue;
      codeInput.focus();
      setValue(codeInput, code);
      codeInput.blur();
      await wait(100);
    }

    await Promise.all(rows.map(async ([code = ""], index) => {
      const codeInput = codeInputs[index];
      if (!codeInput) return;
      await waitForProduct(codeInput);
      if (codeInput.value !== code) {
        throw new Error(`${code}の注文コードが画面から消去されました。ページを再読み込みして再試行してください。`);
      }
    }));

    for (let index = 0; index < rows.length; index += 1) {
      const [code = "", quantity = ""] = rows[index] ?? [];
      const quantityInput = quantityInputs[index];
      if (!quantityInput) continue;
      quantityInput.focus();
      setValue(quantityInput, quantity);
      quantityInput.blur();
      await wait(50);
      if (quantityInput.value !== quantity) {
        throw new Error(`${code}の数量を入力できませんでした。`);
      }
    }
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
