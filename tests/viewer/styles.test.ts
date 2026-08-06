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
