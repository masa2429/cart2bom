import type { CartItem, SavedList } from "../core/models";
import type { ExtractionWarning } from "../adapters/adapter";
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
  onSave(value: CartEditorValue): Promise<void>;
}

function defaultListName(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `秋月カート ${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
}

function input(targetDocument: Document, value: string, ariaLabel: string): HTMLInputElement {
  const element = targetDocument.createElement("input");
  element.value = value;
  element.setAttribute("aria-label", ariaLabel);
  return element;
}

export function openCartEditor(targetDocument: Document, options: CartEditorOptions): void {
  const modal = openModal(targetDocument, options.existingList ? "保存リストを編集" : "カート読み取り結果");
  modal.overlay.classList.add("cart2bom-overlay-wide");

  const form = targetDocument.createElement("div");
  form.className = "cart2bom-form";
  const name = input(targetDocument, options.existingList?.name ?? defaultListName(), "リスト名");
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
  for (const heading of ["選択", "画像", "通販コード", "商品名", "メーカー名", "メーカー型番", "販売単位", "数量", "単価", "小計", "備考", "商品ページ", "削除"]) {
    const th = targetDocument.createElement("th");
    th.textContent = heading;
    headerRow.append(th);
  }
  thead.append(headerRow);
  const tbody = targetDocument.createElement("tbody");
  const records: Array<{
    source: CartItem; selected: HTMLInputElement; name: HTMLInputElement; quantity: HTMLInputElement;
    manufacturer: HTMLInputElement; mpn: HTMLInputElement; salesUnit: HTMLInputElement;
    note: HTMLInputElement; row: HTMLTableRowElement;
  }> = [];
  let refreshTotal = (): void => undefined;

  for (const item of options.items) {
    const row = targetDocument.createElement("tr");
    const selected = input(targetDocument, "", `${item.orderCode}を選択`);
    selected.type = "checkbox";
    selected.checked = true;
    const image: Node = createProductImage(targetDocument, item) ?? targetDocument.createTextNode("—");
    const itemName = input(targetDocument, item.name, `${item.orderCode}の商品名`);
    const manufacturer = input(targetDocument, item.manufacturerName ?? "", `${item.orderCode}のメーカー名`);
    const mpn = input(targetDocument, item.manufacturerPartNumber ?? "", `${item.orderCode}のメーカー型番`);
    const salesUnit = input(targetDocument, item.salesUnit ?? "", `${item.orderCode}の販売単位`);
    const quantity = input(targetDocument, String(item.quantity), `${item.orderCode}の数量`);
    quantity.type = "number";
    quantity.min = "1";
    quantity.step = "1";
    const note = input(targetDocument, item.note, `${item.orderCode}の備考`);
    const link = targetDocument.createElement("a");
    link.href = item.productUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "開く";
    const remove = createButton(targetDocument, "削除", "danger");
    const values: Array<Node> = [
      selected, image, targetDocument.createTextNode(item.orderCode), itemName,
      manufacturer, mpn, salesUnit, quantity,
      targetDocument.createTextNode(item.unitPrice?.toLocaleString("ja-JP") ?? "—"),
      targetDocument.createTextNode(item.subtotal?.toLocaleString("ja-JP") ?? "—"),
      note, link, remove,
    ];
    for (const value of values) {
      const cell = targetDocument.createElement("td");
      cell.append(value);
      row.append(cell);
    }
    remove.addEventListener("click", () => { row.remove(); refreshTotal(); });
    records.push({ source: item, selected, name: itemName, quantity, manufacturer, mpn, salesUnit, note, row });
    tbody.append(row);
  }
  table.append(thead, tbody);
  tableWrap.append(table);

  const total = targetDocument.createElement("p");
  total.className = "cart2bom-list-total";
  refreshTotal = () => {
    const selectedItems = records.flatMap((record) => {
      if (!record.row.parentElement || !record.selected.checked) return [];
      const quantity = Number(record.quantity.value);
      if (!validateQuantity(quantity)) return [];
      return [{
        ...record.source,
        quantity,
        subtotal: record.source.unitPrice === null
          ? record.source.subtotal
          : record.source.unitPrice * quantity,
      }];
    });
    total.textContent = formatListTotal(calculateListTotal(selectedItems));
  };
  for (const record of records) {
    record.selected.addEventListener("change", refreshTotal);
    record.quantity.addEventListener("input", refreshTotal);
  }
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
