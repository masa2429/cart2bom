import { findAdapter } from "./adapters/registry";
import { DuplicateListNameError, StorageDataError } from "./core/errors";
import { ListService } from "./core/list-service";
import { DEFAULT_SETTINGS, type AppSettings, type SavedList } from "./core/models";
import {
  CART2BOM_SHARE_VIEWER_URL,
  createSharedListUrl,
  hasSharedListFragment,
  readSharedListUrl,
} from "./core/share-url";
import {
  readPendingQuickOrder,
  removePendingQuickOrder,
  savePendingQuickOrder,
} from "./core/pending-quick-order";
import { SettingsService } from "./core/settings-service";
import { exportCsv } from "./exporters/csv";
import { copyText, downloadText, safeFileName } from "./exporters/download";
import { exportJson } from "./exporters/json";
import { exportMarkdown } from "./exporters/markdown";
import { exportPlainText } from "./exporters/plain-text";
import { exportQuickOrder, exportQuickOrderBatches } from "./exporters/quick-order";
import { exportTsv } from "./exporters/tsv";
import { GMStorageProvider } from "./storage/gm-storage";
import { openCartEditor, type CartEditorValue } from "./ui/cart-editor";
import { mountFloatingButton } from "./ui/floating-button";
import { openImportDialog } from "./ui/import-dialog";
import { openMainMenu } from "./ui/main-menu";
import { createButton, openModal, showMessage } from "./ui/modal";
import { filterSavedListsByStore, openSavedLists } from "./ui/saved-lists";
import { openSettings } from "./ui/settings";
import { openSharedListDialog } from "./ui/shared-list-dialog";
import { showToast } from "./ui/toast";

