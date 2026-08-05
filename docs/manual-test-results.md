# Cart2BOM 手動テスト結果

## 2026-08-05：秋月電子通商（未ログイン・空カート）

- 対象URL：`https://akizukidenshi.com/catalog/cart/cart.aspx`
- ブラウザ：Codex in-app Browser
- ログイン状態：未ログイン
- カート状態：空
- 結果：カートページが正常に表示され、「現在、買い物かごには商品が入っておりません。」を確認
- 判定：`AkizukiAdapter.isCartPage()`の対象URLと一致。空カート時に商品リンクが0件となる前提を確認
- 未確認：商品入りカートの商品行DOM、UserScriptマネージャーへの実インストール、固定ボタンと各画面の実ブラウザ操作

### 一括注文ページ

- クイックオーダー：`https://akizukidenshi.com/catalog/quickorder/quickorder.aspx`
- ブランケットオーダー：`https://akizukidenshi.com/catalog/quickorder/blanketorder.aspx`
- 結果：ブランケットオーダーが販売コードと数量の半角スペース／タブ区切り入力に対応していることを確認

## 2026-08-05：秋月電子通商（未ログイン・商品1件）

- 検証商品：販売コード`105148`、数量1、税込単価100円
- 操作：Codex in-app Browserの匿名カートへ追加し、商品行確認後に削除
- カート復旧：削除後に「現在、買い物かごには商品が入っておりません。」を再確認
- 商品行：`tr.block-cart--goods-list`
- 通販コード：`td.item-goods`内の商品リンク
- 商品名：`td.item-goods_name`内の`.js-enhanced-ecommerce-goods-name`
- 単価：`td.item-price`
- 数量：`td.item-qty`内の`input[name^="qty"]`
- 重複リンク：同一商品URLへの通販コード、画像、商品名の3リンクを確認
- 結果：通販コード、商品名、数量、商品URLは既存ロジックで取得可能。単価用に`.item-price`を追加し、現行DOMを模した匿名化fixtureへ更新
- 個人情報・Cookie・セッション識別値：取得・保存していない

## 次の確認

生成したUserScriptをTampermonkey／Violentmonkeyへインストールし、固定ボタンから読み取り・保存・出力までを実ブラウザで確認する。複数商品と数量変更後の実カートも確認する。
