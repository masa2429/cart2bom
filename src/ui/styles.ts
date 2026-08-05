export const FLOATING_BUTTON_ID = "cart2bom-floating-button";
export const STYLE_ELEMENT_ID = "cart2bom-styles";

export const CART2BOM_STYLES = `
#${FLOATING_BUTTON_ID} {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483000;
  box-sizing: border-box;
  border: 1px solid #1769aa;
  border-radius: 999px;
  padding: 10px 16px;
  color: #ffffff;
  background: #1976d2;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28);
  font: 600 14px/1.4 system-ui, sans-serif;
  cursor: pointer;
}

#${FLOATING_BUTTON_ID}:hover {
  background: #125ca1;
}

#${FLOATING_BUTTON_ID}:focus-visible {
  outline: 3px solid #ffbf47;
  outline-offset: 2px;
}

#${FLOATING_BUTTON_ID}[data-side="left"] { left: 20px; right: auto; }

@media (prefers-color-scheme: dark) {
  #${FLOATING_BUTTON_ID} {
    border-color: #90caf9;
    color: #ffffff;
    background: #0d5c9f;
  }
}

.cart2bom-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 20px;
  background: rgba(0, 0, 0, 0.52);
  font: 14px/1.5 system-ui, sans-serif;
}

.cart2bom-modal {
  width: min(520px, calc(100vw - 32px));
  max-height: calc(100vh - 40px);
  overflow: auto;
  border-radius: 12px;
  color: #202124;
  background: #ffffff;
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.38);
}

.cart2bom-overlay-wide .cart2bom-modal { width: min(1180px, calc(100vw - 32px)); }
.cart2bom-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #dadce0; }
.cart2bom-modal-header h2 { margin: 0; font-size: 20px; }
.cart2bom-modal-content { padding: 20px; }
.cart2bom-icon-button { border: 0; padding: 2px 9px; color: inherit; background: transparent; font-size: 26px; cursor: pointer; }
.cart2bom-button { border: 1px solid #8a9096; border-radius: 7px; padding: 8px 12px; color: #202124; background: #ffffff; font: 600 13px/1.3 system-ui, sans-serif; cursor: pointer; }
.cart2bom-button:disabled { opacity: 0.55; cursor: wait; }
.cart2bom-button-primary { border-color: #1769aa; color: #ffffff; background: #1976d2; }
.cart2bom-button-danger { border-color: #b3261e; color: #b3261e; }
.cart2bom-menu { display: grid; gap: 10px; }
.cart2bom-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.cart2bom-form label { display: grid; gap: 4px; font-weight: 600; }
.cart2bom-form input, .cart2bom-table-wrap input { box-sizing: border-box; width: 100%; border: 1px solid #9aa0a6; border-radius: 5px; padding: 7px; color: #202124; background: #ffffff; }
.cart2bom-table-wrap { max-height: 52vh; overflow: auto; border: 1px solid #dadce0; }
.cart2bom-table-wrap table { width: 100%; border-collapse: collapse; font-size: 12px; }
.cart2bom-table-wrap th { position: sticky; top: 0; z-index: 1; background: #f1f3f4; }
.cart2bom-table-wrap th, .cart2bom-table-wrap td { min-width: 80px; border-bottom: 1px solid #dadce0; padding: 7px; text-align: left; vertical-align: middle; }
.cart2bom-table-wrap th:first-child, .cart2bom-table-wrap td:first-child { min-width: 44px; }
.cart2bom-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.cart2bom-list-actions { align-items: flex-start; }
.cart2bom-action-menu { position: relative; }
.cart2bom-action-menu summary { list-style: none; user-select: none; }
.cart2bom-action-menu summary::-webkit-details-marker { display: none; }
.cart2bom-action-menu-panel { position: absolute; top: calc(100% + 5px); right: 0; z-index: 2; display: grid; min-width: 210px; gap: 5px; border: 1px solid #dadce0; border-radius: 8px; padding: 7px; background: #ffffff; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.cart2bom-action-menu-panel .cart2bom-button { width: 100%; text-align: left; white-space: nowrap; }
.cart2bom-error { min-height: 1.5em; color: #b3261e; }
.cart2bom-warning-details { margin: 0 0 14px; border: 1px solid #c58b00; border-radius: 7px; padding: 9px 12px; color: #5f4200; background: #fff8e1; }
.cart2bom-warning-details summary { font-weight: 700; cursor: pointer; }
.cart2bom-warning-details ul { margin: 8px 0 0; padding-left: 22px; }
.cart2bom-list-grid { display: grid; gap: 12px; }
.cart2bom-list-card { border: 1px solid #dadce0; border-radius: 8px; padding: 14px; }
.cart2bom-list-card h3, .cart2bom-list-card p { margin: 0 0 6px; }
.cart2bom-list-total { margin: 10px 0 0; text-align: right; font-size: 16px; font-weight: 700; }
.cart2bom-list-images { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.cart2bom-product-image { display: block; width: 64px; height: 64px; border: 1px solid #dadce0; border-radius: 6px; background: #ffffff; object-fit: contain; }
.cart2bom-toast { position: fixed; right: 20px; bottom: 78px; z-index: 2147483002; max-width: min(420px, calc(100vw - 40px)); border-radius: 8px; padding: 12px 16px; color: #ffffff; background: #303134; box-shadow: 0 5px 18px rgba(0, 0, 0, 0.32); font: 14px/1.5 system-ui, sans-serif; }
.cart2bom-import-text { display: block; box-sizing: border-box; width: 100%; min-height: 240px; margin-top: 12px; border: 1px solid #9aa0a6; border-radius: 6px; padding: 10px; color: #202124; background: #ffffff; font: 13px/1.5 ui-monospace, monospace; resize: vertical; }
.cart2bom-settings-form select { box-sizing: border-box; width: 100%; border: 1px solid #9aa0a6; border-radius: 5px; padding: 7px; color: #202124; background: #ffffff; }
.cart2bom-checkbox-label { display: flex !important; grid-auto-flow: column; align-items: center; justify-content: start; }
.cart2bom-checkbox-label input { width: auto; }

@media (max-width: 700px) {
  .cart2bom-form { grid-template-columns: 1fr; }
}
`;
