import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

describe("共有画面の状態表示", () => {
  beforeEach(() => {
    document.head.replaceChildren();
    document.body.replaceChildren();
    const style = document.createElement("style");
    style.textContent = readFileSync(resolve("src/viewer/styles.css"), "utf8");
    document.head.append(style);
  });

  it("ボタンへ指定した太さと大きさが実際に適用される", () => {
    const button = document.createElement("button");
    button.className = "viewer-button";
    document.body.append(button);
    const style = getComputedStyle(button);
    // `font: 700 14px/1.25 inherit` は不正で宣言ごと捨てられ、
    // button はUAの既定、a はページ継承となって同じ行で高さが揃わなかった。
    expect(style.fontWeight).toBe("700");
    expect(style.fontSize).toBe("14px");
  });

  it("フォント指定にinheritを終端とするfontショートハンドを使わない", () => {
    // 説明のためコメントへ不正例を残しているので、宣言だけを対象にする。
    const declarations = readFileSync(resolve("src/viewer/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(declarations).not.toMatch(/font:[^;}]*\binherit\b/);
  });

  it("疑似要素にもborder-boxを適用する", () => {
    const css = readFileSync(resolve("src/viewer/styles.css"), "utf8");
    // 適用しないと手順番号の丸が枠線ぶん膨らみ、縦線から3px右へずれる。
    expect(css).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{[^}]*box-sizing:\s*border-box/);
  });

  it("モノタロウ入力値をコピーすると通常色より成功色を優先する", () => {
    const sidebar = document.createElement("aside");
    sidebar.className = "viewer-sidebar";
    const table = document.createElement("table");
    table.className = "viewer-copy-table";
    const button = document.createElement("button");
    button.className = "viewer-button viewer-button-copy-value";
    table.append(button);
    sidebar.append(table);
    document.body.append(sidebar);
    const before = getComputedStyle(button).backgroundColor;
    button.classList.add("viewer-copy-done");
    const after = getComputedStyle(button).backgroundColor;
    expect(after).not.toBe(before);
    expect(after).toBe("rgb(234, 247, 239)");
  });
});
