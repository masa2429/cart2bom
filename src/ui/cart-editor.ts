import type { CartItem, SavedList } from "../core/models";
import type { ExtractionWarning } from "../adapters/adapter";
import { safeHttpsUrl } from "../core/safe-url";
import { calculateListTotal, formatListTotal } from "../core/totals";
import { validateQuantity } from "../core/validation";
import { createButton, openModal } from "./modal";
import { createProductImage } from "./product-image";

export interface CartEditorValue {
  name: string;
  description: string;
  tags: string[];
  items: CartItem[];
}

export interface CartEditorOptions {
  items: CartItem[];
  warnings?: ExtractionWarning[];
  existingList?: SavedList;
  defaultListNamePrefix?: string;
  onSave(value: CartEditorValue): Promise<void>;
}

function defaultListName(prefix: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${prefix} ${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
}

function input(targetDocument: Document, value: string, ariaLabel: string): HTMLInputElement {
  const element = targetDocument.createElement("input");
  element.value = value;
  element.setAttribute("aria-label", ariaLabel);
  return element;
}

function textarea(targetDocument: Document, value: string, ariaLabel: string): HTMLTextAreaElement {
  const element = targetDocument.createElement("textarea");
  element.value = value;
  element.setAttribute("aria-label", ariaLabel);
  return element;
}

export function openCartEditor(targetDocument: Document, options: CartEditorOptions): void {
  const modal = openModal(targetDocument, options.existingList ? "保存リストを編集" : "カート読み取り結果");
  modal.overlay.classList.add("cart2bom-overlay-wide");

  const form = targetDocument.createElement("div");
  form.className = "cart2bom-form";
  const name = input(
    targetDocument,
    options.existingList?.name ?? defaultListName(options.defaultListNamePrefix ?? "カート"),
    "リスト名",
  );
  const description = input(targetDocument, options.existingList?.description ?? "", "説明");
  const tags = input(targetDocument, options.existingList?.tags.join(", ") ?? "", "タグ");
  for (const [labelText, element] of [["リスト名", name], ["説明", description], ["タグ（カンマ区切り）", tags]] as const) {
    const label = targetDocument.createElement("label");
    label.textContent = labelText;
    label.append(element);
    form.append(label);
  }

  const warningDetails = targetDocument.createElement("details");
  warningDetails.className = "cart2bom-warning-details";
  if ((options.warnings?.length ?? 0) > 0) {
    warningDetails.open = true;
    const summary = targetDocument.createElement("summary");
    summary.textContent = `読み取り警告（${options.warnings?.length ?? 0}件）`;
    const list = targetDocument.createElement("ul");
    for (const warning of options.warnings ?? []) {
      const item = targetDocument.createElement("li");
      item.textContent = warning.itemHint
        ? `${warning.itemHint}: ${warning.message}`
        : warning.message;
      list.append(item);
    }
    warningDetails.append(summary, list);
  }

  const tableWrap = targetDocument.createElement("div");
  tableWrap.className = "cart2bom-table-wrap";
  const table = targetDocument.createElement("table");
  const thead = targetDocument.createElement("thead");
  const headerRow = targetDocument.createElement("tr");
  const selectAll = input(targetDocument, "", "すべての商品を選択");
  selectAll.type = "checkbox";
  selectAll.checked = true;
  for (const [heading, className] of [
    ["選択", "select"],
    ["商品", "product"],
    ["数量", "quantity"],
    ["金額", "price"],
    ["備考", "note"],
    ["削除", "remove"],
  ] as const) {
    const th = targetDocument.createElement("th");
    th.textContent = heading;
    th.className = `cart2bom-col-${className}`;
    if (className === "select") th.append(targetDocument.createElement("br"), selectAll);
    headerRow.append(th);
  }
  thead.append(headerRow);
  const tbody = targetDocument.createElement("tbody");
  const records: Array<{
    source: CartItem; selected: HTMLInputElement; name: HTMLInputElement; quantity: HTMLInputElement;
    manufacturer: HTMLInputElement; mpn: HTMLInputElement; salesUnit: HTMLInputElement;
    note: HTMLTextAreaElement; subtotal: HTMLElement; row: HTMLTableRowElement;
  }> = [];
  let refreshTotal = (): void => undefined;
  let refreshSelectionState = (): void => undefined;

  for (const item of options.items) {
    const row = targetDocument.createElement("tr");
    const selected = input(targetDocument, "", `${item.orderCode}を選択`);
    selected.type = "checkbox";
    selected.checked = true;
    const itemName = input(targetDocument, item.name, `${item.orderCode}の商品名`);
    itemName.className = "cart2bom-item-name";
    const manufacturer = input(targetDocument, item.manufacturerName ?? "", `${item.orderCode}のメーカー名`);
    const mpn = input(targetDocument, item.manufacturerPartNumber ?? "", `${item.orderCode}のメーカー型番`);
    const salesUnit = input(targetDocument, item.salesUnit ?? "", `${item.orderCode}の販売単位`);
    const quantity = input(targetDocument, String(item.quantity), `${item.orderCode}の数量`);
    quantity.type = "number";
    quantity.min = "1";
    quantity.step = "1";
    const note = textarea(targetDocument, item.note, `${item.orderCode}の備考`);
    note.className = "cart2bom-item-note";
    // Falls back to plain text when the stored URL is not HTTPS, so an imported
    // or shared list cannot turn the product link into a javascript: URL.
    const productUrl = safeHttpsUrl(item.productUrl);
    const link = targetDocument.createElement(productUrl === null ? "span" : "a");
    if (productUrl !== null && link instanceof HTMLAnchorElement) {
      link.href = productUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.textContent = "商品ページ";
    const product = targetDocument.createElement("div");
    product.className = "cart2bom-editor-product";
    const image = createProductImage(targetDocument, item);
    const imageArea = targetDocument.createElement("div");
    imageArea.className = "cart2bom-editor-product-image";
    if (image && productUrl !== null) {
      const imageLink = targetDocument.createElement("a");
      imageLink.href = productUrl;
      imageLink.target = "_blank";
      imageLink.rel = "noopener noreferrer";
      imageLink.setAttribute("aria-label", `${item.name}の商品ページを開く`);
      imageLink.append(image);
      imageArea.append(imageLink);
    } else if (image) {
      imageArea.append(image);
    } else {
      imageArea.textContent = "—";
    }
    const productMain = targetDocument.createElement("div");
    productMain.className = "cart2bom-editor-product-main";
    const code = targetDocument.createElement("span");
    code.className = "cart2bom-item-code";
    code.textContent = `通販コード ${item.orderCode}`;
    const detail = targetDocument.createElement("details");
    detail.className = "cart2bom-item-details";
    const detailSummary = targetDocument.createElement("summary");
    const refreshDetailSummary = (): void => {
      detailSummary.textContent = `メーカー ${manufacturer.value.trim() || "—"} ／ 型番 ${mpn.value.trim() || "—"}`;
    };
    const manufacturerLabel = targetDocument.createElement("label");
    manufacturerLabel.textContent = "メーカー名";
    manufacturerLabel.append(manufacturer);
    const mpnLabel = targetDocument.createElement("label");
    mpnLabel.textContent = "メーカー型番";
    mpnLabel.append(mpn);
    manufacturer.addEventListener("input", refreshDetailSummary);
    mpn.addEventListener("input", refreshDetailSummary);
    refreshDetailSummary();
    detail.append(detailSummary, manufacturerLabel, mpnLabel);
    productMain.append(code, itemName, link, detail);
    product.append(imageArea, productMain);

    const quantityGroup = targetDocument.createElement("div");
    quantityGroup.className = "cart2bom-editor-quantity";
    const quantityLabel = targetDocument.createElement("label");
    quantityLabel.textContent = "数量";
    quantityLabel.append(quantity);
    const salesUnitLabel = targetDocument.createElement("label");
    salesUnitLabel.textContent = "販売単位";
    salesUnitLabel.append(salesUnit);
    quantityGroup.append(quantityLabel, salesUnitLabel);

    const price = targetDocument.createElement("div");
    price.className = "cart2bom-editor-price";
    const unitPrice = targetDocument.createElement("span");
    unitPrice.textContent = item.unitPrice === null
      ? "単価 —"
      : `単価 ${item.unitPrice.toLocaleString("ja-JP")}円`;
    const subtotal = targetDocument.createElement("strong");
    price.append(unitPrice, subtotal);
    const remove = createButton(targetDocument, "削除", "danger");
    const values: Array<{ value: Node; className: string }> = [
      { value: selected, className: "select" },
      { value: product, className: "product" },
      { value: quantityGroup, className: "quantity" },
      { value: price, className: "price" },
      { value: note, className: "note" },
      { value: remove, className: "remove" },
    ];
    for (const { value, className } of values) {
      const cell = targetDocument.createElement("td");
      cell.className = `cart2bom-col-${className}`;
      cell.append(value);
      row.append(cell);
    }
    remove.addEventListener("click", () => {
      row.remove();
      refreshSelectionState();
      refreshTotal();
    });
    records.push({ source: item, selected, name: itemName, quantity, manufacturer, mpn, salesUnit, note, subtotal, row });
    tbody.append(row);
  }
  table.append(thead, tbody);
  tableWrap.append(table);

  const total = targetDocument.createElement("p");
  total.className = "cart2bom-list-total";
  refreshTotal = () => {
    const selectedItems = records.flatMap((record) => {
      const quantity = Number(record.quantity.value);
      const calculatedSubtotal = validateQuantity(quantity)
        ? record.source.unitPrice === null
          ? record.source.subtotal
          : record.source.unitPrice * quantity
        : null;
      record.subtotal.textContent = calculatedSubtotal === null
        ? "小計 —"
        : `小計 ${calculatedSubtotal.toLocaleString("ja-JP")}円`;
      if (!record.row.parentElement || !record.selected.checked || !validateQuantity(quantity)) return [];
      return [{
        ...record.source,
        quantity,
        subtotal: calculatedSubtotal,
      }];
    });
    total.textContent = formatListTotal(calculateListTotal(selectedItems));
  };
  refreshSelectionState = () => {
    const active = records.filter((record) => record.row.parentElement);
    const selectedCount = active.filter((record) => record.selected.checked).length;
    selectAll.checked = active.length > 0 && selectedCount === active.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < active.length;
  };
  for (const record of records) {
    record.selected.addEventListener("change", () => {
      refreshSelectionState();
      refreshTotal();
    });
    record.quantity.addEventListener("input", refreshTotal);
  }
  selectAll.addEventListener("change", () => {
    for (const record of records) {
      if (record.row.parentElement) record.selected.checked = selectAll.checked;
    }
    refreshSelectionState();
    refreshTotal();
  });
  refreshSelectionState();
  refreshTotal();

  const error = targetDocument.createElement("p");
  error.className = "cart2bom-error";
  error.setAttribute("role", "alert");
  const actions = targetDocument.createElement("div");
  actions.className = "cart2bom-actions";
  const save = createButton(targetDocument, "リストを保存", "primary");
  const cancel = createButton(targetDocument, "キャンセル");
  cancel.addEventListener("click", modal.close);
  save.addEventListener("click", async () => {
    error.textContent = "";
    const listName = name.value.trim();
    if (!listName) {
      error.textContent = "リスト名を入力してください。";
      return;
    }
    const items: CartItem[] = [];
    for (const record of records) {
      if (!record.row.isConnected || !record.selected.checked) continue;
      const parsedQuantity = Number(record.quantity.value);
      if (!validateQuantity(parsedQuantity)) {
        error.textContent = `${record.source.orderCode}の数量は正の整数にしてください。`;
        return;
      }
      if (!record.name.value.trim()) {
        error.textContent = `${record.source.orderCode}の商品名を入力してください。`;
        return;
      }
      items.push({
        ...record.source,
        name: record.name.value.trim(),
        manufacturerName: record.manufacturer.value.trim() || null,
        quantity: parsedQuantity,
        manufacturerPartNumber: record.mpn.value.trim() || null,
        salesUnit: record.salesUnit.value.trim() || null,
        note: record.note.value,
        subtotal: record.source.unitPrice === null ? record.source.subtotal : record.source.unitPrice * parsedQuantity,
      });
    }
    if (items.length === 0) {
      error.textContent = "保存する商品を1件以上選択してください。";
      return;
    }
    save.disabled = true;
    try {
      await options.onSave({
        name: listName,
        description: description.value.trim(),
        tags: tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
        items,
      });
      modal.close();
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : "保存に失敗しました。";
    } finally {
      save.disabled = false;
    }
  });
  actions.append(save, cancel);
  modal.content.append(form);
  if (warningDetails.childElementCount > 0) modal.content.append(warningDetails);
  modal.content.append(tableWrap, total, error, actions);
}
