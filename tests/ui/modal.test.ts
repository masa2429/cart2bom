import { beforeEach, describe, expect, it } from "vitest";
import { createButton, openConfirm, openModal, openPrompt } from "../../src/ui/modal";

function pressKey(key: string, shiftKey = false): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }));
}

function buttonByText(root: ParentNode, label: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll("button")).find((candidate) => candidate.textContent === label);
  if (!button) throw new Error(`ボタン「${label}」が見つかりません。`);
  return button;
}

describe("openModal", () => {
  beforeEach(() => {
    document.body.replaceChildren();
    document.body.style.overflow = "";
    delete document.body.dataset.cart2bomOverflow;
  });

  it("Escapeは最前面のモーダルだけを閉じる", () => {
    const first = openModal(document, "編集画面");
    const second = openModal(document, "エラー");

    pressKey("Escape");
    expect(second.overlay.isConnected).toBe(false);
    // The editor underneath must survive, or the user loses their edits.
    expect(first.overlay.isConnected).toBe(true);

    pressKey("Escape");
    expect(first.overlay.isConnected).toBe(false);
  });

  it("開いている間は背後のスクロールを止め、閉じたら元へ戻す", () => {
    document.body.style.overflow = "scroll";
    const first = openModal(document, "1つ目");
    expect(document.body.style.overflow).toBe("hidden");

    const second = openModal(document, "2つ目");
    second.close();
    // Still open, so the lock stays.
    expect(document.body.style.overflow).toBe("hidden");

    first.close();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("Tabをモーダル内へ閉じ込め、閉じたら元の要素へフォーカスを戻す", () => {
    const launcher = document.createElement("button");
    launcher.textContent = "Cart2BOM";
    document.body.append(launcher);
    launcher.focus();

    const modal = openModal(document, "メニュー");
    const last = createButton(document, "最後");
    modal.content.append(last);

    last.focus();
    pressKey("Tab");
    // Wraps back to the close button instead of escaping to the page behind.
    expect(document.activeElement).toBe(modal.overlay.querySelector(".cart2bom-icon-button"));

    pressKey("Tab", true);
    expect(document.activeElement).toBe(last);

    modal.close();
    expect(document.activeElement).toBe(launcher);
  });
});

describe("openConfirm", () => {
  beforeEach(() => document.body.replaceChildren());

  it("実行でtrue、キャンセルと閉じるでfalseを返す", async () => {
    const accepted = openConfirm(document, "リストを削除", { message: "削除します。", confirmLabel: "削除する" });
    buttonByText(document, "削除する").click();
    await expect(accepted).resolves.toBe(true);

    const declined = openConfirm(document, "リストを削除", { message: "削除します。" });
    buttonByText(document, "キャンセル").click();
    await expect(declined).resolves.toBe(false);

    const dismissed = openConfirm(document, "リストを削除", { message: "削除します。" });
    pressKey("Escape");
    await expect(dismissed).resolves.toBe(false);
  });
});

describe("openPrompt", () => {
  beforeEach(() => document.body.replaceChildren());

  it("入力値を返し、空欄では確定せず、キャンセルでnullを返す", async () => {
    const answered = openPrompt(document, "リスト名を変更", { label: "新しいリスト名", value: "旧名" });
    const field = document.querySelector<HTMLInputElement>('input[aria-label="新しいリスト名"]');
    if (!field) throw new Error("入力欄がありません。");
    expect(field.value).toBe("旧名");

    field.value = "   ";
    buttonByText(document, "決定").click();
    expect(document.querySelector(".cart2bom-overlay")).not.toBeNull();

    field.value = "  新しい名前  ";
    buttonByText(document, "決定").click();
    await expect(answered).resolves.toBe("新しい名前");

    const cancelled = openPrompt(document, "リスト名を変更", { label: "新しいリスト名" });
    buttonByText(document, "キャンセル").click();
    await expect(cancelled).resolves.toBeNull();
  });
});
