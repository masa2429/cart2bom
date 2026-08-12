# Cart2BOM

## 概要

通販サイトのカートを、保存して共有できる部品リストに変換する UserScript。
秋月電子通商、モノタロウ、ミスミに対応していて、カートを読み取って名前を付けて保存し、URL ひとつで人に渡せる。
外部サーバーは使わない。ブラウザの中だけで完結する。

## 背景

発注をお願いするとき、いままではこんな感じでチャットに貼っていた。

```text
電線対基板用コネクタ 2.5mmピッチターミナル 100個入 ×1 https://www.monotaro.com/p/7594/0374/
電線対基板用コネクタ 2.5mmハウジング 3ピン 10個入 ×3
https://www.monotaro.com/p/0856/0666/
はんだ熱収縮チューブ(赤)10本入り ×1
https://www.monotaro.com/p/7410/9246/?t.q=はんだ熱収縮
アルミ角管 10×30×2000 ×1本
https://www.monotaro.com/p/4781/2670/
```

これで伝わるには伝わる。ただ、部品を選ぶ側にも発注する側にも手作業が残る。

部品を選ぶ側：

- 商品ページを一つずつ開いて、名前と URL をコピペする
- 数量の書き方をその場で決める（「×1」「×3」「×1本」と毎回揺れる）

発注する側：

- URL を順に開いて、カートに入れ直す
- 「100個入 ×1」が 100 個なのか 1 パックなのか推測する
- 金額の合計を自分で出す

## 何ができるか

### 部品を選ぶ側

さっきの4点をモノタロウのカートに入れて、画面右下の「Cart2BOM」から「現在のカートを読み取る」を押す。

<!-- 画像は wiki に添付してパスを差し替える -->
![Cart2BOMのメニュー](images/cart2bom-menu.png)

これだけで、通販コード、メーカー型番、販売単位、単価まで入った一覧になる。
名前と URL のコピペはもう要らない。
販売単位「1パック(100個)」と数量「1」は別の欄なので、「100個入 ×1」をどう書くかで悩むこともない。
数量はこの画面で直せて、合計もその場で変わる。

![カート読み取りの確認画面](images/cart2bom-read-result.png)

名前を付けて保存したら、「出力」から「共有URLをコピー」してチャットに貼る。それだけ。

![保存済みリストの出力メニュー](images/cart2bom-export-menu.png)

### 発注する側

届くのは [この URL](https://masa2429.github.io/cart2bom/share/#cart2bom=g.H4sIAAAAAAAACqWTXWsTQRSG_8pyrlKYzc7Mfu-lRfBCUWq9CrkoJtSUbBJsNIII6Q7SktCGarGilWAkVkhsoxH6YTQ_5rCb9F_IbAxiL1IlFzuwzJlz3veZd57CY_AYgQJ4gKKFYgeDIYrPGHzEoINigGJL4ZRbKnVUxhTOPcMGAhnwAAiUwUulCeTAS6XALxaK5ZWHRSCXWwEB23QNqtsGEIj229FBNy7pohAYHGNwlvCL-eyTBSBgMtO9c235JhC4ePt9dPImPP4ZNs-jd8PR3icM-ii24yNDhSdN30exJ5uIDSUeN0DRRFFD0VFkIyDAUOxOxiQYpWG1vgCEEdt14w8elMuldU_TKpVKcuogeb_oayVNatakaA3-1K2Vkjl_ZTW7rv5Vfev3j66Vcpqfy2TyWU0WTH2rXKcGoyrlybXSKpDCo3yeQPjjZbTfDjfPx9snQADS5AqM1DEtalnWP2CkJlOp_v8URSO-_FMUfQx6iuxzmeIEok645RKH2jMhSsWalDwHxKnrGCI15oVoG4y63JAQF-_dXb69lJjAQ7GFYiDh3bjOdaouscX4fEOiENXweRuD2sXrr1HvW1Q9DBs7o9MjFBso2nHuXklM41Y9wWh00I1TxqjrTJaZOTMY1aSgeXIWe9JtlTPGqTUvIsN2GLdsKnPW742_1GI23djnJgYfJuGQhk1DPjIMWig6KJrhWX98-GJ09F7uhdW6pMAN15kssyjIkZqcOQeFqWyV64zyK4OSfvYLLRfdAAAFAAA) が1本だけ。
開けば、Cart2BOM を入れていないブラウザでも、画像付きの一覧と合計金額が見える。
合計を自分で出す必要はない。

注文するときは、共有画面の「店舗で注文する」で注文コードと数量をコピーして、公式のクイックオーダーに貼る。
URL を一つずつ開いて入れ直さなくていい。
発注する側も Cart2BOM を入れていれば、バスケットへの追加まで自動で進む。
記録用には CSV も落とせる。

URL を貼りたくない場面では、「平文をコピー」でこういう文章にもできる。

```text
モノタロウカート 2026-08-11 22:47

【モノタロウ】
1. 電線対基板用コネクタ 2.5mmピッチ ターミナル 5159
   通販コード・型番: 75940374
   メーカー: 日本モレックス(molex) / メーカー型番: 5159PBTL
   数量: 1 / 販売単位: 1パック(100個)
   単価: 799円 / 小計: 799円
   https://www.monotaro.com/p/7594/0374/
（2〜4件目は省略）

合計 5,202円
```

### もう一度買うとき

モノタロウを開いて、保存済みリストの「バスケットへ追加」を押す。
それでカートに戻る。

自動で進むのはカートに入れるところまでで、注文や見積の確定は押さない。
リストは店舗ごとに作る。

## 導入

PC 版 Chrome に [Tampermonkey](https://www.tampermonkey.net/) を入れて、[インストールページ](https://masa2429.github.io/cart2bom/install/) から Cart2BOM を追加する。
対応サイトを開き直すと、右下にボタンが出る。
スマホは非対応。

## 注意事項

共有 URL は、リストの中身を圧縮して URL 自体に埋め込んでいる。
つまり、URL を知っている人は誰でも中身を読める。

リストはブラウザの中にしか保存されない。

カートに戻したら、注文前に型番、数量、価格、納期を自分の目で確認する。
価格も在庫も、読み取った時点から動く。

## 参考

- [README](https://github.com/masa2429/cart2bom)（詳しい使い方と免責事項）
- [共有画面](https://masa2429.github.io/cart2bom/share/)
- 動作がおかしいときはページを再読み込みし、直らなければ [Issues](https://github.com/masa2429/cart2bom/issues) へ

<!--
ここから下は、うちの運用に合わせて書き換える。

## うちでの決めごと

- 発注担当：
- 発注の締め切り：
- リスト名の付け方：
- 予算コードとの対応：
-->
