# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のガイドです。

## プロジェクト概要

大学の授業（バイブコーディング演習）で学生が作成した単一HTMLファイルを
一覧表示するポートフォリオサイト。Google Formの回答CSVを起点に、
GitHub Actions上でビルド・GitHub Pagesへ自動デプロイする構成。

詳細な仕組みと運用手順は `README.md` を参照。実装方針の背景（なぜこの
設計にしたか）は本ファイルの「設計上の重要な制約」を必ず読むこと。

## ディレクトリ構成

```
index.html          一覧ページ（data/manifest.jsonを読み込んでカード描画）
app.html             個別作品の表示ページ（sandbox付きiframeで実行）
style.css / script.js
scripts/build.mjs    CSV → apps/*.html, thumbnails/*.png, data/manifest.json を生成
package.json
.github/workflows/build-and-deploy.yml   CSV更新時の自動ビルド・デプロイ
responses.csv        実際のGoogle Form回答CSV（配置場所。gitに含む）
sample-responses.csv 動作確認用のダミーCSV
apps/ thumbnails/ data/manifest.json     生成物（.gitignore対象）
```

## よく使うコマンド

```bash
npm install                              # 依存関係インストール
npx playwright install --with-deps chromium   # サムネイル生成用ブラウザの取得（初回のみ）
npm run build                            # responses.csv を読み込んでビルド
node scripts/build.mjs sample-responses.csv   # サンプルデータでビルド（動作確認用）
npm run serve                            # http://localhost:8080 でローカル確認
```

ビルド後に `apps/`, `thumbnails/`, `data/manifest.json` が生成される。
これらは `.gitignore` 対象なので、通常はコミット不要（GitHub Actions上で
毎回生成してからPagesにデプロイする設計）。

## 設計上の重要な制約（変更時に必ず踏襲すること）

- **一覧ページ（index.html）では学生のHTML/JSを直接実行しない。**
  静止画サムネイル（`thumbnails/*.png`）のみを表示する。実行するのは
  `app.html`内の`<iframe sandbox="allow-scripts allow-forms allow-modals allow-popups">`
  のみ。`allow-same-origin`は意図的に付けていない（親ページや他学生の
  作品への干渉を防ぐため）。ここを緩める変更を行う場合は必ずユーザーに
  リスク（他ページへの干渉、cookie/storageアクセス）を説明すること。
- **作品タイトルはフォームで収集しない。** 提出されたHTMLの`<title>`タグ
  から`scripts/build.mjs`が自動抽出する（`extractTitle`関数）。無い場合は
  `${nickname}の作品`にフォールバックする。
- **CSVの列名は`scripts/build.mjs`冒頭の`NICKNAME_COLUMN` / `HTML_COLUMN`**
  で管理している。Google Formの質問文を変えた場合はここも合わせて変更する。
- **サムネイル生成は1件ずつtry/catchで囲み、失敗しても全体のビルドを
  止めない。** 学生の不正なHTML（無限ループ・重い処理等）が混ざる前提の
  設計なので、この耐性は削らない。
- **一覧サイト自体の技術スタックは素のHTML/CSS/JS**（React/Viteは使わない）。
  別プロジェクトの「Computer Workshop」授業教材とは技術的に独立させる方針。

## デザイン方針

「標本カタログ／図書館の索引カード」がモチーフ。各カードに`No.001`のような
スタンプ風ラベルを付けている。背景はオフホワイト、アクセントは暖色の
テラコッタ1色のみとし、派手な多色使いは避けてシンプルに保つ（2026-07に
配色・フォントを調整）。フォントは丸ゴシックの「Zen Maru Gothic」だと
可愛くなりすぎたため、より中立的な「Zen Kaku Gothic New」に変更。
配色・フォントは`style.css`冒頭の`:root`変数（`--paper` `--card` `--ink`
`--ink-soft` `--accent` `--line` 等）で管理。`app.html`は`style.css`を
読み込まず独自の`<style>`内に同じ変数を重複定義しているため、配色・
フォントを変更する場合は両方に反映すること。このトーンを崩さないよう、
新規UIを追加する際は既存の変数を使うこと。

## GitHub Actions / デプロイ

`.github/workflows/build-and-deploy.yml`は`responses.csv`, `scripts/**`,
`*.html/css/js`の変更をトリガーに、Node環境構築 → Playwrightブラウザ
インストール → `npm run build` → `actions/deploy-pages`でPagesへ公開する
標準的な2ジョブ構成（build → deploy）。ジョブを分割・改名する場合は
`needs:`と`environment.url`の参照（`steps.deployment.outputs.page_url`）
がdeployジョブ側にあることを崩さないこと。

## 既知の制約・注意点

- このリポジトリの開発環境（Claude Codeの実行環境）によっては、
  Playwrightのブラウザバイナリのダウンロード先ドメインがネットワーク
  許可リストに含まれておらず、`npx playwright install`が失敗することがある。
  その場合はCSVパース・manifest生成部分のみ手動でNode実行して動作確認し、
  実際のスクリーンショット生成はGitHub Actions上の実行結果で確認する。
- 学生アプリが外部APIをfetchする場合、`allow-same-origin`なしのsandbox
  だとCORSやfetchの挙動で問題が出ることがある。個別に相談されたら
  `sandbox`属性の調整を検討する（安易に`allow-same-origin`を足さない）。
