# Cart2BOM 仕様書

- 文書バージョン：0.3
- 実装方式：UserScript
- 対応サイト：秋月電子通商，モノタロウ，ミスミ（いずれも実装済み）
- 想定実行環境：Tampermonkey／Violentmonkey，Chrome／Edge／Firefox
- 開発方針：AkiBoostの操作感を参考にするが，コードは独自実装する

本書は0.3で実装状況へ同期した．MVP（26．実装順序のStep 1〜8），Phase 2のモノタロウ，Phase 3のミスミは実装済みである．未実装項目と既知の制限は「32．実装状況と既知の制限」にまとめる．

---

## 1．概要

Cart2BOMは，通販サイトのカート内容を読み取り，共通形式で保存，編集，共有，再利用するUserScriptである．

秋月電子通商，モノタロウ，ミスミなど，サイトごとに異なる商品情報を共通のデータ構造へ変換し，CSV，TSV，JSONなどで出力する．対応サイトでは，一括注文画面へ再入力できる形式も生成する．

初期版はAkiBoostのように，対象サイトの画面端へ常設ボタンを追加するUserScriptとして実装する．ブックマークレットは試作版として扱い，今後の主実装には使用しない．

---

## 2．背景

通販サイトのカートは，次の用途で一時的な部品リストとして使用されることが多い．

- 基板や装置の部品選定
- 研究室内の購入依頼
- 学生団体内での発注内容共有
- 一度作成したカートの保存
- 過去の発注内容の再利用

しかし，通常のカートには次の問題がある．

- セッション切れや誤操作で内容が失われる
- 複数店舗のカートをまとめて管理できない
- 購入担当者へ渡しにくい
- CSV等へ出力できないサイトがある
- 外部の部品リストサービスは，通販サイト側の変更で動かなくなることがある
- サービス終了時に保存データを利用できなくなる可能性がある

そこで，外部サーバーを必須とせず，ブラウザ内で動作する共有・出力ツールを作成する．

---

## 3．目的

1. 現在のカート内容をワンクリックで読み取る．
2. 商品コード，商品名，数量，価格，URLを共通形式へ変換する．
3. カート内容を名前付きリストとしてブラウザ内に保存する．
4. 保存したリストをCSV，TSV，JSON等で出力する．
5. 対応サイトでは，保存した内容を一括注文形式へ変換する．
6. 複数の通販サイトへ追加対応しやすい構造にする．
7. ログイン情報やCookieを保存せず，注文確定も自動化しない．

---

## 4．対象外

初期版では，次の機能を実装しない．

- 注文の自動確定
- 支払い情報の取得
- ログイン情報の取得または保存
- 外部サーバーへの自動同期
- 在庫や価格の定期監視
- 複数ユーザーによるリアルタイム共同編集
- KiCad BOMとの自動照合
- スマートフォン対応
- Excelファイルの直接生成

これらは，MVP完成後に必要性を検討する．

---

## 5．提供形態

### 5.1．UserScript

TampermonkeyまたはViolentmonkeyへインストールするUserScriptとして提供する．

配布ファイル：

```text
dist/cart2bom.user.js
```

GitHubのRaw URLからインストールできるようにする．

UserScriptヘッダーは`scripts/build.mjs`が生成し，`@version`は`package.json`の`version`を埋め込む．

```javascript
// ==UserScript==
// @name         Cart2BOM
// @namespace    cart2bom
// @version      <package.jsonのversion>
// @author       morita_masato
// @description  通販サイトのカートを保存・共有・再利用します
// @homepageURL  https://github.com/masa2429/cart2bom
// @supportURL   https://github.com/masa2429/cart2bom/issues
// @match        https://akizukidenshi.com/*
// @match        https://www.akizukidenshi.com/*
// @match        https://monotaro.com/*
// @match        https://www.monotaro.com/*
// @match        https://jp.misumi-ec.com/*
// @run-at       document-idle
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @updateURL    https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js
// @downloadURL  https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js
// ==/UserScript==
```

不要な権限は付与しない．ファイル保存は`a[download]`で実装しているため，`GM.download`と`GM_info`は付与しない．

### 5.2．ブックマークレット

既に作成した秋月用ブックマークレットは，簡易版または動作検証用として残してよい．ただし，本仕様のMVP対象はUserScript版とする．

### 5.3．ブラウザ拡張機能

将来的にChrome／Edge拡張機能へ移行できる設計にするが，初期版では作成しない．共通ロジックはUserScript固有APIへ直接依存させず，Storageインターフェースを介して利用する．

---

## 6．参考にする操作感

AkiBoostのように，対象サイトの画面端へ固定ボタンを表示する．

```text
┌─────────────┐
│ 🛒 Cart2BOM │
└─────────────┘
```

ボタンを押すとメニューを開く．

```text
┌──────────────────────────────┐
│ Cart2BOM                     │
├──────────────────────────────┤
│ 対象サイト：秋月電子通商    │
│ 現在のカート：12商品         │
│                              │
│ [現在のカートを読み取る]     │
│ [保存済みリスト]             │
│ [設定]                       │
└──────────────────────────────┘
```

