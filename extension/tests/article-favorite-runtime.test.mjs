import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildArticleSourceKey,
  normalizeFavoriteArticle,
} from "../shared/article-favorite.js";
import {
  extractOpusId,
  isActionSyncPageUrl,
  isArticleUiUrl,
} from "../utils/bili-action-sync.js";
import { runBackgroundScenario } from "./helpers/background-runtime-harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const articleUrls = [
  "https://www.bilibili.com/opus/463389081041541660/?from=readlist",
  "https://www.bilibili.com/opus/1230104343281139717",
  "https://www.bilibili.com/opus/1171849743365570560?spm_id_from=333.1387.0.0",
  "https://www.bilibili.com/read/cv328714",
];
const expectedOpusIds = [
  "463389081041541660",
  "1230104343281139717",
  "1171849743365570560",
  "328714",
];

test("article URLs are recognized and preserve the opus id", () => {
  for (const [index, url] of articleUrls.entries()) {
    assert.equal(isArticleUiUrl(url), true);
    assert.equal(isActionSyncPageUrl(url), true);
    assert.equal(extractOpusId(url), expectedOpusIds[index]);
  }
  assert.equal(buildArticleSourceKey("1230104343281139717"), "opus:1230104343281139717");
});

test("article normalization creates a stable source key and safe source URL", () => {
  const article = normalizeFavoriteArticle({
    opusId: "1230104343281139717",
    title: "A saved column",
    summary: "Short summary",
    sourceUrl: articleUrls[1],
    authorName: "Author",
  }, 1700000000000);

  assert.equal(article.sourceKey, "opus:1230104343281139717");
  assert.equal(article.opusId, "1230104343281139717");
  assert.equal(article.savedAt, 1700000000000);
  assert.equal(article.sourceUrl, articleUrls[1]);
});

test("article favorites round-trip through JSON export and import", () => {
  const result = runBackgroundScenario({
    exports: [
      "buildJsonExportResult",
      "parseImportRows",
      "applyImportRowsToState",
    ],
    scenarioSource: `
      const emptyState = () => ({
        counters: { folder: 1, articleFolder: 1, video: 1, folderItem: 1, tag: 1, videoTag: 1, comment: 1, article: 1 },
        folders: [], articleFolders: [], videos: [], folderItems: [], tags: [], videoTags: [],
        followedUps: [], comments: [], articles: [], syncMeta: {}, ai: {},
      });
      const source = emptyState();
      source.articleFolders.push({
        id: 2,
        name: "Columns",
        description: null,
        sortOrder: 1,
        deletedAt: null,
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      });
      source.followedUps.push({
        uid: 42,
        name: "Author",
        avatarUrl: "https://i0.hdslb.com/avatar.jpg",
        spaceUrl: "https://space.bilibili.com/42",
        sortOrder: 0,
        importedAt: 1700000000000,
        updatedAt: 1700000000000,
      });
      source.articles.push({
        id: 7,
        sourceKey: "opus:1230104343281139717",
        opusId: "1230104343281139717",
        title: "A saved column",
        summary: "Short summary",
        content: "Full article content",
        coverUrl: "https://i0.hdslb.com/cover.jpg",
        authorName: "Author",
        authorMid: "42",
        authorAvatarUrl: "https://i0.hdslb.com/avatar.jpg",
        sourceUrl: "https://www.bilibili.com/opus/1230104343281139717",
        folderIds: [2],
        savedAt: 1700000000000,
        updatedAt: 1700000000000,
      });
      const exported = buildJsonExportResult(source);
      const parsed = parseImportRows("json", exported.content);
      const target = emptyState();
      const summary = applyImportRowsToState(
        target,
        parsed.rows,
        parsed.skipped,
        parsed.comments,
        parsed.commentsSkipped,
        parsed.articles,
        parsed.followedUps,
      );
      return {
        exportSummary: exported.summary,
        exportedArticleFolders: JSON.parse(exported.content).articleFolders,
        exportedArticles: JSON.parse(exported.content).articles,
        importSummary: summary,
        restored: target.articles,
      };
    `,
  }).result;

  assert.equal(result.exportSummary.articles, 1);
  assert.equal(result.exportSummary.followedUps, 1);
  assert.equal(result.exportSummary.articleFolders, 1);
  assert.equal(result.exportedArticleFolders[0].name, "Columns");
  assert.equal(result.exportedArticles[0].sourceKey, "opus:1230104343281139717");
  assert.deepEqual(result.exportedArticles[0].folders, ["Columns"]);
  assert.equal(result.importSummary.articlesUpserted, 1);
  assert.equal(result.importSummary.articlesSkipped, 0);
  assert.equal(result.importSummary.followedUpsUpserted, 1);
  assert.equal(result.restored[0].title, "A saved column");
  assert.deepEqual(result.restored[0].folderIds, [1]);
});

