import { beforeEach, describe, expect, it, vi } from "vitest";
import { openMainMenu } from "../../src/ui/main-menu";

describe("openMainMenu", () => {
  beforeEach(() => document.body.replaceChildren());

  it("公開リポジトリへのGitHubリンクを表示する", () => {
    openMainMenu(document, {
      storeName: "秋月電子通商",
      onReadCart: vi.fn(),
      onSavedLists: vi.fn(),
      onImport: vi.fn(),
      onSettings: vi.fn(),
    });

    const github = document.querySelector<HTMLAnchorElement>('a[href="https://github.com/masa2429/cart2bom"]');
    expect(github?.textContent).toBe("GitHub");
    expect(github?.target).toBe("_blank");
    expect(github?.rel).toBe("noopener noreferrer");
  });
});