AkiBoostはUIと利用方法の参考にとどめる．ライセンスが明確でないコードを直接コピーしない．

---

## 7．対応サイト

### 7.1．MVP

- 秋月電子通商（実装済み）

### 7.2．Phase 2

- モノタロウ（実装済み）

### 7.3．Phase 3

- ミスミ（実装済み）

### 7.4．将来候補

- 千石電商
- 共立エレショップ
- DigiKey
- Mouser
- LCSC
- RS
- マルツ
- Amazon
- アスクル
- オレンジブック

---

## 8．MVPの機能要件

### 8.1．サイト判定

現在のURLから対応サイトを判定する．

対応外サイトではボタンを表示しない．対応ドメイン内の非対象ページではボタンを表示してよいが，カート読み取り時に案内を出す．

### 8.2．カート内容の読み取り

秋月電子のカートページから，次の項目を取得する．

| 項目 | 必須 | 説明 |
|---|---:|---|
| `storeId` | 必須 | `akizuki` |
| `storeName` | 必須 | 秋月電子通商 |
| `orderCode` | 必須 | 6桁の通販コード |
| `manufacturerName` | 任意 | メーカー名 |
| `name` | 必須 | 商品名 |
| `salesUnit` | 任意 | `1個`、`1袋100本入`などの販売単位 |
| `quantity` | 必須 | カート内数量 |
| `unitPrice` | 任意 | 単価 |
| `subtotal` | 任意 | 小計 |
| `productUrl` | 必須 | 商品ページURL |
| `imageUrl` | 任意 | 商品画像URL |
| `manufacturerPartNumber` | 任意 | メーカー型番 |
| `stockStatus` | 任意 | 在庫状態 |
| `leadTime` | 任意 | 納期 |
| `note` | 任意 | ユーザー入力 |
| `capturedAt` | 必須 | 読み取り日時 |

取得できない任意項目は空文字または`null`とし，処理全体を失敗させない．

### 8.3．読み取り結果の確認

カート読み取り後，モーダル画面に表を表示する．

表示列は，横スクロールを避けるため次の6列へ集約する．

- 選択
- 商品
- 数量
- 金額
- 備考
- 削除

「商品」列には商品画像，通販コード，商品名，商品ページへのリンクを表示し，メーカー名とメーカー型番は`details`を開いたときに編集する．「数量」列には数量と販売単位，「金額」列には単価と小計を表示する．見出しのチェックボックスで全商品の選択を切り替える．

編集可能項目：

- 数量
- 商品名
- メーカー名
- メーカー型番
- 販売単位
- 備考
- 行の削除

### 8.4．保存

読み取った内容を名前付きリストとして保存できる．

保存時の入力：

- リスト名
- 説明
- タグ
- 商品一覧

リスト名の初期値：

```text
秋月カート YYYY-MM-DD HH:mm
```

同名リストが存在する場合は，上書き確認を表示する．

### 8.5．保存済みリスト

保存済みリスト画面には，現在表示している店舗の商品を含むリストだけを表示する．各リストで次の操作を行える．

- 開く
- バスケットへ追加（現在の店舗の商品を，店舗の一括入力機能でカートへ戻す）
- 出力：共有URLのコピー，平文のコピー，CSV，TSV，JSON，Markdown，店舗用の一括注文テキスト
- その他：名前変更，複製，削除

操作数が多いため，「出力」と「その他」はまとめて開く形にする．店舗の一括入力に対応していない場合は，該当する操作を表示しない．

### 8.6．出力

#### 共通CSV

列順は次のとおりとする．

```text
store,orderCode,manufacturerName,manufacturerPartNumber,name,salesUnit,quantity,unitPrice,subtotal,currency,productUrl,imageUrl,note,capturedAt
```

CSVはRFC 4180相当のエスケープを行う．改行，カンマ，ダブルクォートを含む値は正しく引用する．文字コードはUTF-8，改行はCRLFを基本とする．

#### 共通TSV

CSVと同じ列をタブ区切りで出力する．値にタブや改行が含まれる場合は空白へ正規化する．

#### JSON

リスト情報と商品情報を失わず出力する．後から再インポートできる形式とする．

#### 秋月一括注文形式

```text
105148	2
131939	1
```

仕様：

- 通販コードと数量をタブで区切る
- 1商品につき1行
- 同一通販コードは数量を合算する
- 数量が1未満または整数でない行はエラーとする
- 通販コードが6桁でない行はエラーとする
- 出力前にエラー行を表示する

### 8.7．クリップボード

「コピー」ボタンを押した場合のみクリップボードへ書き込む．ページ読み込み時やカート読み取り時に自動コピーしない．

### 8.8．インポート

MVPではJSONインポートを実装する．

- ファイル選択またはテキスト貼り付け
- スキーマバージョンの確認
- 不正なデータの拒否
- 既存リストとの重複時に確認

CSVインポートはPhase 2以降とする．

---

## 9．画面仕様

### 9.1．固定ボタン

- 画面左下または右下へ固定する
- サイト本来の操作を妨げない
- 位置は設定で左右を切り替えられる設計にする
- `z-index`は高くするが，必要以上に大きくしない
- ボタンには`Cart2BOM`と表示する
- ダークモードでも識別できる