test("article toggle moves the saved record to trash without losing its payload", () => {
  const result = runBackgroundScenario({
    exports: ["toggleFavoriteArticle"],
    scenarioSource: `
      const state = {
        counters: { article: 1 },
        articles: [],
      };
      const payload = {
        sourceUrl: "https://www.bilibili.com/opus/1230104343281139717",
        opusId: "1230104343281139717",
        title: "A saved column",
        content: "Full article content",
      };
      const first = toggleFavoriteArticle(state, payload);
      const second = toggleFavoriteArticle(state, payload);
      return { first, second, remaining: state.articles };
    `,
  }).result;

  assert.equal(result.first.saved, true);
  assert.equal(result.second.saved, false);
  assert.equal(result.remaining.length, 1);
  assert.equal(result.remaining[0].title, "A saved column");
  assert.equal(typeof result.remaining[0].deletedAt, "number");
});

test("article collector saves folder selection without touching video folders", () => {
  const result = runBackgroundScenario({
    exports: ["saveArticleSelectionToState"],
    scenarioSource: `
      const state = {
        counters: { article: 1, articleFolder: 4 },
        articles: [],
        articleFolders: [
          { id: 2, name: "Columns", description: null, sortOrder: 1, deletedAt: null, createdAt: 1, updatedAt: 1 },
          { id: 3, name: "Research", description: null, sortOrder: 2, deletedAt: null, createdAt: 1, updatedAt: 1 },
        ],
      };
      const payload = {
        sourceUrl: "https://www.bilibili.com/opus/1230104343281139717",
        opusId: "1230104343281139717",
        title: "A saved column",
        content: "Full article content",
        folderIds: [2],
      };
      const first = saveArticleSelectionToState(state, payload);
      const firstIds = [...first.data.article.folderIds];
      const second = saveArticleSelectionToState(state, { ...payload, folderIds: [3] });
      const secondIds = [...second.data.article.folderIds];
      const removed = saveArticleSelectionToState(state, { ...payload, folderIds: [] });
      return {
        firstSaved: first.data.saved,
        firstIds,
        secondIds,
        removedSaved: removed.data.saved,
        articles: state.articles,
      };
    `,
  }).result;

  assert.equal(result.firstSaved, true);
  assert.deepEqual(result.firstIds, [2]);
  assert.deepEqual(result.secondIds, [3]);
  assert.equal(result.removedSaved, false);
  assert.equal(result.articles.length, 1);
  assert.deepEqual(result.articles[0].folderIds, [3]);
  assert.equal(typeof result.articles[0].deletedAt, "number");
});

test("background and content expose paged article APIs and article-page capture", async () => {
  const [background, content] = await Promise.all([
    readFile(path.join(repoRoot, "extension", "entrypoints", "background.ts"), "utf8"),
    readFile(path.join(repoRoot, "extension", "content.js"), "utf8"),
  ]);

  assert.match(background, /if \(path === "\/articles"\) \{\s*return ok\(queryFavoriteArticles/);
  assert.match(background, /params\.get\("folderId"\)/);
  assert.match(background, /path === "\/articles\/keys"/);
  assert.match(background, /path === "\/articles\/toggle"/);
  assert.match(background, /path === "\/article-folders"/);
  assert.match(background, /path === "\/articles\/by-key"/);
  assert.match(background, /path === "\/articles"[\s\S]*saveArticleSelectionToState/);
  assert.ok(
    background.includes(String.raw`const articleFoldersMatch = path.match(/^\/articles\/(\d+)\/folders$/);`),
  );
  assert.ok(
    background.includes(String.raw`const articleMatch = path.match(/^\/articles\/(\d+)$/);`),
  );
  assert.match(content, /isArticleUiUrl/);
  assert.match(content, /pickArticlePayload/);
  assert.match(content, /requestLocalApi\("POST", "\/articles",/);
  assert.match(content, /requestLocalApi\(\s*"GET",\s*`\/articles\/by-key/);
  assert.match(content, /articleMode \? "\/article-folders" : "\/folders"/);
  assert.match(content, /saveCollectorItem/);
});
