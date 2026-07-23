# LINEスタンプ索引

所有するLINEスタンプ240個（A〜F各40個）を、50音順・リアルタイム検索で確認する静的Webアプリです。一覧はスタンプ画像、セットのtab画像、番号チップだけに絞り、詳細ではセット内の1〜40配置と関連スタンプを表示します。

PWA対応済みです。スマートフォンではブラウザの「ホーム画面に追加」からアプリとして利用できます。

公開URL: <https://gue1971.github.io/line-stamp-index/>

## 起動

```sh
python3 -m http.server 4173
```

ブラウザで `http://localhost:4173/` を開いてください。`file://` ではJSONを読み込めないため、ローカルサーバーが必要です。

## 制作元から再同期

同階層に `../line-stampmaker` がある状態で実行します。制作元は読み取りのみで、こちらの `data/` と `assets/` を更新します。

```sh
node scripts/sync-stickers.mjs
node tests/validate.mjs
```

検証のみの場合は `node scripts/sync-stickers.mjs --check` を使います。

画像の採用元は、制作レポートに従いA/B/Cのfinal v1、D/Eのreupload v2、Fのpackage版です。スタンプ240枚に加えて、セット選択の目印となるA〜Fの `tab.png` も同期します。`main.png` はコピーしません。

## データ出典について

指定された `docs/sticker-series-plan.csv` は現在A〜Cの120件のみです。そのため同期スクリプトはA〜Cを同CSVから読み、D/Eを `docs/d-f-production-plan.md`、Fの最終キャラクター割り振りを `docs/f-set-assignment-plan.md` から補完します。制作ログで確定した文言変更（D01「きつい」、E39「またね」）も反映します。将来CSVが240件へ統合された場合は、同期スクリプトの入力部分をCSV一本へ切り替えてください。

読み仮名と用途タグは索引用として同期スクリプト内で明示的に管理・補完しています。検索ではUnicode正規化、ひらがな／カタカナ、全角／半角、空白、句読点、記号、長音の差を吸収します。