### 9.2．メニュー

メニュー項目：

```text
現在のカートを読み取る
保存済みリスト
インポート
設定
GitHub
```

### 9.3．モーダル

- 背景クリックで閉じる
- Escキーで閉じる
- 閉じるボタンを表示する
- 画面外へはみ出さない
- 商品数が多い場合は表部分だけスクロールする
- 主要操作前には確認メッセージを表示する
- 破壊的操作は目立つ位置へ置かない

### 9.4．通知

軽微な結果はトースト通知を使用する．

例：

```text
12商品を読み取りました．
リストを保存しました．
クリップボードへコピーしました．
```

エラーはモーダル内またはダイアログで詳細を表示する．
読み取り警告がある場合は件数だけでなく、対象商品の手掛かりと理由を読み取り結果モーダル内へ表示する．

---

## 10．データモデル

### 10.1．商品

```typescript
export interface CartItem {
  id: string;
  storeId: string;
  storeName: string;
  orderCode: string;
  manufacturerName: string | null;
  manufacturerPartNumber: string | null;
  name: string;
  salesUnit: string | null;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
  currency: "JPY";
  productUrl: string;
  imageUrl: string | null;
  stockStatus: string | null;
  leadTime: string | null;
  note: string;
  capturedAt: string;
}
```

`id`は次の値から生成する．

```text
<storeId>:<orderCode>
```

同じ通販コードで仕様違いが存在するサイトでは，アダプターが識別用情報を追加できるようにする．

リストの合計金額は保存値として重複保持せず、各商品の`subtotal`、または`unitPrice × quantity`から表示時に算出する。価格不明の商品がある場合は、その商品数を合計と併記する．

### 10.2．保存リスト

```typescript
export interface SavedList {
  id: string;
  schemaVersion: number;
  name: string;
  description: string;
  tags: string[];
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}
```

### 10.3．設定

```typescript
export interface AppSettings {
  schemaVersion: number;
  buttonSide: "left" | "right";
  confirmBeforeDelete: boolean;
  defaultExportFormat: "csv" | "tsv" | "json" | "quickOrder";
  theme: "auto" | "light" | "dark";
}
```

`theme`は`auto`でOSの配色設定へ追従する．GitHub Pagesの共有画面とインストール画面も，OS設定へ自動追従する．

---

## 11．保存方式

UserScriptの`GM.getValue`と`GM.setValue`を利用する．

保存キー：

```text
cart2bom.settings
cart2bom.lists
cart2bom.migrations
cart2bom.pendingQuickOrder
```

`cart2bom.pendingQuickOrder`は，一括入力の進行状態を店舗のページ遷移をまたいで保持する一時領域である．処理の完了時と中断時に削除する．

ストレージ処理は，次のインターフェースへ分離する．

```typescript
export interface StorageProvider {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
```

将来ブラウザ拡張機能へ移行するときは，`chrome.storage.local`版を追加する．

### 11.1．スキーマ更新

保存データには`schemaVersion`を持たせる．

旧バージョンのデータを読み込んだ場合は，マイグレーション関数を順に適用する．

```typescript
type Migration = (value: unknown) => unknown;
```

破損データを検出した場合は，勝手に削除せず，バックアップ用JSONを出力できるようにする．

---

## 12．サイト別アダプター

### 12.1．インターフェース

```typescript
export interface StoreAdapter {
  readonly id: string;
  readonly name: string;
  readonly listNamePrefix: string;

  matches(url: URL): boolean;
  isCartPage(url: URL, document: Document): boolean;
  getCartUrl(): string | null;

  prepareCart?(document: Document): Promise<void>;
  extractCart(document: Document): CartExtractionResult;

  readonly quickOrderCodeRequirement?: string;
  readonly quickOrderCapacity?: number;
  validateQuickOrderCode?(code: string): boolean;
  createQuickOrderText?(items: CartItem[]): string;
  getQuickOrderUrl?(): string | null;
  isQuickOrderPage?(url: URL, document: Document): boolean;
  fillQuickOrder?(document: Document, text: string): number | Promise<number>;
  submitQuickOrder?(document: Document, text: string): number | Promise<number>;
}
```

一括入力に関する任意メンバーは，店舗が対応する範囲だけを実装する．共通UIは，実装されているメンバーの有無から利用できる操作を決める．

- `prepareCart`：読み取り前に非同期の価格照会などを待つ．ミスミで使用する
- `quickOrderCapacity`：1回の送信で扱える商品数．超える分はバッチへ分割する
- `validateQuickOrderCode`と`quickOrderCodeRequirement`：注文コードの形式検査と，失敗時に表示する要件文
- `fillQuickOrder`：一括入力欄への入力までを行う
- `submitQuickOrder`：入力から送信までを行い，バスケットへの追加まで進める

```typescript
export interface CartExtractionResult {
  items: CartItem[];
  warnings: ExtractionWarning[];
  detectedCount: number | null;
}
```

