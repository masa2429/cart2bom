export const FLOATING_BUTTON_ID = "cart2bom-floating-button";
export const STYLE_ELEMENT_ID = "cart2bom-styles";

export const CART2BOM_STYLES = `
#${FLOATING_BUTTON_ID} {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483000;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  padding: 10px 17px 10px 14px;
  color: #ffffff;
  background: linear-gradient(145deg, #2687df, #155eaa);
  box-shadow: 0 8px 26px rgba(21, 94, 170, 0.32), 0 2px 7px rgba(25, 40, 60, 0.2);
  font: 750 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
}

#${FLOATING_BUTTON_ID}::before {
  content: "▦";
  font-size: 17px;
  line-height: 1;
}

#${FLOATING_BUTTON_ID}:hover {
  background: linear-gradient(145deg, #1976d2, #114f91);
  box-shadow: 0 10px 30px rgba(21, 94, 170, 0.38), 0 3px 8px rgba(25, 40, 60, 0.22);
  transform: translateY(-1px);
}

#${FLOATING_BUTTON_ID}:active { transform: translateY(0); }
#${FLOATING_BUTTON_ID}:focus-visible { outline: 3px solid #ffbf47; outline-offset: 3px; }
#${FLOATING_BUTTON_ID}[data-side="left"] { left: 20px; right: auto; }

.cart2bom-overlay {
  --cart2bom-ink: #172033;
  --cart2bom-muted: #657387;
  --cart2bom-border: #dce3eb;
  --cart2bom-soft: #f4f7fa;
  --cart2bom-blue: #1976d2;
  --cart2bom-blue-dark: #155eaa;
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 20px;
  color: var(--cart2bom-ink);
  background: rgba(18, 28, 42, 0.56);
  backdrop-filter: blur(5px);
  font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif;
}

.cart2bom-overlay *, .cart2bom-overlay *::before, .cart2bom-overlay *::after { box-sizing: border-box; }
.cart2bom-modal {
  width: min(540px, calc(100vw - 32px));
  max-height: calc(100vh - 40px);
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  color: var(--cart2bom-ink);
  background: #ffffff;
  box-shadow: 0 28px 80px rgba(9, 22, 38, 0.32), 0 8px 24px rgba(9, 22, 38, 0.16);
  scrollbar-color: #b7c4d2 transparent;
}

.cart2bom-overlay-wide .cart2bom-modal { width: min(1220px, calc(100vw - 32px)); }
.cart2bom-modal-header {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 66px;
  border-bottom: 1px solid #e4e9ef;
  padding: 14px 18px 14px 20px;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(10px);
}
.cart2bom-modal-header h2 { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 20px; line-height: 1.35; letter-spacing: -0.01em; }
.cart2bom-modal-header h2::before {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  color: #ffffff;
  background: linear-gradient(145deg, #2687df, #155eaa);
  box-shadow: 0 4px 10px rgba(21, 94, 170, 0.18);
  content: "▦";
  font-size: 16px;
}
.cart2bom-modal-content { padding: 22px; }
.cart2bom-modal-content > :first-child { margin-top: 0; }
.cart2bom-icon-button {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 0;
  color: #59677a;
  background: transparent;
  font: 400 25px/1 system-ui, sans-serif;
  cursor: pointer;
}
.cart2bom-icon-button:hover { border-color: #d8e0e8; color: var(--cart2bom-ink); background: #f4f7fa; }
.cart2bom-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  border: 1px solid #a8b4c2;
  border-radius: 9px;
  padding: 9px 14px;
  color: #26364a;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(25, 40, 60, 0.04);
  font: 700 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 130ms ease, background 130ms ease, box-shadow 130ms ease, transform 130ms ease;
}
.cart2bom-button:hover { border-color: #6d8dac; background: #f5f9fd; box-shadow: 0 3px 9px rgba(25, 70, 110, 0.08); }
.cart2bom-button:active { transform: translateY(1px); }
.cart2bom-button:focus-visible, .cart2bom-icon-button:focus-visible, .cart2bom-overlay input:focus-visible, .cart2bom-overlay textarea:focus-visible, .cart2bom-overlay select:focus-visible, .cart2bom-action-menu summary:focus-visible { outline: 3px solid rgba(25, 118, 210, 0.24); outline-offset: 2px; }
.cart2bom-button:disabled { opacity: 0.52; cursor: wait; transform: none; }
.cart2bom-button-primary { border-color: var(--cart2bom-blue); color: #ffffff; background: linear-gradient(145deg, #2484dc, #1769b6); box-shadow: 0 4px 11px rgba(25, 118, 210, 0.19); }
.cart2bom-button-primary:hover { border-color: #125b9f; color: #ffffff; background: linear-gradient(145deg, #1976d2, #135b9f); }
.cart2bom-button-danger { border-color: #e2aaa6; color: #a92620; background: #fffafa; }
.cart2bom-button-danger:hover { border-color: #c64a42; color: #8c1f1a; background: #fff2f1; }
.cart2bom-actions { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 16px; }

.cart2bom-store-context { margin: 0 0 16px; border: 1px solid #cfe0ef; border-radius: 10px; padding: 10px 12px; color: #315274; background: #f3f8fc; font-size: 13px; font-weight: 700; }
.cart2bom-menu { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.cart2bom-menu .cart2bom-button { justify-content: flex-start; min-height: 46px; padding-inline: 15px; }
.cart2bom-menu .cart2bom-button-primary { grid-column: 1 / -1; justify-content: center; font-size: 14px; }
.cart2bom-menu a.cart2bom-button { justify-content: center; text-align: center; }

.cart2bom-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 13px; margin-bottom: 18px; border: 1px solid #e1e7ed; border-radius: 12px; padding: 14px; background: #f8fafc; }
.cart2bom-form label { display: grid; align-content: start; gap: 6px; color: #42526a; font-size: 12px; font-weight: 750; }
.cart2bom-form input, .cart2bom-table-wrap input, .cart2bom-item-note, .cart2bom-import-text, .cart2bom-settings-form select {
  width: 100%;
  border: 1px solid #aeb9c6;
  border-radius: 8px;
  padding: 8px 9px;
  color: #172033;
  background: #ffffff;
  font: inherit;
  transition: border-color 130ms ease, box-shadow 130ms ease;
}
.cart2bom-form input:hover, .cart2bom-table-wrap input:hover, .cart2bom-item-note:hover, .cart2bom-import-text:hover, .cart2bom-settings-form select:hover { border-color: #7f91a5; }
.cart2bom-form input:focus, .cart2bom-table-wrap input:focus, .cart2bom-item-note:focus, .cart2bom-import-text:focus, .cart2bom-settings-form select:focus { border-color: var(--cart2bom-blue); box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.12); outline: none; }

.cart2bom-table-wrap { max-height: 54vh; overflow: auto; border: 1px solid #dce3eb; border-radius: 12px; background: #ffffff; scrollbar-color: #b7c4d2 transparent; }
.cart2bom-table-wrap table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; }
.cart2bom-table-wrap th { position: sticky; top: 0; z-index: 1; color: #526175; background: #f3f6f9; font-size: 11px; font-weight: 800; letter-spacing: 0.025em; }
.cart2bom-table-wrap th, .cart2bom-table-wrap td { border-bottom: 1px solid #e5eaf0; padding: 11px 10px; text-align: left; vertical-align: middle; }
.cart2bom-table-wrap tbody tr:nth-child(even) { background: #fbfcfd; }
.cart2bom-table-wrap tbody tr:hover { background: #f5f9fd; }
.cart2bom-table-wrap tbody tr:last-child td { border-bottom: 0; }
.cart2bom-col-select { width: 48px; text-align: center !important; }
.cart2bom-col-select input { width: 18px !important; height: 18px; padding: 0; accent-color: var(--cart2bom-blue); }
.cart2bom-col-product { width: 42%; min-width: 330px; }
.cart2bom-col-quantity { width: 150px; min-width: 135px; }
.cart2bom-col-price { width: 120px; min-width: 105px; }
.cart2bom-col-note { width: 190px; min-width: 150px; }
.cart2bom-col-remove { width: 72px; text-align: center !important; }
.cart2bom-editor-product { display: grid; grid-template-columns: 70px minmax(0, 1fr); align-items: start; gap: 11px; }
.cart2bom-editor-product-image { display: grid; min-height: 70px; place-items: center; border-radius: 9px; color: #8a96a5; background: #ffffff; }
.cart2bom-editor-product-main { display: grid; min-width: 0; gap: 7px; }
.cart2bom-item-code { color: #6c798a; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; }
.cart2bom-item-name { width: 100% !important; font-weight: 700 !important; }
.cart2bom-item-details { color: #42526a; }
.cart2bom-item-details summary { color: #526175; cursor: pointer; overflow-wrap: anywhere; }
.cart2bom-item-details label, .cart2bom-editor-quantity label { display: grid; gap: 4px; color: #68778a; font-size: 11px; font-weight: 700; }
.cart2bom-item-details label { margin-top: 7px; }
.cart2bom-editor-quantity, .cart2bom-editor-price { display: grid; gap: 9px; }
.cart2bom-editor-price { color: #59677a; }
.cart2bom-editor-price strong { color: #172033; font-size: 13px; }
.cart2bom-item-note { min-height: 64px; resize: vertical; }
.cart2bom-list-total { margin: 12px 0 0; color: #172033; text-align: right; font-size: 17px; font-weight: 800; }

.cart2bom-action-menu { position: relative; }
.cart2bom-action-menu summary { list-style: none; user-select: none; }
.cart2bom-action-menu summary::-webkit-details-marker { display: none; }
.cart2bom-action-menu-panel { position: absolute; right: 0; bottom: calc(100% + 7px); z-index: 3; display: grid; min-width: 220px; gap: 4px; border: 1px solid #d5dde6; border-radius: 11px; padding: 7px; background: #ffffff; box-shadow: 0 14px 38px rgba(20, 35, 55, 0.18); }
.cart2bom-action-menu-panel .cart2bom-button { width: 100%; min-height: 37px; border-color: transparent; justify-content: flex-start; text-align: left; white-space: nowrap; box-shadow: none; }
.cart2bom-action-menu-panel .cart2bom-button-danger { color: #a92620; }

.cart2bom-error:empty { display: none; }
.cart2bom-error { margin: 12px 0; border-radius: 9px; padding: 9px 11px; color: #a92620; background: #fff2f1; }
.cart2bom-warning-details { margin: 0 0 15px; border: 1px solid #ebcb7d; border-radius: 10px; padding: 10px 13px; color: #634a12; background: #fff9e9; }
.cart2bom-warning-details summary { font-weight: 750; cursor: pointer; }
.cart2bom-warning-details ul { margin: 9px 0 0; padding-left: 22px; }
.cart2bom-empty-state { margin: 0; border: 1px dashed #c8d3df; border-radius: 12px; padding: 28px 18px; color: #657387; text-align: center; background: #f8fafc; }

.cart2bom-list-grid { display: grid; gap: 13px; }
.cart2bom-list-card { border: 1px solid #dce3eb; border-radius: 13px; padding: 16px; background: linear-gradient(145deg, #ffffff, #fbfcfe); box-shadow: 0 4px 14px rgba(40, 62, 90, 0.045); }
.cart2bom-list-card h3 { margin: 0 0 5px; color: #172033; font-size: 16px; line-height: 1.45; overflow-wrap: anywhere; }
.cart2bom-list-card p { margin: 0 0 7px; }
.cart2bom-list-meta { color: #657387; font-size: 12px; }
.cart2bom-list-actions { align-items: flex-start; margin-top: 13px; padding-top: 13px; border-top: 1px solid #e7ebf0; }
.cart2bom-list-images { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 11px; }
.cart2bom-product-image { display: block; width: 64px; height: 64px; border: 1px solid #dce3eb; border-radius: 9px; background: #ffffff; object-fit: contain; }

.cart2bom-toast { position: fixed; right: 20px; bottom: 78px; z-index: 2147483002; max-width: min(420px, calc(100vw - 40px)); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 11px; padding: 13px 16px; color: #ffffff; background: #233044; box-shadow: 0 12px 32px rgba(15, 28, 44, 0.3); font: 650 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif; }
.cart2bom-import-intro { margin: 0 0 14px; color: #59677a; }
.cart2bom-file-field { display: grid; gap: 7px; border: 1px dashed #b9c8d7; border-radius: 11px; padding: 14px; color: #42526a; background: #f7fafc; font-size: 12px; font-weight: 750; }
.cart2bom-file-field input { font: inherit; }
.cart2bom-import-text { display: block; min-height: 230px; margin-top: 12px; padding: 12px; font: 13px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace; resize: vertical; }
.cart2bom-settings-form { grid-template-columns: 1fr; }
.cart2bom-settings-form select { min-height: 40px; }
.cart2bom-checkbox-label { display: flex !important; grid-auto-flow: column; align-items: center; justify-content: start; min-height: 42px; border-top: 1px solid #e2e7ed; padding-top: 12px; font-size: 13px !important; }
.cart2bom-checkbox-label input { width: 18px !important; height: 18px; padding: 0; accent-color: var(--cart2bom-blue); }
.cart2bom-shared-summary { border: 1px solid #d8e4ef; border-radius: 12px; padding: 16px; background: #f5f9fd; }
.cart2bom-shared-summary h3 { margin: 0 0 5px; font-size: 18px; }
.cart2bom-shared-summary p { margin: 0; color: #526175; font-weight: 700; }
.cart2bom-store-counts { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0 0; padding: 0; list-style: none; }
.cart2bom-store-counts li { border-radius: 999px; padding: 5px 9px; color: #315274; background: #e8f1f9; font-size: 12px; font-weight: 700; }
.cart2bom-notice { margin: 14px 0 0; border-left: 3px solid #4c8cc7; padding: 8px 11px; color: #4c5d70; background: #f7fafc; }

@media (max-width: 700px) {
  .cart2bom-overlay { align-items: flex-end; padding: 10px; }
  .cart2bom-modal { width: 100%; max-height: calc(100vh - 20px); border-radius: 16px; }
  .cart2bom-overlay-wide .cart2bom-modal { width: 100%; }
  .cart2bom-modal-header { min-height: 60px; padding: 12px 13px 12px 16px; }
  .cart2bom-modal-header h2 { font-size: 18px; }
  .cart2bom-modal-content { padding: 16px; }
  .cart2bom-form { grid-template-columns: 1fr; padding: 12px; }
  .cart2bom-menu { grid-template-columns: 1fr; }
  .cart2bom-menu .cart2bom-button-primary { grid-column: auto; }
  .cart2bom-list-actions > .cart2bom-button { flex: 1 1 120px; }
  .cart2bom-list-actions > .cart2bom-action-menu { flex: 1 1 100px; }
  .cart2bom-list-actions > .cart2bom-action-menu > summary { width: 100%; }
  #${FLOATING_BUTTON_ID} { right: 14px; bottom: 14px; }
  #${FLOATING_BUTTON_ID}[data-side="left"] { left: 14px; right: auto; }
}

@media (prefers-reduced-motion: reduce) {
  #${FLOATING_BUTTON_ID}, .cart2bom-button { transition: none; }
}
`;
