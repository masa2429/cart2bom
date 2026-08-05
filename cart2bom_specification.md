# Cart2BOM 仕様書

- 文書バージョン：0.2
- 実装方式：UserScript
- 初期対応：秋月電子通商
- 将来対応：モノタロウ，ミスミ
- 想定実行環境：Tampermonkey／Violentmonkey，Chrome／Edge／Firefox
- 開発方針：AkiBoostの操作感を参考にするが，コードは独自実装する

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

UserScriptヘッダーの例：

```javascript
// ==UserScript==
// @name         Cart2BOM
// @namespace    cart2bom
// @version      0.2.2
// @author       morita_masato
// @description  通販サイトのカートを保存・共有・再利用します
// @match        https://akizukidenshi.com/*
// @match        https://www.akizukidenshi.com/*
// @match        https://www.monotaro.com/*
// @match        https://jp.misumi-ec.com/*
// @run-at       document-idle
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.download
// @grant        GM_info
// @updateURL    https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js
// @downloadURL  https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js
// ==/UserScript==
```

不要な権限は付与しない．実装上不要であれば`GM.download`も削除する．

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

- 秋月電子通商

### 7.2．Phase 2

- モノタロウ

### 7.3．Phase 3

- ミスミ

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

表示列：

- 選択
- 通販コード
- 商品名
- 商品画像
- メーカー名
- メーカー型番
- 販売単位
- 数量
- 単価
- 小計
- 備考
- 商品ページ

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

保存済みリスト画面で，次の操作を行える．

- 開く
- 名前変更
- 複製
- 削除
- CSV出力
- TSV出力
- JSON出力
- 秋月一括注文形式をコピー
- 秋月一括注文画面を開く

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
}
```

---

## 11．保存方式

UserScriptの`GM.getValue`と`GM.setValue`を利用する．

保存キー：

```text
cart2bom.settings
cart2bom.lists
cart2bom.migrations
```

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

  matches(url: URL): boolean;
  isCartPage(url: URL, document: Document): boolean;
  getCartUrl(): string | null;

  extractCart(document: Document): CartExtractionResult;
  createQuickOrderText?(items: CartItem[]): string;
  getQuickOrderUrl?(): string | null;
}
```

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

「一括注文ページを開く」を押した場合は，先にテキストをコピーし，新しいタブで一括注文ページを開く．URLへ大量の商品を直接埋め込む方式は，URL長制限があるためMVPでは必須としない．

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

Phase 2で実装する．MVPでは型定義と空のアダプターファイルだけ用意してよい．

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

クイックオーダー画面は注文コードと数量の10行入力であり，秋月の一括注文形式とは異なる．保存リストから開く場合は，利用者の明示操作後に入力内容をブラウザ内へ一時保存し，新しいクイックオーダー画面へ1行ずつ入力する．11商品以上は10商品ごとのバッチを利用者が選択する．「バスケットに入れる」ボタンは操作せず，利用者が各バッチの内容を確認して実行する．モノタロウ上の保存済みリストには，モノタロウ商品を含むリストだけを表示する．

---

## 15．ミスミアダプター

Phase 3で実装する．MVPでは型定義と空のアダプターファイルだけ用意してよい．

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
export function exportQuickOrder(
  list: SavedList,
  adapter: StoreAdapter
): string;
```

ファイル保存処理と文字列生成処理は分離する．これにより単体テストしやすくする．

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

- Node.js環境でビルドする
- TypeScriptを1本のUserScriptへバンドルする
- 出力は`dist/cart2bom.user.js`
- ソースマップは開発用だけ生成する
- 依存関係のバージョンはロックファイルで固定する

特定のビルドツールへ強く依存しない．Codexは，構成が簡潔で保守しやすいツールを選定してよい．

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
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ docs/
│  └─ specification.md
├─ src/
│  ├─ entry.user.ts
│  ├─ app.ts
│  ├─ core/
│  │  ├─ models.ts
│  │  ├─ validation.ts
│  │  ├─ storage.ts
│  │  ├─ list-service.ts
│  │  ├─ deduplicate.ts
│  │  └─ errors.ts
│  ├─ adapters/
│  │  ├─ adapter.ts
│  │  ├─ registry.ts
│  │  ├─ akizuki.ts
│  │  ├─ monotaro.ts
│  │  └─ misumi.ts
│  ├─ exporters/
│  │  ├─ csv.ts
│  │  ├─ tsv.ts
│  │  ├─ json.ts
│  │  ├─ markdown.ts
│  │  └─ quick-order.ts
│  ├─ storage/
│  │  ├─ provider.ts
│  │  ├─ gm-storage.ts
│  │  └─ memory-storage.ts
│  └─ ui/
│     ├─ styles.ts
│     ├─ floating-button.ts
│     ├─ menu.ts
│     ├─ cart-editor.ts
│     ├─ saved-lists.ts
│     ├─ settings.ts
│     ├─ modal.ts
│     └─ toast.ts
├─ tests/
│  ├─ fixtures/
│  │  └─ akizuki-cart.html
│  ├─ adapters/
│  │  └─ akizuki.test.ts
│  ├─ exporters/
│  │  ├─ csv.test.ts
│  │  └─ quick-order.test.ts
│  └─ core/
│     ├─ deduplicate.test.ts
│     └─ validation.test.ts
├─ scripts/
│  └─ build.mjs
└─ dist/
   └─ cart2bom.user.js
```

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

- Chrome＋Tampermonkey
- Edge＋Tampermonkey
- Firefox＋Violentmonkey
- 秋月へログインしている状態
- 秋月へログインしていない状態
- 商品数1件
- 商品数10件以上
- 数量変更後
- 保存，削除，複製
- JSONエクスポート／インポート
- 一括注文テキストの貼り付け

---

## 25．MVP完了条件

次の条件をすべて満たしたとき，MVP完了とする．

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

Codexは，次の順序で実装する．各段階でテストを通してから次へ進む．

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

## 27．Codexへの実装指示

Codexは，次の方針を守ること．

1. まずリポジトリ全体を確認し，既存ファイルを不用意に削除しない．
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

## 28．Codexへ最初に渡す作業指示例

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

### Phase 2：モノタロウ

- 実際のカートHTML構造を調査
- fixtureを作成
- モノタロウアダプターを実装
- 共通CSVへ変換
- 必要に応じて動的DOM更新へ対応

### Phase 3：ミスミ

- ミスミ型番と選定仕様の扱いを決定
- カートHTML構造を調査
- fixtureを作成
- ミスミアダプターを実装
- 公式アップロード形式への変換可否を確認

### Phase 4：複数店舗統合

- 異なる店舗の商品を1リストへ追加
- 店舗別集計
- 店舗別出力
- 全店舗共通CSV
- 購入依頼書用Markdown

### Phase 5：BOM連携

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
