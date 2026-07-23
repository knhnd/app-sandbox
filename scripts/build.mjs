// scripts/build.mjs
//
// Google Form の回答CSV（ニックネーム, HTMLコード）を読み込み、
//   1. apps/{id}.html        … 学生ごとの単一HTMLファイル
//   2. thumbnails/{id}.png   … Playwrightでレンダリングしたサムネイル画像
//   3. data/manifest.json    … 一覧ページが読み込むメタデータ
// を生成します。
//
// 使い方: node scripts/build.mjs [CSVファイルパス]
//   （省略時は ./responses.csv を使用）

import { parse } from "csv-parse/sync";
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const CSV_PATH = process.argv[2] ?? "responses.csv";

// Google Form の質問タイトルに合わせて変更してください
const NICKNAME_COLUMN = "ニックネーム";
const HTML_COLUMN = "HTMLコード";

const APPS_DIR = "apps";
const THUMBS_DIR = "thumbnails";
const MANIFEST_PATH = "data/manifest.json";

const THUMB_VIEWPORT = { width: 800, height: 500 };
const RENDER_TIMEOUT_MS = 8000;

function extractTitle(html, fallback) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m && m[1].trim()) return m[1].trim();
  return fallback;
}

function padId(n) {
  return String(n).padStart(3, "0");
}

async function ensureDirs() {
  await fs.mkdir(APPS_DIR, { recursive: true });
  await fs.mkdir(THUMBS_DIR, { recursive: true });
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
}

async function renderThumbnail(browser, htmlPath, thumbPath) {
  const context = await browser.newContext({ viewport: THUMB_VIEWPORT });
  const page = await context.newPage();

  // alert/confirm/prompt でビルドが止まらないよう自動で閉じる
  page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));

  try {
    await page.goto("file://" + path.resolve(htmlPath), {
      waitUntil: "networkidle",
      timeout: RENDER_TIMEOUT_MS,
    });
  } catch {
    // networkidleにならない（常時通信するアプリ等）場合も、
    // タイムアウト時点の画面をそのままスクショする
  }

  try {
    await page.screenshot({ path: thumbPath });
  } catch (err) {
    console.warn(`  ⚠ サムネイル生成に失敗: ${thumbPath} (${err.message})`);
  } finally {
    await context.close();
  }
}

async function main() {
  await ensureDirs();

  const csvRaw = await fs.readFile(CSV_PATH, "utf-8");
  const rows = parse(csvRaw, { columns: true, skip_empty_lines: true });

  console.log(`${rows.length}件の回答を処理します...`);

  const browser = await chromium.launch();
  const manifest = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nickname = (row[NICKNAME_COLUMN] ?? "").trim() || "名無し";
    const html = (row[HTML_COLUMN] ?? "").trim();

    if (!html) {
      console.warn(`  ⚠ ${i + 1}行目: HTMLが空のためスキップ`);
      continue;
    }

    const id = padId(i + 1);
    const title = extractTitle(html, `${nickname}の作品`);

    const htmlPath = path.join(APPS_DIR, `${id}.html`);
    const thumbPath = path.join(THUMBS_DIR, `${id}.png`);

    await fs.writeFile(htmlPath, html, "utf-8");
    console.log(`  [${id}] ${nickname} - ${title}`);

    await renderThumbnail(browser, htmlPath, thumbPath);

    manifest.push({
      id,
      nickname,
      title,
      thumbnail: `${THUMBS_DIR}/${id}.png`,
      appUrl: `apps/${id}.html`,
    });
  }

  await browser.close();

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`\n完了: ${manifest.length}件を ${MANIFEST_PATH} に書き出しました。`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
