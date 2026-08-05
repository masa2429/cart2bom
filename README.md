# Cart2BOM

Cart2BOMは、通販サイトのカートを保存・共有可能な部品リストへ変換するUserScriptです。MVPでは秋月電子通商に対応し、CSV、TSV、JSON、Markdown、秋月一括注文形式へ出力できます。

## 対応環境

- Chrome／Edge＋Tampermonkey
- Firefox＋Violentmonkey
- 秋月電子通商（`akizukidenshi.com`、`www.akizukidenshi.com`）

スマートフォン、モノタロウ、ミスミは現時点では未対応です。

## 開発とビルド

Node.js 20以降を用意し、次を実行します。

```sh
npm install
npm test
npm run build
```

配布用UserScriptが`dist/cart2bom.user.js`へ生成されます。開発用ソースマップが必要な場合は`npm run build:dev`を使用してください。

## インストール

1. TampermonkeyまたはViolentmonkeyをブラウザへインストールします。
2. [GitHub上のCart2BOM UserScript](https://raw.githubusercontent.com/masa2429/cart2bom/main/dist/cart2bom.user.js)を開いてインストールします。ローカル開発版を使う場合は、`dist/cart2bom.user.js`をUserScript管理画面へ読み込むこともできます。
3. インストールを確認し、秋月電子通商のページを再読み込みします。
4. 画面下部の「🛒 Cart2BOM」ボタンが表示されることを確認します。

GitHub版には`@updateURL`と`@downloadURL`が設定されています。今後のリリースでは`package.json`の`version`を上げてビルド・pushすると、Tampermonkey／Violentmonkeyの更新確認対象になります。更新確認の間隔と自動更新の可否はUserScriptマネージャー側の設定に従います。

## 使い方

1. 秋月電子通商の買い物カゴを開きます。
2. 「🛒 Cart2BOM」から「現在のカートを読み取る」を選びます。
3. 商品画像、商品名、メーカー名、メーカー型番、販売単位、数量、備考を確認・編集します。
4. リスト名、説明、タグを入力して保存します。
5. 「保存済みリスト」から、再編集、複製、名前変更、削除、各形式の出力を行います。

保存済みリストには商品画像と明細から算出した合計金額を表示します。価格を取得できない商品がある場合は、合計へ含めず対象商品数を併記します。

秋月一括注文画面を開く操作では、一括注文テキストを先にクリップボードへコピーします。開いた画面へ利用者自身で貼り付けてください。Cart2BOMは注文を確定しません。

JSONインポートは、Cart2BOMが出力したJSONファイルまたはJSONテキストに対応します。不正データと未知のスキーマバージョンは保存前に拒否します。

## 保存とプライバシー

- リストと設定はUserScriptマネージャーの`GM.getValue`／`GM.setValue`を通じてブラウザ内へ保存します。
- UserScriptの更新確認を除き、Cart2BOM自身は商品情報を外部サーバーへ送信しません。
- 商品画像は商品ページと同じホストのHTTPS画像だけを、リファラーを送信せず表示します。
- ユーザー名、パスワード、Cookie、セッショントークン、支払い情報を取得しません。
- 注文確定ボタンを操作しません。
- クリップボードへの書き込みとファイル保存は、対応するボタンを押した場合だけ行います。

## 免責事項

Cart2BOMが表示する情報は、読み取り時点のページ内容に基づきます。注文前に、通販サイト上の品番、数量、価格、納期を必ず確認してください。

## 既知の制限

- Chrome＋Tampermonkeyへ実インストールし、秋月電子通商のログイン済み実カート（商品12種類、数量合計53）で、読み取り、編集画面、保存、再表示を確認済みです。
- Edge＋TampermonkeyとFirefox＋Violentmonkey、および実ブラウザでのファイル出力、JSON再インポート、一括注文画面への貼り付けは未確認です。
- サイトの画面構成が変わると商品を抽出できない場合があります。
- モノタロウとミスミのファイルは将来実装用の空モジュールです。

## ドキュメント

- [仕様書](cart2bom_specification.md)
- [手動テスト手順](docs/manual-testing.md)
- [手動テスト結果](docs/manual-test-results.md)

## ライセンス

[MIT License](LICENSE)
