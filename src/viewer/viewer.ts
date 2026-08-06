import { getAdapters } from "../adapters/registry";
import type { SavedList } from "../core/models";
import { calculateListTotal, formatListTotal } from "../core/totals";
import { exportCsv } from "../exporters/csv";
import { copyText, downloadText, safeFileName } from "../exporters/download";
import { exportJson } from "../exporters/json";
import { exportMarkdown } from "../exporters/markdown";
import { exportPlainText } from "../exporters/plain-text";
import { exportQuickOrderBatches } from "../exporters/quick-order";
import { exportTsv } from "../exporters/tsv";
import { createProductImage } from "../ui/product-image";
import { createSharedQuickOrderUrl } from "../core/share-url";

const INSTALL_URL = "https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js";
const INSTALL_GUIDE_URL = "../install/";
const TAMPERMONKEY_URL = "https://www.tampermonkey.net/";
const GITHUB_URL = "https://github.com/masa2429/cart2bom";

function element<K extends keyof HTMLElementTagNameMap>(
  targetDocument: Document,
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const value = targetDocument.createElement(tag);
  if (className) value.className = className;
  if (text !== undefined) value.textContent = text;
  return value;
}

function button(targetDocument: Document, text: string, kind = "secondary"): HTMLButtonElement {
  const value = element(targetDocument, "button", `viewer-button viewer-button-${kind}`, text);
  value.type = "button";
  return value;
}