```typescript
export interface ExtractionWarning {
  code: string;
  message: string;
  itemHint?: string;
}
```

### 12.2．実装方針

- サイト固有のCSSセレクタは各アダプター内だけに書く
- 共通UIからDOMセレクタを参照しない
- 1つのセレクタへ過度に依存しない
- 商品URL，data属性，商品コードなど比較的安定した情報を優先する
- 取得失敗時は警告を返し，取得できた商品は表示する
- 価格の数字を数量と誤認しない
- 同一商品の画像リンクと商品名リンクを二重計上しない
- MutationObserverの利用は必要最小限にする

---

## 13．秋月電子アダプター

### 13.1．対象URL

```text
https://akizukidenshi.com/catalog/cart/cart.aspx
https://www.akizukidenshi.com/catalog/cart/cart.aspx
```

ドメインの`www`有無に対応する．

### 13.2．通販コード

商品ページURLから6桁の通販コードを取得する．

```text
https://akizukidenshi.com/catalog/g/g105148/
```

正規表現例：

```javascript
/\/catalog\/g\/g(\d{6})(?:\/|[?#]|$)/
```

### 13.3．数量

数量入力欄を商品行単位で取得する．

判定の優先順位：

1. 商品行内の数量専用入力欄
2. `name`または`id`に`qty`，`quantity`を含む入力欄
3. ラベルや見出しが「数量」「個数」である入力欄
4. 上記が取れない場合は警告を返す

ページ全体から数値入力欄を無差別に取得してはならない．

### 13.4．商品名と価格

商品行内の表示から取得する．価格は次の処理を行う．

- `￥`，`,`，空白を除去する
- 税込と税別のどちらを取得したか分かる場合は内部メタ情報へ残す
- 判別できない場合は表示値をそのまま採用し，警告を付けない
- 小計が表示されていない場合は`unitPrice × quantity`で計算してよい
- 単価が取れない場合は`null`とする

### 13.5．一括注文

保存リストを秋月一括注文形式へ変換する．

「一括注文からバスケットへ自動追加」を押した場合は，先にテキストをコピーし，新しいタブでブランケットオーダー画面を開く．販売コードと数量の全行を秋月標準フォームの`regist_goods`へ渡し，まとめて買い物かごへ追加する．注文確定は操作しない．

### 13.6．検証条件

最低限，次のケースで正しく動作すること．

- 1商品のカート
- 複数商品のカート
- 数量が1以外の商品
- 同一商品の複数リンクが存在する画面
- 商品名に記号や改行がある
- 空のカート
- 任意項目を取得できない商品
- カート画面以外から読み取りを実行した場合
- `www`あり／なし

---

## 14．モノタロウアダプター

Phase 2として実装済み．`/basket/`のバスケットを読み取り，保存リストから`/quick-order/`へ10商品ずつ送信してバスケットへ復元する．注文コードは8桁の数字とする．

取得候補：

- 注文コード
- 商品名
- メーカー
- メーカー品番
- 数量
- 単価
- 小計
- 商品URL
- 出荷予定
- 在庫状態

注意事項：

- 個人・法人アカウントによる表示差
- 税込・税別表示
- 販売単位
- まとめ買い価格
- クーポンや値引き
- 非同期描画

クイックオーダー画面は注文コードと数量の10行入力であり，秋月の一括注文形式とは異なる．保存リストから自動追加を実行する場合は，利用者の明示操作後に入力内容と進行状態をブラウザ内へ一時保存する．10商品ごとにモノタロウ標準のクイックオーダー送信先へ送信し，11商品以上ではバスケット画面とクイックオーダー画面を自動で往復して全バッチを処理する．購入確定は操作せず，完了後に利用者がバスケットの内容を確認する．モノタロウ上の保存済みリストには，モノタロウ商品を含むリストだけを表示する．

---

## 15．ミスミアダプター

Phase 3として実装済み．ログイン済みの`/order/cart`を読み取り，保存リストから`/order/part-number/create`の一括入力を利用してカートへ復元する．

取得候補：

- ミスミ型番
- メーカー型番
- 商品名
- 数量
- 単価
- 小計
- 出荷日
- 商品URL
- 選定仕様

ミスミでは，寸法，材質，追加工などによって同一シリーズ内でも型番が変化する．商品名ではなく，最終確定したミスミ型番または明細識別子を主キーとする．

カートでは商品を選択するまで単価，小計，出荷日が表示されないため，読み取り時に全商品を選択し，非同期照会の完了を待つ．商品行以外のおすすめ商品は走査しない．取得する項目は，最終確定型番，メーカー名，商品名，販売単位，数量，単価，小計，出荷日，商品URL，画像URL，注意事項とする．

カート復元では「見積・注文」の「エクセルから一括コピー」へ型番，数量，メーカー名をタブ区切りで渡す．列指定，型番照会，カート追加の完了を順に待ち，カート画面へ移動した時点で終了する．注文または見積の確定操作は行わない．

---

## 16．重複処理

同一商品判定は原則として次を使用する．

```text
storeId + orderCode
```

同じキーの商品が複数存在する場合：

