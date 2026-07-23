# 学生作品カタログ（Student Portfolio Site）

Google Form経由で集めた学生のバイブコーディング作品（単一HTMLファイル）を
一覧表示し、GitHub Pagesで公開するためのサイトです。

## 全体の仕組み

```
Google Form（ニックネーム / HTMLコード）
      ↓ 回答をCSVでダウンロード
responses.csv をリポジトリに配置してpush
      ↓ GitHub Actionsが自動実行
scripts/build.mjs が下記を生成
  ├─ apps/{id}.html        … 学生ごとの単一HTMLファイル
  ├─ thumbnails/{id}.png   … Playwrightで撮った静止画サムネイル
  └─ data/manifest.json    … 一覧ページ用メタデータ
      ↓
GitHub Pagesに自動デプロイ
```

**重要な設計判断**: 一覧ページ（index.html）では各作品の**静止画サムネイルのみ**を表示し、
実際のHTML/JSは個別ページ（app.html）内の`<iframe sandbox>`でのみ実行します。
学生のスクリプトを一覧画面で同時にライブ実行しないことで、重い処理や
無限ループ・音声自動再生などが一覧全体に影響しないようにしています。

## フォルダ構成

```
.
├── index.html                     一覧ページ本体。data/manifest.jsonを
│                                   fetchしてカード一覧を描画する（script.jsが担当）。
├── app.html                       個別作品の表示ページ。URLの?id=を見て
│                                   該当する apps/{id}.html を sandbox付き
│                                   iframeで開く。「一覧に戻る」「新しいタブで
│                                   開く」の導線もここにある。
├── style.css                      サイト全体のスタイル。配色・フォントは
│                                   冒頭の:root変数（--paper --ink --accent等）
│                                   で一括管理。「標本カタログ」がモチーフ。
├── script.js                      index.html用。manifest.jsonを読み込んで
│                                   カードDOMを組み立てるだけの小さなスクリプト。
│
├── scripts/
│   └── build.mjs                  ビルドの本体。responses.csvを読み込み、
│                                   ①学生ごとのHTMLをapps/に書き出し
│                                   ②Playwrightでレンダリングしてthumbnails/
│                                     にサムネイル画像を保存し
│                                   ③data/manifest.jsonにメタデータをまとめる
│                                   の3つを行うNode.jsスクリプト。
│
├── responses.csv                  ★実際のGoogle Form回答CSVをここに配置する
│                                   （Formの列名と scripts/build.mjs 冒頭の
│                                   NICKNAME_COLUMN / HTML_COLUMN を一致させる）。
├── sample-responses.csv           動作確認用のダミーCSV（3件のサンプル）。
│                                   本番運用には使わない。
│
├── apps/                          【生成物・git管理外】学生ごとの単一HTML
│                                   ファイルが id 順（001.html, 002.html…）
│                                   で入る。ビルドのたびに作り直される。
├── thumbnails/                    【生成物・git管理外】各作品のサムネイル
│                                   PNG画像（800x500）。
├── data/
│   └── manifest.json              【生成物・git管理外】id / nickname / title /
│                                   thumbnail / appUrl を持つ配列。index.htmlと
│                                   app.htmlの両方がこれを参照する「目次」。
│
├── .github/
│   └── workflows/
│       └── build-and-deploy.yml   responses.csv・scripts/・*.html/css/js の
│                                   変更をトリガーに、Node環境構築→Playwright
│                                   ブラウザ導入→npm run build→GitHub Pagesへの
│                                   デプロイまでを自動実行するワークフロー。
│
├── package.json                   依存関係（csv-parse, playwright）とnpm
│                                   スクリプト（build / serve）の定義。
├── .gitignore                     生成物（apps/thumbnails/manifest.json）と
│                                   node_modules、OS由来ファイルを除外。
└── CLAUDE.md                      Claude Codeでこのリポジトリを操作する際の
                                    ガイド（設計上の制約・注意点をまとめたもの）。
```

## 1. Google Formの準備

質問は2つだけでOKです（列名はそのまま`scripts/build.mjs`の設定と合わせてください）。

- **ニックネーム**（記述式）
- **HTMLコード**（記述式・段落、学生には「作成したHTMLファイルの中身を全部コピペしてください」と案内）

作品タイトルは学生に別途入力してもらう必要はありません。
提出されたHTMLの`<title>`タグから自動で抽出します
（`<title>`が無い場合は「ニックネームの作品」という名前になります）。

## 2. 回答CSVの配置

Googleフォームの「回答」タブ → スプレッドシートまたはCSVでダウンロードし、
このリポジトリ直下に **`responses.csv`** という名前で配置してpushしてください。

列名がフォームの質問文と一致している必要があります
（`scripts/build.mjs`冒頭の`NICKNAME_COLUMN` / `HTML_COLUMN`で変更可能）。

## 3. ローカルでの動作確認（任意）

```bash
npm install
npx playwright install --with-deps chromium
npm run build            # responses.csv を読み込んでビルド
npm run serve            # http://localhost:8080 で確認
```

動作確認用に `sample-responses.csv` というダミーデータを同梱しています。
試す場合は `node scripts/build.mjs sample-responses.csv` を実行してください。

## 4. GitHub Pagesの設定（初回のみ）

1. リポジトリの **Settings → Pages** を開く
2. **Source** を `GitHub Actions` に設定

これだけです。以降は `responses.csv` を更新してpushするたびに、
`.github/workflows/build-and-deploy.yml` が自動でビルド・再デプロイします。

## 5. 更新の流れ（毎回やること）

1. Googleフォームの回答CSVを再ダウンロード
2. `responses.csv` を上書きして`git commit && git push`
3. Actionsタブでビルドが成功したのを確認 → 数分後にサイトへ反映

## 既知の注意点

- 学生のHTMLに無限ループや過度に重い処理が含まれる場合、サムネイル生成が
  タイムアウトして真っ白な画像になることがあります（ビルド自体は止まりません）。
- `sandbox`属性には`allow-same-origin`を付けていません。これにより個別ページの
  localStorageは動作しますが、親ページや他学生の作品への干渉はできない設計です。
  もし学生アプリが外部API通信を行う場合、CORS設定によっては動かないことがあります。