function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function yen(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("ja-JP")}円`;
}

function createAkizukiPrefilledUrl(quickOrderUrl: string, batches: string[]): string {
  const url = new URL(quickOrderUrl);
  url.searchParams.set("regist_goods", batches.join("\n").replace(/\t/g, " "));
  return url.href;
}

function createMonotaroCopyGuide(
  targetDocument: Document,
  batch: string,
  batchIndex: number,
  batchCount: number,
  status: HTMLElement,
): HTMLElement {
  const rows = batch.split(/\r?\n/).filter((line) => line.trim()).map((line) => line.split("\t"));
  const guide = element(targetDocument, "details", "viewer-copy-guide");
  if (batchIndex === 0) guide.open = true;
  const label = batchCount === 1
    ? `入力補助（${rows.length}商品）`
    : `${batchIndex + 1}回目の入力補助（${rows.length}商品）`;
  guide.append(element(targetDocument, "summary", undefined, label));
  const table = element(targetDocument, "table", "viewer-copy-table");
  const head = element(targetDocument, "thead");
  const headRow = element(targetDocument, "tr");
  for (const heading of ["行", "注文コード", "数量"]) {
    headRow.append(element(targetDocument, "th", undefined, heading));
  }
  head.append(headRow);
  const body = element(targetDocument, "tbody");
  rows.forEach(([code = "", quantity = ""], index) => {
    const row = element(targetDocument, "tr");
    row.append(element(targetDocument, "th", "viewer-copy-field-name", `q${index}/p${index}`));
    for (const [fieldName, value] of [[`q${index}`, code], [`p${index}`, quantity]] as Array<[string, string]>) {
      const cell = element(targetDocument, "td");
      const copy = button(targetDocument, value, "copy-value");
      copy.title = `${fieldName}へ貼り付ける値をコピー`;
      copy.setAttribute("aria-label", `${fieldName}用の${value}をコピー`);
      copy.addEventListener("click", () => {
        void copyText(targetDocument, value).then(() => {
          copy.classList.add("viewer-copy-done");
          status.textContent = `${fieldName}用の「${value}」をコピーしました。モノタロウの${fieldName}欄へ貼り付けてください。`;
        }).catch((caught: unknown) => {
          status.textContent = caught instanceof Error ? caught.message : "コピーできませんでした。";
        });
      });
      cell.append(copy);
      row.append(cell);
    }
    body.append(row);
  });
  table.append(head, body);
  guide.append(table);
  return guide;
}

function createBrandMark(targetDocument: Document): HTMLElement {
  const mark = element(targetDocument, "span", "viewer-brand-mark");
  mark.setAttribute("aria-hidden", "true");
  const svg = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("focusable", "false");
  const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M5 6h2l1.4 8.2h8.9l1.7-5.7H8.2M10 18.2h.1M17 18.2h.1M11 5v6m3-6v6");
  svg.append(path);
  mark.append(svg);
  return mark;
}

function createHeader(targetDocument: Document, activePage?: "install"): HTMLElement {
  const header = element(targetDocument, "header", "viewer-header");
  const brand = element(targetDocument, "a", "viewer-brand");
  brand.href = "../";
  brand.append(createBrandMark(targetDocument), element(targetDocument, "span", undefined, "Cart2BOM"));
  const nav = element(targetDocument, "nav", "viewer-nav");
  const install = element(targetDocument, "a", "viewer-nav-link", "インストール");
  install.href = INSTALL_GUIDE_URL;
  if (activePage === "install") {
    install.classList.add("viewer-nav-link-active");
    install.setAttribute("aria-current", "page");
  }
  const github = element(targetDocument, "a", "viewer-nav-link", "GitHub");
  github.href = GITHUB_URL;
  github.target = "_blank";
  github.rel = "noopener noreferrer";
  nav.append(install, github);
  header.append(brand, nav);
  return header;
}

function createProductCard(
  targetDocument: Document,
  list: SavedList,
  index: number,
  onSelectionChange: () => void,
): HTMLElement {
  const item = list.items[index]!;
  const card = element(targetDocument, "article", "viewer-item-card");
  card.dataset.storeId = item.storeId;
  const selection = element(targetDocument, "label", "viewer-item-selection");
  const checkbox = element(targetDocument, "input");
  checkbox.type = "checkbox";
  checkbox.checked = true;
  checkbox.dataset.itemIndex = String(index);
  checkbox.setAttribute("aria-label", `${item.name}を選択`);
  checkbox.addEventListener("change", onSelectionChange);
  selection.append(checkbox);
  const media = element(targetDocument, "div", "viewer-item-media");
  const image = createProductImage(targetDocument, item);
  const productUrl = safeHttpsUrl(item.productUrl);
  if (image && productUrl) {
    const imageLink = element(targetDocument, "a");
    imageLink.href = productUrl;
    imageLink.target = "_blank";
    imageLink.rel = "noopener noreferrer";
    imageLink.setAttribute("aria-label", `${item.name}の商品ページを開く`);
    imageLink.append(image);
    media.append(imageLink);
  } else if (image) {
    media.append(image);
  } else {
    media.textContent = "画像なし";
  }
  const content = element(targetDocument, "div", "viewer-item-content");
  const store = element(targetDocument, "span", "viewer-store-badge", item.storeName);
  const title = element(targetDocument, "h2", "viewer-item-title");
  if (productUrl) {
    const link = element(targetDocument, "a", undefined, item.name);
    link.href = productUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    title.append(link);
  } else {
    title.textContent = item.name;
  }
  const code = element(targetDocument, "p", "viewer-item-code", `通販コード・型番 ${item.orderCode}`);
  const details = element(targetDocument, "dl", "viewer-item-details");
  const entries: Array<[string, string]> = [
    ["メーカー", item.manufacturerName ?? "—"],
    ["メーカー型番", item.manufacturerPartNumber ?? "—"],
    ["販売単位", item.salesUnit ?? "—"],
    ["数量", String(item.quantity)],
    ["単価", yen(item.unitPrice)],
    ["小計", yen(item.subtotal ?? (item.unitPrice === null ? null : item.unitPrice * item.quantity))],
  ];
  for (const [term, description] of entries) {
    details.append(element(targetDocument, "dt", undefined, term), element(targetDocument, "dd", undefined, description));
  }
  content.append(store, title, code, details);
  if (item.note.trim()) content.append(element(targetDocument, "p", "viewer-item-note", `備考：${item.note}`));
  card.append(selection, media, content);
  return card;
}

function createStoreActions(
  targetDocument: Document,
  selectedList: SavedList,
  status: HTMLElement,
  shareUrl: string,
): HTMLElement {
  const container = element(targetDocument, "section", "viewer-store-actions");
  container.append(element(targetDocument, "h2", "viewer-section-title", "店舗で注文する"));
  let supportedStoreCount = 0;
  for (const adapter of getAdapters()) {
    const items = selectedList.items.filter((item) => item.storeId === adapter.id);
    if (items.length === 0 || !adapter.createQuickOrderText) continue;
    supportedStoreCount += 1;
    const panel = element(targetDocument, "article", "viewer-store-panel");
    const guidance = element(
      targetDocument,
      "p",
      "viewer-muted",
      "Cart2BOM未導入の場合は、入力データをコピーして公式画面へ貼り付けてください。",
    );
    panel.append(
      element(targetDocument, "h3", undefined, `${adapter.name}（${items.length}商品）`),
      guidance,
    );
    const actions = element(targetDocument, "div", "viewer-button-row");
    let hasCombinedAction = false;
    try {
      const batches = exportQuickOrderBatches(selectedList, adapter);
      const quickOrderUrl = adapter.getQuickOrderUrl?.();
      if (adapter.id === "monotaro") {
        hasCombinedAction = true;
        guidance.textContent =
          "一括入力欄がある場合は全商品を一度にコピーできます。通常のクイックオーダーでは、下の値をq0/p0から順に貼り付けてください。";
        const copyAll = button(targetDocument, "一括入力用データをコピー");
        copyAll.addEventListener("click", () => {
          const bulkText = batches.join("\n").replace(/\t/g, " ");
          void copyText(targetDocument, bulkText).then(() => {
            copyAll.classList.add("viewer-copy-done");
            status.textContent = "注文コードと数量を一括コピーしました。一括入力欄へ貼り付けてください。";
          }).catch((caught: unknown) => {
            status.textContent = caught instanceof Error ? caught.message : "コピーできませんでした。";
          });
        });
        actions.append(copyAll);
        if (quickOrderUrl) {
          const autoFill = element(
            targetDocument,
            "a",
            "viewer-button viewer-button-primary",
            "Cart2BOMで自動入力",
          );
          autoFill.href = createSharedQuickOrderUrl(shareUrl, quickOrderUrl, adapter.id);
          autoFill.target = "_blank";
          autoFill.rel = "noopener noreferrer";
          actions.append(autoFill);
          const open = element(targetDocument, "a", "viewer-button viewer-button-secondary", "公式入力画面を開く");
          open.href = quickOrderUrl;
          open.target = "_blank";
          open.rel = "noopener noreferrer";
          actions.append(open);
        }
        batches.forEach((batch, index) => {
          actions.append(createMonotaroCopyGuide(targetDocument, batch, index, batches.length, status));
        });
      }
      const supportsSharedAutoFill = Boolean(quickOrderUrl && (adapter.fillQuickOrder || adapter.submitQuickOrder));
      if (adapter.id === "akizuki" && supportsSharedAutoFill && quickOrderUrl) {
        hasCombinedAction = true;
        const proceed = element(
          targetDocument,
          "a",
          "viewer-button viewer-button-primary",
          "入力済みの一括注文画面を開く",
        );
        proceed.href = createSharedQuickOrderUrl(
          shareUrl,
          createAkizukiPrefilledUrl(quickOrderUrl, batches),
          adapter.id,
        );
        proceed.target = "_blank";
        proceed.rel = "noopener noreferrer";
        guidance.textContent =
          "ブランケットオーダーを入力済みの状態で開きます。Cart2BOM導入済みならバスケットへの追加まで自動で進めます。";
        actions.append(proceed);
      } else if (adapter.id === "misumi" && supportsSharedAutoFill && quickOrderUrl) {
        hasCombinedAction = true;
        const proceed = element(
          targetDocument,
          "a",
          "viewer-button viewer-button-primary",
          "入力データをコピーしてミスミを開く",
        );
        proceed.href = createSharedQuickOrderUrl(shareUrl, quickOrderUrl, adapter.id);
        proceed.target = "_blank";
        proceed.rel = "noopener noreferrer";
        proceed.addEventListener("click", () => {
          void copyText(targetDocument, batches.join("\n")).then(() => {
            status.textContent = "ミスミの入力データをコピーしました。「エクセルから一括コピー」欄へ貼り付けてください。";
          }).catch((caught: unknown) => {
            status.textContent = caught instanceof Error ? caught.message : "コピーできませんでした。";
          });
        });
        guidance.textContent =
          "型番・数量・メーカー名をコピーして公式画面を開きます。「エクセルから一括コピー」欄へ一度貼り付けてください。Cart2BOM導入済みならバスケットへの追加まで自動で進めます。";
        actions.append(proceed);
      } else if (adapter.id !== "monotaro") {
        batches.forEach((batch, index) => {
          const copy = button(
            targetDocument,
            batches.length === 1 ? "一括入力データをコピー" : `${index + 1}回目の入力データをコピー`,
          );
          copy.addEventListener("click", () => {
            void copyText(targetDocument, batch).then(() => {
              status.textContent = `${adapter.name}の入力データをコピーしました。`;
            }).catch((caught: unknown) => {
              status.textContent = caught instanceof Error ? caught.message : "コピーできませんでした。";
            });
          });
          actions.append(copy);
        });
      }
    } catch (caught) {
      panel.append(element(
        targetDocument,
        "p",
        "viewer-error",
        caught instanceof Error ? caught.message : "一括入力データを作成できませんでした。",
      ));
    }
    const quickOrderUrl = adapter.getQuickOrderUrl?.();
    if (quickOrderUrl && !hasCombinedAction) {
      const open = element(targetDocument, "a", "viewer-button viewer-button-primary", "公式の一括入力画面を開く");
      open.href = quickOrderUrl;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      actions.append(open);
    }
    panel.append(actions);
    container.append(panel);
  }
  if (supportedStoreCount === 0) {
    container.append(element(targetDocument, "p", "viewer-muted", "一括入力に対応する商品が選択されていません。"));
  }
  return container;
}

export function renderLandingPage(targetDocument: Document, root: HTMLElement): void {
  root.replaceChildren();
  const main = element(targetDocument, "main", "viewer-landing");
  const panel = element(targetDocument, "section", "viewer-empty-state viewer-landing-card");
  panel.append(
    createBrandMark(targetDocument),
    element(targetDocument, "h1", undefined, "Cart2BOM"),
    element(
      targetDocument,
      "p",
      "viewer-landing-lead",
      "通販サイトのカートを、保存・共有できる部品リストへ変換します。",
    ),
    element(targetDocument, "p", "viewer-landing-note", "共有URLを開くと、ここに部品リストが表示されます。"),
  );
  const actions = element(targetDocument, "div", "viewer-button-row viewer-button-row-center");
  const install = element(targetDocument, "a", "viewer-button viewer-button-primary", "インストール方法を見る");
  install.href = INSTALL_GUIDE_URL;
  const github = element(targetDocument, "a", "viewer-button viewer-button-secondary", "GitHubを見る");
  github.href = GITHUB_URL;
  github.target = "_blank";
  github.rel = "noopener noreferrer";
  actions.append(install, github);
  panel.append(actions);
  main.append(panel);
  root.append(createHeader(targetDocument), main);
}

export function renderInstallPage(targetDocument: Document, root: HTMLElement): void {
  root.replaceChildren();
  const main = element(targetDocument, "main", "viewer-install");
  const panel = element(targetDocument, "section", "viewer-install-card");
  panel.append(
    createBrandMark(targetDocument),
    element(targetDocument, "h1", undefined, "Cart2BOMをはじめる"),
    element(
      targetDocument,
      "p",
      "viewer-install-lead",
      "通販サイトのカートを、保存・共有できる部品リストへ。2つの手順でインストールできます。",
    ),
  );
  const badges = element(targetDocument, "div", "viewer-install-badges");
  for (const label of ["PC版Chrome", "Tampermonkey", "無料・オープンソース"]) {
    badges.append(element(targetDocument, "span", "viewer-install-badge", label));
  }
  panel.append(badges);

  const steps = element(targetDocument, "ol", "viewer-install-steps");
  const tampermonkeyStep = element(targetDocument, "li", "viewer-install-step");
  tampermonkeyStep.append(
    element(targetDocument, "h2", undefined, "Tampermonkeyを準備"),
    element(targetDocument, "p", "viewer-muted", "ユーザースクリプトを動かすためのChrome拡張機能です。導入済みなら手順2へ進んでください。"),
  );
  const tampermonkey = element(targetDocument, "a", "viewer-button viewer-button-secondary viewer-install-action", "Tampermonkey公式サイト ↗");
  tampermonkey.href = TAMPERMONKEY_URL;
  tampermonkey.target = "_blank";
  tampermonkey.rel = "noopener noreferrer";
  tampermonkeyStep.append(tampermonkey);

  const cart2bomStep = element(targetDocument, "li", "viewer-install-step");
  cart2bomStep.append(
    element(targetDocument, "h2", undefined, "Cart2BOMを追加"),
    element(targetDocument, "p", "viewer-muted", "Tampermonkeyの確認画面が開いたら、内容を確認して「インストール」を押します。"),
  );
  const install = element(targetDocument, "a", "viewer-button viewer-button-primary viewer-install-action", "Cart2BOMをインストール");
  install.href = INSTALL_URL;
  cart2bomStep.append(install);

  const readyStep = element(targetDocument, "li", "viewer-install-step viewer-install-step-ready");
  readyStep.append(
    element(targetDocument, "h2", undefined, "対応サイトで使う"),
    element(targetDocument, "p", "viewer-muted", "対象サイトを開くと、画面右下にCart2BOMボタンが表示されます。"),
  );
  const stores = element(targetDocument, "div", "viewer-install-stores");
  for (const store of ["秋月電子通商", "モノタロウ", "ミスミ"]) {
    stores.append(element(targetDocument, "span", "viewer-install-store", store));
  }
  readyStep.append(stores);
  steps.append(tampermonkeyStep, cart2bomStep, readyStep);
  panel.append(steps);

  const note = element(targetDocument, "aside", "viewer-install-note");
  note.append(
    element(targetDocument, "strong", undefined, "対応環境：PC版Chrome＋Tampermonkey"),
    element(targetDocument, "span", undefined, "スマートフォンには対応していません。"),
  );
  panel.append(note);
  main.append(panel);
  root.append(createHeader(targetDocument, "install"), main);
}

export function renderErrorPage(targetDocument: Document, root: HTMLElement, message: string): void {
  root.replaceChildren();
  const main = element(targetDocument, "main", "viewer-main");
  const panel = element(targetDocument, "section", "viewer-empty-state");
  panel.append(
    element(targetDocument, "p", "viewer-error-mark", "!"),
    element(targetDocument, "h1", undefined, "共有リストを表示できません"),
    element(targetDocument, "p", "viewer-error", message),
  );
  const actions = element(targetDocument, "div", "viewer-button-row viewer-button-row-center");
  const back = element(targetDocument, "a", "viewer-button viewer-button-primary", "共有画面へ戻る");
  back.href = "./";
  actions.append(back);
  panel.append(actions);
  main.append(panel);
  root.append(createHeader(targetDocument), main);
}

export function renderSharedListPage(
  targetDocument: Document,
  root: HTMLElement,
  list: SavedList,
  shareUrl: string,
): void {
  root.replaceChildren();
  const selected = new Set(list.items.map((_, index) => index));
  const main = element(targetDocument, "main", "viewer-main");
  const summaryPanel = element(targetDocument, "section", "viewer-summary");
  const eyebrow = element(targetDocument, "p", "viewer-eyebrow", "共有された部品リスト");
  const title = element(targetDocument, "h1", "viewer-list-title", list.name);
  const description = element(targetDocument, "p", "viewer-description", list.description || "説明はありません。");
  const tags = element(targetDocument, "div", "viewer-tags");
  for (const tag of list.tags) tags.append(element(targetDocument, "span", "viewer-tag", tag));
  const total = element(targetDocument, "p", "viewer-total");
  const status = element(targetDocument, "p", "viewer-status");
  status.setAttribute("role", "status");
  const copyShare = button(targetDocument, "共有URLをコピー");
  copyShare.addEventListener("click", () => {
    void copyText(targetDocument, shareUrl).then(() => { status.textContent = "共有URLをコピーしました。"; })
      .catch((caught: unknown) => { status.textContent = caught instanceof Error ? caught.message : "コピーできませんでした。"; });
  });
  summaryPanel.append(eyebrow, title, description);
  if (tags.childElementCount > 0) summaryPanel.append(tags);
  summaryPanel.append(total);

  const controls = element(targetDocument, "section", "viewer-controls");
  const filters = element(targetDocument, "div", "viewer-filters");
  filters.setAttribute("aria-label", "店舗で絞り込む");
  const storeNames = new Map<string, string>();
  for (const item of list.items) storeNames.set(item.storeId, item.storeName);
  const filterButtons = new Map<string, HTMLButtonElement>();
  const setFilter = (storeId: string): void => {
    for (const card of targetDocument.querySelectorAll<HTMLElement>(".viewer-item-card")) {
      card.hidden = storeId !== "all" && card.dataset.storeId !== storeId;
    }
    for (const [id, filterButton] of filterButtons) {
      filterButton.classList.toggle("viewer-filter-active", id === storeId);
      filterButton.setAttribute("aria-pressed", String(id === storeId));
    }
  };
  for (const [storeId, label] of [["all", "すべて"], ...storeNames] as Array<[string, string]>) {
    const filter = button(targetDocument, label, "filter");
    filter.setAttribute("aria-pressed", String(storeId === "all"));
    filter.addEventListener("click", () => setFilter(storeId));
    filterButtons.set(storeId, filter);
    filters.append(filter);
  }
  const selectionActions = element(targetDocument, "div", "viewer-selection-actions");
  const selectAll = button(targetDocument, "すべて選択");
  const clearAll = button(targetDocument, "すべて解除");
  selectionActions.append(selectAll, clearAll);
  controls.append(filters, selectionActions);

  const listSection = element(targetDocument, "section", "viewer-list-section");
  const itemsContainer = element(targetDocument, "div", "viewer-items");
  const outputSection = element(targetDocument, "section", "viewer-output-section");
  const storeActionsSlot = element(targetDocument, "div", "viewer-store-actions-slot");

  const selectedList = (): SavedList => ({
    ...list,
    items: list.items.filter((_, index) => selected.has(index)),
  });
  const refresh = (): void => {
    selected.clear();
    for (const checkbox of targetDocument.querySelectorAll<HTMLInputElement>('input[data-item-index]')) {
      if (checkbox.checked) selected.add(Number(checkbox.dataset.itemIndex));
    }
    const current = selectedList();
    total.textContent = `${current.items.length}/${list.items.length}商品を選択・${formatListTotal(calculateListTotal(current.items))}`;
    storeActionsSlot.replaceChildren(createStoreActions(targetDocument, current, status, shareUrl));
  };
  list.items.forEach((_, index) => itemsContainer.append(createProductCard(targetDocument, list, index, refresh)));
  selectAll.addEventListener("click", () => {
    for (const checkbox of targetDocument.querySelectorAll<HTMLInputElement>('input[data-item-index]')) checkbox.checked = true;
    refresh();
  });
  clearAll.addEventListener("click", () => {
    for (const checkbox of targetDocument.querySelectorAll<HTMLInputElement>('input[data-item-index]')) checkbox.checked = false;
    refresh();
  });
  listSection.append(itemsContainer);

  const outputTitle = element(targetDocument, "h2", "viewer-section-title", "共有・ファイル出力");
  const outputButtons = element(targetDocument, "div", "viewer-button-row");
  outputButtons.append(copyShare);
  const plain = button(targetDocument, "平文をコピー", "primary");
  plain.addEventListener("click", () => {
    void copyText(targetDocument, exportPlainText(selectedList())).then(() => { status.textContent = "平文をコピーしました。"; })
      .catch((caught: unknown) => { status.textContent = caught instanceof Error ? caught.message : "コピーできませんでした。"; });
  });
  outputButtons.append(plain);
  for (const [label, extension, mime, exporter] of [
    ["CSV保存", "csv", "text/csv", exportCsv],
    ["TSV保存", "tsv", "text/tab-separated-values", exportTsv],
    ["JSON保存", "json", "application/json", exportJson],
    ["Markdown保存", "md", "text/markdown", exportMarkdown],
  ] as const) {
    const save = button(targetDocument, label);
    save.addEventListener("click", () => {
      const current = selectedList();
      if (current.items.length === 0) {
        status.textContent = "出力する商品を1件以上選択してください。";
        return;
      }
      downloadText(targetDocument, exporter(current), `${safeFileName(list.name)}.${extension}`, mime);
      status.textContent = `${label}を開始しました。`;
    });
    outputButtons.append(save);
  }
  outputSection.append(outputTitle, outputButtons, status);

  const firstAdapter = getAdapters().find((adapter) => list.items.some((item) => item.storeId === adapter.id));
  const cartUrl = firstAdapter?.getCartUrl();
  if (cartUrl) {
    const importPanel = element(targetDocument, "section", "viewer-import-panel");
    const copy = element(
      targetDocument,
      "p",
      undefined,
      "Cart2BOMをインストール済みの場合は、リスト全体をブラウザへ取り込んでカートへの自動追加に利用できます。",
    );
    const importLink = element(targetDocument, "a", "viewer-button viewer-button-primary", "Cart2BOMへ取り込む");
    const destination = new URL(cartUrl);
    destination.hash = new URL(shareUrl).hash.slice(1);
    importLink.href = destination.href;
    importPanel.append(copy, importLink);
    outputSection.append(importPanel);
  }

  const contentLayout = element(targetDocument, "div", "viewer-content-layout");
  const primary = element(targetDocument, "div", "viewer-primary");
  const sidebar = element(targetDocument, "aside", "viewer-sidebar");
  primary.append(summaryPanel, controls, listSection);
  sidebar.append(storeActionsSlot, outputSection);
  contentLayout.append(primary, sidebar);
  main.append(contentLayout);
  root.append(createHeader(targetDocument), main);
  setFilter("all");
  refresh();
}