- 数量は合計する
- 商品名は空でない新しい値を優先する
- 単価が異なる場合は自動統合せず警告する
- 備考は改行で結合するか，利用者へ選択させる
- 商品URLは最初の有効なURLを保持する

サイト固有オプションで商品を区別する必要がある場合は，アダプター側で`id`へ識別子を追加する．

---

## 17．エクスポーター

次の関数を独立モジュールとして実装する．

```typescript
export function exportCsv(list: SavedList): string;
export function exportTsv(list: SavedList): string;
export function exportJson(list: SavedList): string;
export function exportMarkdown(list: SavedList): string;
export function exportPlainText(list: SavedList): string;
export function exportQuickOrder(
  list: SavedList,
  adapter: StoreAdapter
): string;
export function exportQuickOrderBatches(
  list: SavedList,
  adapter: StoreAdapter
): string[];
```

一括注文の出力は，アダプターの店舗の商品だけを対象とし，注文コードと数量を検証してから同一コードの数量を合算する．検証に失敗した行は`QuickOrderValidationError`へまとめて返し，出力前に一覧表示する．`exportQuickOrderBatches`は`quickOrderCapacity`の単位でバッチへ分割する．

ファイル保存処理と文字列生成処理は分離する．これにより単体テストしやすくする．

### 17.1．共有URL

保存リストを共有向けの小さいデータ形式へ変換して圧縮し，GitHub Pages上の共有画面URLのフラグメント`#cart2bom=`へ埋め込む．共有画面は静的なHTML，CSS，JavaScriptだけで構成し，リストをサーバーやデータベースへ保存しない．従来の保存リスト全体を埋め込んだ共有URLも読み込めるよう後方互換性を維持する．

共有画面はCart2BOM未導入のブラウザでも動作し，商品画像，通販コード・型番，メーカー，販売単位，数量，価格，備考，商品URL，合計金額を表示する．店舗と商品選択による絞り込み，平文コピー，CSV，TSV，JSON，Markdown出力，店舗別一括入力データのコピー，公式一括入力画面へのリンクを提供する．Cart2BOM導入済みの場合は，同じフラグメントを対応サイトへ引き継いでリストをインポートできるようにする．

秋月電子通商とミスミについては，入力データのコピーと公式一括入力画面への移動を単一の操作にまとめる．移動先でCart2BOMが動作している場合は，フラグメント内の店舗指定と共有データを検証し，既存の一括入力処理へ引き渡してバスケットへの追加まで進める．Cart2BOM未導入の場合は，事前にコピーしたデータを利用者が公式画面へ貼り付けられるようにする．

モノタロウは，注文コードと数量をまとめてコピーする操作と，公式のクイックオーダー画面`/quick-order/`を開く操作を用意する．一括貼り付け欄がない画面では，`q0`〜`q9`と`p0`〜`p9`へ順に貼り付ける前提で値を提示する．共有画面から店舗へ直接POSTは行わない．共有画面のCSPは`form-action 'none'`であり，外部サイトへのフォーム送信を許可しない．Cart2BOM導入済みの場合は，フラグメントを引き継いで自動入力へ進める．共有画面の右操作欄では，店舗注文を共有・ファイル出力より上に表示する．

受信したデータは既存の保存リストスキーマで検証する．URLを開いただけで保存，カート追加，注文確定を行ってはならない．共有画面は外部APIへ通信せず，商品画像は許可した公式サイトのHTTPS URLだけをリファラーなしで読み込む．

### 17.2．平文共有

チャットやメールへ貼り付けられるよう，リスト名，店舗，商品名，通販コード・型番，メーカー，数量，販売単位，単価，小計，備考，商品URL，合計金額を読みやすい平文として生成し，利用者の明示操作でクリップボードへコピーする．

---

## 18．セキュリティとプライバシー

### 18.1．基本方針

- 取得データはブラウザ内に保存する
- 外部サーバーへ送信しない
- ユーザー名，パスワード，Cookie，セッショントークンを取得しない
- 注文確定ボタンを操作しない
- 決済画面を解析しない
- 利用者の明示操作なしにカートへ商品を追加しない
- HTML文字列を表示するときはエスケープする
- `innerHTML`の利用を最小限にする
- 保存データのインポート時に型検証を行う

### 18.2．外部通信

MVPでは，UserScriptの更新確認を除き，Cart2BOM自身から外部通信を行わない．通販サイト内の別ページを自動巡回しない．

### 18.3．免責表示

設定画面またはREADMEに次の趣旨を記載する．

```text
Cart2BOMが表示する情報は，読み取り時点のページ内容に基づきます．
注文前に，通販サイト上の品番，数量，価格，納期を必ず確認してください．
```

---

## 19．エラー処理

### 対応サイトではない

```text
このサイトには対応していません．
```

### カートページではない

```text
買い物カゴのページを開いてから実行してください．
```

可能であれば「カートを開く」ボタンを表示する．

### カートが空

```text
カート内に商品がありません．
```

### 一部取得失敗

```text
12商品のうち10商品を取得しました．
取得できなかった2商品を確認してください．
```

取得済み商品は表示し，処理全体を中断しない．

### HTML変更の可能性