/** Starts Cart2BOM only on a supported store domain. */
export function startCart2BOM(): void {
  if (__CART2BOM_DEVELOPMENT__) {
    console.debug(`[Cart2BOM] version ${__CART2BOM_VERSION__}`);
  }

  const adapter = findAdapter(new URL(window.location.href));
  if (!adapter) return;
  const storage = new GMStorageProvider();
  const listService = new ListService(storage);
  const settingsService = new SettingsService(storage);
  let settings: AppSettings = { ...DEFAULT_SETTINGS };

  const saveNewList = async (value: CartEditorValue): Promise<void> => {
    try {
      await listService.create(value);
    } catch (error) {
      if (!(error instanceof DuplicateListNameError)) throw error;
      if (!window.confirm(`${error.message}\n上書きしますか？`)) throw new Error("保存をキャンセルしました。");
      await listService.create(value, true);
    }
    showToast(document, "リストを保存しました。");
  };

  const importList = async (list: SavedList): Promise<void> => {
    try {
      await listService.importList(list);
    } catch (error) {
      if (!(error instanceof DuplicateListNameError)) throw error;
      if (!window.confirm(`${error.message}\n上書きしますか？`)) throw new Error("インポートをキャンセルしました。");
      await listService.importList(list, true);
    }
    showToast(document, "リストをインポートしました。");
  };

  const openExisting = (list: SavedList): void => {
    openCartEditor(document, {
      items: list.items,
      existingList: list,
      defaultListNamePrefix: adapter.listNamePrefix,
      onSave: async (value) => {
        const updated: SavedList = { ...list, ...value };
        try {
          await listService.update(updated);
        } catch (error) {
          if (!(error instanceof DuplicateListNameError)) throw error;
          if (!window.confirm(`${error.message}\n上書きしますか？`)) throw new Error("保存をキャンセルしました。");
          await listService.update(updated, true);
        }
        showToast(document, "リストを保存しました。");
      },
    });
  };

  const showLists = async (): Promise<void> => {
    try {
      const lists = filterSavedListsByStore(await listService.getAll(), adapter.id);
      openSavedLists(document, lists, {
        confirmBeforeDelete: settings.confirmBeforeDelete,
        quickOrderAvailable: typeof adapter.createQuickOrderText === "function",
        quickOrderAutoFill: typeof adapter.fillQuickOrder === "function",
        quickOrderAutoSubmit: typeof adapter.submitQuickOrder === "function",
        onOpen: openExisting,
        onDuplicate: async (list) => {
          await listService.duplicate(list.id);
          showToast(document, "リストを複製しました。");
          void showLists();
        },
        onRename: async (list, name) => {
          await listService.update({ ...list, name });
          showToast(document, "リスト名を変更しました。");
        },
        onDelete: async (list) => {
          await listService.remove(list.id);
          showToast(document, "リストを削除しました。");
        },
        onExport: (list, format) => {
          const exporters = {
            csv: { text: exportCsv(list), extension: "csv", mime: "text/csv" },
            tsv: { text: exportTsv(list), extension: "tsv", mime: "text/tab-separated-values" },
            json: { text: exportJson(list), extension: "json", mime: "application/json" },
            markdown: { text: exportMarkdown(list), extension: "md", mime: "text/markdown" },
          } as const;
          const output = exporters[format];
          downloadText(document, output.text, `${safeFileName(list.name)}.${output.extension}`, output.mime);
          showToast(document, `${output.extension.toUpperCase()}ファイルを保存しました。`);
        },
        onCopyPlainText: async (list) => {
          await copyText(document, exportPlainText(list));
          showToast(document, "平文をクリップボードへコピーしました。");
        },
        onCopyShareUrl: async (list) => {
          const url = await createSharedListUrl(list, CART2BOM_SHARE_VIEWER_URL);
          await copyText(document, url);
          showToast(document, `共有URLをコピーしました（${url.length.toLocaleString("ja-JP")}文字）。`);
        },
        onCopyQuickOrder: async (list) => {
          await copyText(document, exportQuickOrder(list, adapter));
          showToast(document, "クリップボードへコピーしました。");
        },
        onOpenQuickOrder: async (list) => {
          const batches = exportQuickOrderBatches(list, adapter);
          const text = batches.join("\n");
          if (!text) throw new Error("クイックオーダーへ入力する商品がありません。");
          await copyText(document, text);
          const quickOrderUrl = adapter.getQuickOrderUrl?.();
          if (!quickOrderUrl) throw new Error("一括注文ページが設定されていません。");
          if (adapter.fillQuickOrder || adapter.submitQuickOrder) {
            await savePendingQuickOrder(storage, {
              storeId: adapter.id,
              text,
              createdAt: new Date().toISOString(),
              phase: "ready",
            });
          }
          window.open(quickOrderUrl, "_blank", "noopener");
          showToast(
            document,
            adapter.submitQuickOrder
              ? `${batches.length}回に分けてバスケットへ自動追加します。`
              : adapter.fillQuickOrder
              ? "クイックオーダー画面を開き、入力内容を準備しました。"
              : "一括注文テキストをコピーしました。",
          );
        },
      });
    } catch (error) {
      if (error instanceof StorageDataError) {
        const modal = openModal(document, "保存データエラー");
        const message = document.createElement("p");
        message.textContent = `${error.message} データは削除されていません。`;
        const backup = createButton(document, "破損データをJSON保存", "primary");
        backup.addEventListener("click", () => {
          downloadText(
            document,
            `${JSON.stringify(error.rawValue, null, 2)}\n`,
            `cart2bom-broken-data-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
            "application/json",
          );
        });
        modal.content.append(message, backup);
      } else {
        showMessage(document, "保存データエラー", error instanceof Error ? error.message : "保存済みリストを読み込めませんでした。");
      }
    }
  };

  const openMenu = (): void => {
    openMainMenu(document, {
      storeName: adapter.name,
      onReadCart: async () => {
        const currentUrl = new URL(window.location.href);
        if (!adapter.isCartPage(currentUrl, document)) {
          showMessage(document, "カートページではありません", "買い物カゴのページを開いてから実行してください。");
          return;
        }
        try {
          await adapter.prepareCart?.(document);
        } catch (error) {
          showMessage(
            document,
            "商品情報を準備できませんでした",
            error instanceof Error ? error.message : "価格と出荷日の取得に失敗しました。",
          );
          return;
        }
        const result = adapter.extractCart(document);
        if (__CART2BOM_DEVELOPMENT__) {
          console.debug("[Cart2BOM] extraction", {
            adapter: adapter.id,
            detectedCount: result.detectedCount,
            extractedCount: result.items.length,
            warningCount: result.warnings.length,
          });
        }
        if (result.items.length === 0) {
          showMessage(
            document,
            "カートを読み取れませんでした",
            result.detectedCount === 0
              ? "カート内に商品がありません。"
              : "商品情報を取得できませんでした。通販サイトの画面構成が変更された可能性があります。",
          );
          return;
        }
        if (result.warnings.length > 0) {
          showToast(document, `${result.items.length}商品を取得しました。警告の詳細を確認画面に表示しました。`);
        }
        openCartEditor(document, {
          items: result.items,
          warnings: result.warnings,
          defaultListNamePrefix: adapter.listNamePrefix,
          onSave: saveNewList,
        });
      },
      onSavedLists: () => void showLists(),
      onImport: () => openImportDialog(document, importList),
      onSettings: () => openSettings(document, settings, async (next) => {
        await settingsService.save(next);
        settings = next;
        const button = document.getElementById("cart2bom-floating-button");
        if (button instanceof HTMLButtonElement) button.dataset.side = next.buttonSide;
        showToast(document, "設定を保存しました。");
      }),
    });
  };

  const button = mountFloatingButton(document, openMenu, settings.buttonSide);
  void settingsService.get().then((loaded) => {
    settings = loaded;
    button.dataset.side = loaded.buttonSide;
  }).catch((error: unknown) => {
    console.error("[Cart2BOM] settings", error);
  });

  const currentUrl = new URL(window.location.href);
  if (hasSharedListFragment(currentUrl)) {
    void readSharedListUrl(currentUrl).then((list) => {
      if (!list) return;
      openSharedListDialog(document, list, async (sharedList) => {
        await importList(sharedList);
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
      });
    }).catch((error: unknown) => {
      showMessage(
        document,
        "共有リストを読み込めませんでした",
        error instanceof Error ? error.message : "共有URLが不正です。",
      );
    });
  }
  if (adapter.submitQuickOrder) {
    void readPendingQuickOrder(storage, adapter.id).then(async (pending) => {
      if (!pending) return;
      const lines = pending.text.split(/\r?\n/).filter((line) => line.trim());
      if (adapter.isCartPage(currentUrl, document) && pending.phase === "submitted") {
        const remaining = lines.slice(pending.submittedLineCount ?? 0);
        if (remaining.length === 0) {
          await removePendingQuickOrder(storage);
          showToast(document, "保存リストの商品をバスケットへ追加しました。内容を確認してください。");
          return;
        }
        await savePendingQuickOrder(storage, {
          storeId: pending.storeId,
          text: remaining.join("\n"),
          createdAt: new Date().toISOString(),
          phase: "ready",
        });
        const quickOrderUrl = adapter.getQuickOrderUrl?.();
        if (quickOrderUrl) window.location.replace(quickOrderUrl);
        return;
      }
      const isQuickOrderPage = adapter.isQuickOrderPage?.(currentUrl, document) ?? false;
      if (pending.phase === "submitted" && !isQuickOrderPage) {
        const { submittedLineCount: _submittedLineCount, ...retry } = pending;
        await savePendingQuickOrder(storage, { ...retry, phase: "ready" });
        showMessage(
          document,
          "バスケットへの自動追加を中断しました",
          `${adapter.name}がバスケット画面へ移動しませんでした。画面のエラー内容を確認してください。`,
        );
        return;
      }
      if (!isQuickOrderPage || pending.phase === "submitted") return;
      const batch = lines.slice(0, adapter.quickOrderCapacity ?? lines.length);
      try {
        await savePendingQuickOrder(storage, {
          ...pending,
          phase: "submitted",
          submittedLineCount: batch.length,
        });
        await adapter.submitQuickOrder?.(document, batch.join("\n"));
      } catch (error) {
        const { submittedLineCount: _submittedLineCount, ...retry } = pending;
        await savePendingQuickOrder(storage, { ...retry, phase: "ready" });
        showMessage(
          document,
          "バスケットへ自動追加できませんでした",
          error instanceof Error ? error.message : "クイックオーダーを送信できませんでした。",
        );
      }
    }).catch((error: unknown) => {
      console.error("[Cart2BOM] quick order", error);
    });
  } else if (adapter.fillQuickOrder && adapter.isQuickOrderPage?.(currentUrl, document)) {
    void readPendingQuickOrder(storage, adapter.id).then(async (pending) => {
      if (!pending) return;
      try {
        const count = await adapter.fillQuickOrder?.(document, pending.text) ?? 0;
        await removePendingQuickOrder(storage);
        showToast(document, `${count}商品をクイックオーダーへ入力しました。内容を確認してください。`);
      } catch (error) {
        showMessage(
          document,
          "クイックオーダーへ入力できませんでした",
          error instanceof Error ? error.message : "入力欄を確認できませんでした。",
        );
      }
    }).catch((error: unknown) => {
      console.error("[Cart2BOM] quick order", error);
    });
  }
}
