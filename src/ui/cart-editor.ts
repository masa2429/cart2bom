import type { CartItem, SavedList } from "../core/models";
import { validateQuantity } from "../core/validation";
import { createButton, openModal } from "./modal";

export interface CartEditorValue {
  name: string;
  description: string;
  tags: string[];
  items: CartItem[];
}

export interface CartEditorOptions {
  items: CartItem[];
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

  const tableWrap = targetDocument.createElement("div");
  tableWrap.className = "cart2bom-table-wrap";
  const table = targetDocument.createElement("table");
  const thead = targetDocument.createElement("thead");
  const headerRow = targetDocument.createElement("tr");
  for (const heading of ["選択", "通販コード", "商品名", "数量", "単価", "小計", "メーカー型番", "備考", "商品ページ", "削除"]) {
    const th = targetDocument.createElement("th");
    th.textContent = heading;
    headerRow.append(th);
  }
  thead.append(headerRow);
  const tbody = targetDocument.createElement("tbody");
  const records: Array<{
    source: CartItem; selected: HTMLInputElement; name: HTMLInputElement; quantity: HTMLInputElement;
    mpn: HTMLInputElement; note: HTMLInputElement; row: HTMLTableRowElement;
  }> = [];

  for (const item of options.items) {
    const row = targetDocument.createElement("tr");
    const selected = input(targetDocument, "", `${item.orderCode}を選択`);
    selected.type = "checkbox";
    selected.checked = true;
    const itemName = input(targetDocument, item.name, `${item.orderCode}の商品名`);
    const quantity = input(targetDocument, String(item.quantity), `${item.orderCode}の数量`);
    quantity.type = "number";
    quantity.min = "1";
    quantity.step = "1";
    const mpn = input(targetDocument, item.manufacturerPartNumber ?? "", `${item.orderCode}のメーカー型番`);
    const note = input(targetDocument, item.note, `${item.orderCode}の備考`);
    const link = targetDocument.createElement("a");
    link.href = item.productUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "開く";
    const remove = createButton(targetDocument, "削除", "danger");
    const values: Array<Node> = [
      selected, targetDocument.createTextNode(item.orderCode), itemName, quantity,
      targetDocument.createTextNode(item.unitPrice?.toLocaleString("ja-JP") ?? "—"),
      targetDocument.createTextNode(item.subtotal?.toLocaleString("ja-JP") ?? "—"),
      mpn, note, link, remove,
    ];
    for (const value of values) {
      const cell = targetDocument.createElement("td");
      cell.append(value);
      row.append(cell);
    }
    remove.addEventListener("click", () => row.remove());
    records.push({ source: item, selected, name: itemName, quantity, mpn, note, row });
    tbody.append(row);
  }
  table.append(thead, tbody);
  tableWrap.append(table);

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
        quantity: parsedQuantity,
        manufacturerPartNumber: record.mpn.value.trim() || null,
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
  modal.content.append(form, tableWrap, error, actions);
}