```text
商品情報を取得できませんでした．
通販サイトの画面構成が変更された可能性があります．
```

デバッグ情報をクリップボードへコピーするボタンを用意してよい．ただし，ページ本文全体や個人情報を含めない．

---

## 20．ログ

開発ビルドでは，次を`console.debug`へ出力する．

- アプリのバージョン
- 判定したアダプター
- カートページ判定
- 検出した商品ブロック数
- 抽出成功数
- 警告数
- エラーの種類

ログの接頭辞：

```text
[Cart2BOM]
```

本番ビルドでは詳細ログを無効化できるようにする．

---

## 21．技術構成

### 21.1．言語

- TypeScript
- HTML
- CSS

### 21.2．ビルド

- Node.js 20以降でビルドする
- esbuildでTypeScriptを1本のUserScriptへバンドルする
- 出力は`dist/cart2bom.user.js`．生成物をリポジトリへコミットし，`@downloadURL`から直接配布する
- 共有画面は別バンドルとし，`pages-dist/`へ出力する．こちらは生成物をコミットせず，GitHub Actionsが再生成する
- ソースマップは開発用（`npm run build:dev`）だけ生成する
- 依存関係のバージョンは`package-lock.json`で固定する
- esbuildは型を検査しないため，型検査は`tsc --noEmit`で別に実行する．`npm test`は型検査のあとに単体テストを実行する

### 21.3．テスト

- DOM解析：保存したHTML fixtureを使用する
- エクスポート：文字列比較
- ストレージ：メモリ上のモックを使用する
- UI：主要な状態遷移をテストする
- 実サイト確認：手動テストとして記録する

---

## 22．リポジトリ構成

```text
cart2bom/
├─ README.md
├─ LICENSE
├─ CLAUDE.md                     エージェント向けの作業ルール
├─ agent.md                      同上（Codex向け．ミスの記録の共有ログを含む）
├─ cart2bom_specification.md     本書
├─ akizuki_cart_bookmarklet.html 秋月用の試作．参考資料
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vitest.config.ts
├─ .github/
│  └─ workflows/
│     └─ pages.yml               テストと両ビルドの成功時だけPagesを更新する
├─ docs/
│  ├─ images/                    READMEの手順図（SVG）
│  ├─ manual-testing.md          手動テスト手順
│  └─ manual-test-results.md     実サイトでの確認記録
├─ src/
│  ├─ entry.user.ts
│  ├─ app.ts
│  ├─ globals.d.ts               ビルド時に定義する定数の型
│  ├─ core/
│  │  ├─ models.ts
│  │  ├─ validation.ts
│  │  ├─ list-service.ts
│  │  ├─ settings-service.ts
│  │  ├─ deduplicate.ts
│  │  ├─ totals.ts
│  │  ├─ share-url.ts
│  │  ├─ pending-quick-order.ts
│  │  └─ errors.ts
│  ├─ adapters/
│  │  ├─ adapter.ts
│  │  ├─ registry.ts
│  │  ├─ akizuki.ts
│  │  ├─ monotaro.ts
│  │  └─ misumi.ts
│  ├─ exporters/
│  │  ├─ columns.ts
│  │  ├─ csv.ts
│  │  ├─ tsv.ts
│  │  ├─ json.ts
│  │  ├─ markdown.ts
│  │  ├─ plain-text.ts
│  │  ├─ quick-order.ts
│  │  └─ download.ts
│  ├─ storage/
│  │  ├─ provider.ts
│  │  ├─ gm-storage.ts
│  │  └─ memory-storage.ts
│  ├─ ui/
│  │  ├─ styles.ts
│  │  ├─ floating-button.ts
│  │  ├─ main-menu.ts
│  │  ├─ modal.ts
│  │  ├─ cart-editor.ts
│  │  ├─ saved-lists.ts
│  │  ├─ settings.ts
│  │  ├─ import-dialog.ts
│  │  ├─ shared-list-dialog.ts
│  │  ├─ product-image.ts
│  │  └─ toast.ts
│  └─ viewer/                    GitHub Pages用．UserScriptとは別バンドル
│     ├─ main.ts
│     ├─ viewer.ts
│     ├─ styles.css
│     ├─ index.html              共有画面
│     ├─ install.html            インストール案内
│     └─ root.html               入口
├─ tests/
│  ├─ fixtures/                  匿名化した実カートHTML
│  ├─ adapters/
│  ├─ core/
│  ├─ exporters/
│  ├─ storage/
│  ├─ ui/
│  ├─ viewer/
│  └─ integration/
├─ scripts/
│  ├─ build.mjs                  UserScript
│  └─ build-pages.mjs            GitHub Pages
├─ dist/
│  └─ cart2bom.user.js           コミットする生成物
└─ pages-dist/                   生成物．gitignore対象
```

`src/viewer/`はGM APIのないブラウザで動くため，`src/storage/`と`src/app.ts`へ依存しない．共有する処理は`core/`，`exporters/`，`adapters/`，`ui/product-image.ts`に限る．

---

## 23．コーディング規約

