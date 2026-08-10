# Cart2BOM

秋月電子通商・モノタロウ・ミスミのカートを、保存・編集・共有・カート復元できる部品リストへ変換するUserScript。
配布物は単一の`dist/cart2bom.user.js`（Tampermonkey）と、GitHub Pages上の共有ビューア。

Step 1〜8の初期実装は完了済み。現在は機能追加・改善・保守の段階にある。

## プロジェクト構造

- `src/adapters/` — 店舗別アダプター（`akizuki` / `monotaro` / `misumi`）と`registry`。サイト固有のDOMセレクタはここだけに書く
- `src/core/` — モデル、バリデーション、リスト操作、共有URL、合計計算、重複処理。DOMにもGM APIにも依存しない
- `src/exporters/` — CSV／TSV／JSON／Markdown／平文／一括注文テキストの生成と、コピー・ダウンロード
- `src/storage/` — `StorageProvider`境界。GM APIへの依存は`gm-storage.ts`に閉じる
- `src/ui/` — UserScript側の画面（固定ボタン、メニュー、モーダル、カート確認、保存済みリスト、設定、トースト、テーマ）
- `src/viewer/` — GitHub Pages用の共有ビューア。UserScriptとは**別バンドル**
- `src/app.ts` — 起動と画面遷移の配線。`src/entry.user.ts`がUserScriptのエントリ
- `tests/` — Vitest。`tests/fixtures/`に匿名化した実カートHTMLを置く
- `scripts/` — `build.mjs`（UserScript）と`build-pages.mjs`（Pages）
- `dist/cart2bom.user.js` — 配布用生成物。**リポジトリにコミットする**（`@downloadURL`が直接参照するため）
- `pages-dist/` — Pages用生成物。gitignore対象。CIが再生成する
- `cart2bom_specification.md` — 正式な仕様書。実装判断の基準
- `agent.md` — Codex向けの指示書。**ミスの記録の共有ログもここにある**
- `docs/manual-test-results.md` — 実サイトでの手動確認の記録
- `akizuki_cart_bookmarklet.html` — 秋月用の試作。挙動の参考資料であり、変更もコピーもしない

## 重要ルール

- 実装前に`cart2bom_specification.md`の該当箇所を読む。仕様と既存コードが矛盾する場合は仕様を優先し、変更理由をREADMEか作業報告に残す
- 外部サーバーへの商品情報送信、注文・見積の確定、決済画面の解析、Cookie・セッション・ログイン情報の取得は実装しない。アクセス解析コードも入れない
- 店舗固有のDOMセレクタを`core/`・`ui/`・`exporters/`から参照しない。アダプター境界（`src/adapters/adapter.ts`）の外へ漏らさない
- `src/viewer/`から`src/storage/`や`src/app.ts`をimportしない。ビューアはGM APIのない素のブラウザで動く
- `dist/cart2bom.user.js`を直接編集しない。ビルドで生成する
- 実サイトのDOMを確認できない箇所に、推測のフォールバックを積み増さない。fixtureと利用者向け警告で検証可能な形にする
- ユーザーの未コミット変更を保持し、既存ファイルを不用意に削除・上書きしない

## 技術スタック（厳守）

- TypeScript strict（`noUncheckedIndexedAccess`・`exactOptionalPropertyTypes`も有効）。`any`は原則禁止
- esbuildで単一IIFEへバンドル。ターゲットはChrome/Edge/Firefox 100+
- Vitest + jsdom。DOMテストは保存済みHTML fixture、ストレージテストは`memory-storage`を使う
- Node.js 20以降とnpm。依存バージョンは`package-lock.json`で固定する
- 金額は整数の円、数量は正の整数、日時はISO 8601文字列
- 新しい依存パッケージを勝手に追加しない。必要ならユーザーに確認する

## ビルドと実行

- 依存導入: `npm install`
- テスト: `npm test`（型検査 → Vitest の順に実行する）
- 型検査のみ: `npm run typecheck` — **esbuildは型を検査しない**ので、型の確認はここでしか行われない
- UserScriptビルド: `npm run build`（ソースマップ付きは`npm run build:dev`）
- Pagesビルド: `npm run build:pages`
- 両方: `npm run build:all`
- リリース時は`package.json`の`version`を上げてから`npm run build:all`を実行する。バージョンはUserScriptヘッダーとPagesのHTMLへ埋め込まれる
- 実サイトでの確認が必要な場合は、コードを書く前にユーザーへ確認環境の有無を尋ねる。結果は`docs/manual-test-results.md`へ追記する

## Git

- Conventional Commits形式、説明は日本語
- 形式: `type(scope): 日本語の説明`（例: `fix(misumi): 列割り当て画面の待機を追加`）
- 意味のある最小単位でコミットする。アダプター、エクスポーター、UI機能、バグ修正、文書更新を混ぜない
- テストまたはビルドが失敗した状態でコミットしない
- 著者・コミッターはリポジトリ設定のユーザー名義を使う。`Co-authored-by`などの共著トレーラーを付けない

## 実装ルール

- 1機能ごとに、実装・単体テスト・型検査・ビルドまでを完了させてから次へ進む
- 「ビルドが通った」は動作確認ではない。自動テストの結果と、実サイトでの未確認事項を分けて報告する
- ユーザー入力を`innerHTML`へ代入しない。DOM APIと`textContent`を使う
- 取得できない任意項目は`null`または空文字にし、必須項目が取れている商品まで捨てない
- 部分的な抽出失敗は、取得済み商品と利用者向け警告を返す。開発者向け詳細は`[Cart2BOM]`接頭辞のログへ分ける
- クリップボード書き込み、ファイル保存、ページ遷移、カートへの追加は、利用者の明示操作時だけ行う
- 破損した保存データを勝手に削除しない。バックアップJSONを出力できる状態を保つ
- 公開関数と複雑なセレクタには、理由が分かる簡潔なコメントを付ける

## ミスの記録

失敗の記録は`agent.md`の「ミスの記録」に集約する（CodexとClaudeで同じログを読む）。
同種の失敗を繰り返さないため、原因が判明した時点で`YYYY-MM-DD ／ 症状 ／ 原因 ／ 対策`の書式で追記する。
