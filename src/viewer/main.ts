import { hasSharedListFragment, readSharedListUrl } from "../core/share-url";
import { renderErrorPage, renderLandingPage, renderSharedListPage } from "./viewer";
import "./styles.css";

const root = document.getElementById("cart2bom-viewer");
if (!(root instanceof HTMLElement)) throw new Error("Cart2BOMビューアの表示領域がありません。");

const url = new URL(window.location.href);
if (!hasSharedListFragment(url)) {
  renderLandingPage(document, root);
} else {
  void readSharedListUrl(url).then((list) => {
    if (!list) {
      renderLandingPage(document, root);
      return;
    }
    renderSharedListPage(document, root, list, url.href);
  }).catch((caught: unknown) => {
    renderErrorPage(
      document,
      root,
      caught instanceof Error ? caught.message : "共有URLが不正です。",
    );
  });
}