- TypeScriptの厳格モードを有効にする
- `any`は原則使用しない
- DOM取得結果の`null`を必ず処理する
- 関数は1つの責務に限定する
- UI生成とDOM解析を分離する
- サイト固有文字列を共通モジュールへ置かない
- 日時はISO 8601文字列で保存する
- 金額は整数の円として保存する
- 商品数量は正の整数とする
- ユーザー入力を`innerHTML`へ直接代入しない
- 公開関数と主要な判定処理にはコメントを書く
- 複雑なCSSセレクタには対象要素の説明を付ける

---

## 24．テスト要件

### 24.1．単体テスト

最低限，次を自動テストする．

#### 秋月アダプター

- 通販コードをURLから取得できる
- 数量を正しく取得できる
- 価格を数量として誤認しない
- 同一商品の複数リンクを二重計上しない
- 商品名を取得できる
- 空のカートを処理できる
- 一部要素欠落時に警告を返す

#### エクスポート

- CSVのカンマをエスケープできる
- CSVのダブルクォートをエスケープできる
- CSVの改行をエスケープできる
- TSVのタブと改行を正規化できる
- JSONを再インポートできる
- 秋月一括注文形式が正しい
- 同一商品を数量合算できる

#### バリデーション

- 数量0を拒否する
- 小数数量を拒否する
- 不正な通販コードを拒否する
- 不正なJSONを拒否する
- 未知のスキーマバージョンを拒否する

### 24.2．手動テスト

手順は`docs/manual-testing.md`，実施結果は`docs/manual-test-results.md`へ記録する．

- Chrome＋Tampermonkey（確認済み）
- Edge＋Tampermonkey（未確認）
- Firefox＋Violentmonkey（未確認）
- 各店舗へログインしている状態
- 各店舗へログインしていない状態
- 商品数1件
- 商品数10件以上
- 数量変更後
- 保存，削除，複製
- JSONエクスポート／インポート
- 共有URLの発行と，Cart2BOM未導入ブラウザでの表示
- 一括入力によるカートへの復元

---

## 25．MVP完了条件

次の条件はすべて達成済みである．MVPは完了とし，本節は達成基準の記録として残す．

- UserScriptとしてインストールできる
- 秋月電子のページに固定ボタンが表示される
- 秋月のカートから通販コード，商品名，数量，URLを取得できる
- 読み取り結果を表で確認・編集できる
- 名前を付けてブラウザ内に保存できる
- 保存済みリストを再度開ける
- CSV，TSV，JSONを出力できる
- 秋月一括注文形式をコピーできる
- 一括注文ページを開ける
- JSONを再インポートできる
- 外部サーバーへ商品情報を送信しない
- 自動テストがすべて成功する
- READMEに導入方法と免責事項がある
- `dist/cart2bom.user.js`が生成される

---

## 26．実装順序

Step 1からStep 8まで実施済み．本節は実装の履歴として残す．新しい機能を追加するときは，同じ粒度（実装，単体テスト，型検査，ビルド，結果確認）で進める．

### Step 1：プロジェクト初期化

- TypeScriptプロジェクトを作成
- ビルドスクリプトを作成
- UserScriptヘッダーを付けて`dist/cart2bom.user.js`を生成
- 最小の固定ボタンを表示

完了条件：

```text
npm install
npm run build
```

でUserScriptが生成され，Tampermonkeyへインストールできる．

### Step 2：データモデルとストレージ

- `CartItem`
- `SavedList`
- `AppSettings`
- `StorageProvider`
- `GMStorageProvider`
- `MemoryStorageProvider`
- バリデーション
- 単体テスト

### Step 3：秋月アダプター

- カートページ判定
- 商品行検出
- 通販コード抽出
- 商品名抽出
- 数量抽出
- 価格抽出
- 警告生成
- fixtureによる単体テスト

実サイト固有のHTMLが不明な箇所は，推測でセレクタを増やし過ぎず，デバッグしやすい構造にする．

### Step 4：カート確認画面

- 読み取りボタン
- 編集可能な表
- 行削除
- バリデーション
- 保存

### Step 5：保存済みリスト

- 一覧
- 開く
- 複製
- 名前変更
- 削除

### Step 6：エクスポート

- CSV
- TSV
- JSON
- Markdown
- 秋月一括注文形式
- クリップボード
- ファイル保存

### Step 7：インポート

- JSONファイル
- JSONテキスト
- スキーマ検証
- 重複時確認

### Step 8：仕上げ

- 設定画面
- トースト通知
- エラー表示
- README
- LICENSE
- 手動テスト手順
- リリース用ビルド

---

## 27．エージェントへの実装指示

CodexとClaudeは，次の方針を守ること．日常の作業ルールは`agent.md`と`CLAUDE.md`にもまとめてある．

