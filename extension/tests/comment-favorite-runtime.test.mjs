import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runBackgroundScenario } from "./helpers/background-runtime-harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const backgroundPath = path.join(
  repoRoot,
  "extension",
  "entrypoints",
  "background.ts",
);

test("comment favorites are included in JSON exports and restored by import", () => {
  const result = runBackgroundScenario({
    exports: [
      "buildJsonExportResult",
      "parseImportRows",
      "applyImportRowsToState",
    ],
    scenarioSource: `
      const emptyState = () => ({
        counters: { folder: 1, video: 1, folderItem: 1, tag: 1, videoTag: 1, comment: 1 },
        folders: [], videos: [], folderItems: [], tags: [], videoTags: [],
        followedUps: [], comments: [], syncMeta: {}, ai: {},
      });
      const source = emptyState();
      source.comments.push({
        id: 7,
        sourceKey: "rpid:123456",
        rpid: "123456",
        rootRpid: "123456",
        bvid: "BV1COMMENT",
        videoTitle: "Source video",
        videoUrl: "https://www.bilibili.com/video/BV1COMMENT/",
        sourceUrl: "https://www.bilibili.com/video/BV1COMMENT/?comment_on=1&comment_root_id=123456",
        content: "A saved comment",
        contentImageUrls: ["https://i0.hdslb.com/comment.jpg"],
        authorName: "Author",
        authorMid: "42",
        authorAvatarUrl: "https://i0.hdslb.com/avatar.jpg",
        authorSpaceUrl: "https://space.bilibili.com/42",
        replyToName: "",
        likeCount: 88,
        publishedAt: 1700000000000,
        publishedAtText: "2023-11-14",
        savedAt: 1700000100000,
        updatedAt: 1700000100000,
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
      );
      return {
        exportSummary: exported.summary,
        exportedComments: JSON.parse(exported.content).comments,
        importSummary: summary,
        restored: target.comments,
      };
    `,
  }).result;

  assert.equal(result.exportSummary.comments, 1);
  assert.equal(result.exportedComments[0].sourceKey, "rpid:123456");
  assert.equal(result.importSummary.commentsUpserted, 1);
  assert.equal(result.importSummary.commentsSkipped, 0);
  assert.equal(result.restored[0].content, "A saved comment");
  assert.equal(result.restored[0].likeCount, 88);
});

test("background exposes paged comment routes and content script supports shadow comments", async () => {
  const [background, content] = await Promise.all([
    readFile(backgroundPath, "utf8"),
    readFile(path.join(repoRoot, "extension", "content.js"), "utf8"),
  ]);

  assert.match(
    background,
    /if \(path === "\/comments"\) \{\s*return ok\(queryFavoriteComments/,
  );
  assert.match(background, /path === "\/comments\/keys"/);
  assert.match(background, /path === "\/comments\/toggle"/);
  assert.match(background, /path\.match\(\/\^\\\/comments\\\/\(\\d\+\)\$\//);
  assert.match(
    background,
    /return paginate\(items, params\.get\("page"\), params\.get\("pageSize"\)\);/,
  );
  assert.match(content, /bili-comment-renderer/);
  assert.match(content, /bili-comment-thread-renderer/);
  assert.match(content, /bili-rich-text/);
  assert.match(content, /collectOpenCommentRoots\(\)/);
  assert.match(
    content,
    /requestLocalApi\("POST", "\/comments\/toggle", comment\)/,
  );
  assert.match(content, /COMMENT_SCAN_INTERVAL_MS/);
  assert.match(content, /data-bilishelf-comment-favorite/);
  assert.match(content, /`♥ \$\{t\("button\.savedComment"\)\}`/);
  assert.match(content, /mountedButton\?\.isConnected/);
  assert.match(content, /`♡ \$\{t\("button\.favoriteComment"\)\}`/);
  assert.match(content, /"\.root-reply-container"/);
  assert.match(content, /"\.reply-item"/);
  assert.match(content, /"\.reply-operation"/);
  assert.match(content, /function resolveCommentFavoritePlacement\(element\)/);
  assert.match(content, /actionRoot\.querySelector\("#reply"\)/);
  assert.match(content, /actionRoot\.querySelector\("#more"\)/);
  assert.match(
    content,
    /mountTarget\.insertBefore\(button, insertBefore \|\| null\)/,
  );
  assert.match(content, /button\.parentNode !== mountTarget/);
  assert.match(content, /showToast\(t\("toast\.commentReadFail"\), "err"\)/);
  assert.match(content, /"bili-comment-pictures-renderer"/);
  assert.match(
    content,
    /collectCommentImages\(\s*contentElement,\s*pictureElement\s*,?\s*\)/,
  );
  assert.match(content, /current\.data\?\.rpid/);
  assert.match(
    content,
    /url\.hash = `reply\$\{rpid \|\| rootRpid\}`|startCommentFavoriteWatch\(\)/,
  );
  assert.match(
    content,
    /if \(articleMode\) \{[\s\S]*?await loadArticleFavorite\(\);[\s\S]*?startCommentFavoriteWatch\(\);[\s\S]*?return;/,
  );
  assert.doesNotMatch(content, /toast\.commentSaved/);
  assert.doesNotMatch(content, /toast\.commentRemoved/);
  assert.doesNotMatch(
    content,
    /const comment = buildFavoriteCommentFromElement\(element\);\s*if \(!comment\) return;\s*const actionContainer/,
  );
});