1. まずリポジトリ全体と本書の該当箇所を確認し，既存ファイルを不用意に削除しない．
2. 本仕様と既存コードが矛盾する場合は，本仕様を優先し，変更点をREADMEまたはコミット相当の説明へ記載する．
3. 一度に全機能を実装せず，前節のStep単位で進める．
4. 各Step完了時にビルドとテストを実行する．
5. 実サイトのDOMを確認できない場合は，アダプターのセレクタを設定しやすい構造にし，推測による大量のフォールバックを入れない．
6. 取得できない任意項目があっても，必須項目を取得できる限り商品を返す．
7. 失敗を無視せず，利用者向け警告と開発者向けログを分ける．
8. 外部送信，注文確定，ログイン情報取得を実装しない．
9. AkiBoostのソースコードを直接コピーしない．
10. 完了時に，実装した機能，未実装項目，既知の制限，テスト結果をまとめる．

---

## 28．初期実装時の作業指示例

以下は実施済みの指示である．同じ形式で新しい作業を切り出すときの雛形として残す．

```text
docs/specification.mdを読み，Cart2BOMのMVPを実装してください．

まずStep 1からStep 3までを実装してください．
TypeScriptでUserScriptを構築し，dist/cart2bom.user.jsを生成できるようにしてください．
秋月電子アダプターは保存したHTML fixtureで単体テスト可能な構造にしてください．

作業後は次を実行し，結果を報告してください．

- npm run build
- npm test
- 生成されたファイル一覧
- 実装済み機能
- 未実装機能
- 実サイト確認が必要な箇所

AkiBoostはUIと設計の参考にとどめ，コードはコピーしないでください．
```

次の指示例：

```text
Step 4からStep 6までを実装してください．

- カート読み取り結果の編集画面
- 名前付きリストの保存
- 保存済みリスト一覧
- CSV／TSV／JSON／秋月一括注文形式の出力
- クリップボードへのコピー
- ファイル保存

既存テストを壊さず，新機能の単体テストを追加してください．
```

---

## 29．Phase 2以降

### Phase 2：モノタロウ（完了）

- 実際のカートHTML構造を調査
- fixtureを作成
- モノタロウアダプターを実装
- 共通CSVへ変換
- 必要に応じて動的DOM更新へ対応

### Phase 3：ミスミ（完了）

- ミスミ型番と選定仕様の扱いを決定
- カートHTML構造を調査
- fixtureを作成
- ミスミアダプターを実装
- 公式アップロード形式への変換可否を確認

### Phase 4：複数店舗統合（未着手）

- 異なる店舗の商品を1リストへ追加
- 店舗別集計
- 店舗別出力
- 全店舗共通CSV
- 購入依頼書用Markdown

複数店舗の商品を1リストへ保持すること自体は，`CartItem.storeId`により現在のデータモデルで表現できる．未対応なのは，保存済みリストの表示を現在の店舗で絞り込んでいる点，および店舗別集計と店舗別出力をUserScript側へ用意していない点である．共有画面には店舗別件数と絞り込みが実装済みであり，これを参考にできる．

### Phase 5：BOM連携（未着手）

- KiCad BOMインポート
- メーカー型番による照合
- 未選定部品の抽出
- 購入数量と実装数量の差分
- 予備数の設定

---

## 30．ライセンス

公開する場合はMIT Licenseを候補とする．

第三者のコードを利用する場合は，利用前にライセンスを確認し，必要な著作権表示とライセンス文を含める．ライセンスが確認できないコードはコピーしない．

---

## 31．仮プロジェクト名

```text
Cart2BOM
```

説明文：

```text
複数通販サイトのカートを，保存・共有可能な部品リストへ変換するUserScript
```

---

## 32．実装状況と既知の制限

### 32.1．実装済み

- MVP（25．MVP完了条件のすべて）
- 秋月電子通商，モノタロウ，ミスミのカート読み取りと，一括入力によるカートへの復元
- 共有URL（17.1）と，GitHub Pages上の共有画面・インストール案内画面
- 平文共有（17.2），Markdown出力，合計金額の表示
- JSONインポート（ファイルとテキスト），破損データのバックアップ出力
- 表示テーマ（自動／ライト／ダーク）

### 32.2．未実装項目と既知の制限

- スキーママイグレーションは未実装である．`cart2bom.migrations`キーとマイグレーション関数の型は定義しているが適用処理がなく，`schemaVersion`が現行値と一致しないデータは検証で拒否する．スキーマを変更する場合は，先に適用処理を実装する
- `AppSettings.defaultExportFormat`は保存と検証の対象だが，設定画面にも出力処理にも接続していない．UIを用意するか，項目を削除するか決める必要がある
- `StoreAdapter.fillQuickOrder`はどのアダプターも実装しておらず，対応する分岐は現在使われていない
- 保存済みリストは現在表示している店舗で絞り込むため，複数店舗の商品を1画面で扱えない（Phase 4）
- CSVインポートは未実装である（8.8）
- 動作確認はChrome＋Tampermonkeyのみである．Edge＋TampermonkeyとFirefox＋Violentmonkeyは未確認である
- スマートフォンには対応しない（4）
- 共有URLは商品数に比例して長くなる．エンコード後100,000文字を超える場合は拒否する．長い場合は平文またはJSONファイルを使う
- 通販サイトのDOM変更で読み取りと復元が停止しうる．特にミスミは非同期描画と画面遷移が多く，過去の不具合も集中している．変更時は`agent.md`の「ミスの記録」を確認する
