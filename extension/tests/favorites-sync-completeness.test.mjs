import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { runBackgroundScenario } from "./helpers/background-runtime-harness.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backgroundPath = path.resolve(__dirname, "..", "entrypoints", "background.ts");

const emptyStateSource = `({
  counters: { folder: 1, video: 1, folderItem: 1, tag: 1, videoTag: 1 },
  folders: [],
  videos: [],
  folderItems: [],
  tags: [],
  videoTags: [],
  followedUps: [],
  syncMeta: {},
  ai: {},
})`;

function existingFolderStateSource(bvids) {
  const videos = bvids.map((bvid, index) => ({
    id: index + 1,
    bvid,
    title: bvid,
    coverUrl: "",
    uploader: "UP",
    uploaderSpaceUrl: null,
    description: "",
    partition: "",
    publishAt: null,
    bvidUrl: `https://www.bilibili.com/video/${bvid}`,
    isInvalid: false,
    deletedAt: null,
    createdAt: 1,
    updatedAt: 1,
  }));
  const folderItems = bvids.map((_bvid, index) => ({
    id: index + 1,
    folderId: 1,
    videoId: index + 1,
    addedAt: 1,
  }));
  return JSON.stringify({
    counters: {
      folder: 2,
      video: videos.length + 1,
      folderItem: folderItems.length + 1,
      tag: 1,
      videoTag: 1,
    },
    folders: [{
      id: 1,
      name: "Remote",
      description: null,
      remoteMediaId: 99,
      sortOrder: 1,
      deletedAt: null,
      createdAt: 1,
      updatedAt: 1,
    }],
    videos,
    folderItems,
    tags: [],
    videoTags: [],
    followedUps: [],
    syncMeta: {},
    ai: {},
  });
}

test("zero-item remote favorites are materialized locally", () => {
  const payload = runBackgroundScenario({
    exports: ["syncFromBilibiliToState"],
    setupSource: `
      globalThis.fetch = async (request) => {
        const url = String(request);
        const data = url.includes("/x/web-interface/nav")
          ? { isLogin: true, mid: 1 }
          : url.includes("/x/v3/fav/folder/created/list-all")
            ? { list: [{ id: 99, title: "Empty remote", media_count: 0 }] }
            : url.includes("/x/v3/fav/resource/list")
              ? { medias: [], has_more: false, info: { media_count: 0 } }
              : null;
        if (data === null) throw new Error("Unexpected URL: " + url);
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const state = ${emptyStateSource};
      const result = await syncFromBilibiliToState(state, {});
      return {
        foldersDetected: result.summary.foldersDetected,
        localFolders: state.folders.map((folder) => ({
          name: folder.name,
          remoteMediaId: folder.remoteMediaId,
        })),
      };
    `,
  });

  assert.equal(payload.result.foldersDetected, 1);
  assert.deepEqual(payload.result.localFolders, [{
    name: "Empty remote",
    remoteMediaId: 99,
  }]);
});

test("a requested stop checkpoints the persistent sync job as paused", () => {
  const payload = runBackgroundScenario({
    exports: ["createFavoritesSyncJob", "syncFromBilibiliToState"],
    setupSource: `
      globalThis.__mediaRequests = 0;
      globalThis.fetch = async (request) => {
        const url = String(request);
        const data = url.includes("/x/web-interface/nav")
          ? { isLogin: true, mid: 1 }
          : url.includes("/x/v3/fav/folder/created/list-all")
            ? { list: [{ id: 99, title: "Remote", media_count: 20 }] }
            : url.includes("/x/v3/fav/resource/list")
              ? (globalThis.__mediaRequests += 1, { medias: [], has_more: false })
              : null;
        if (data === null) throw new Error("Unexpected URL: " + url);
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const state = ${emptyStateSource};
      const job = createFavoritesSyncJob([99], 1000);
      const result = await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [99],
        job,
        shouldStop: () => true,
      });
      return {
        stopped: result.stopped,
        completed: result.completed,
        phase: job.phase,
        retryReason: job.retry.reason,
        mediaRequests: globalThis.__mediaRequests,
      };
    `,
  });

  assert.deepEqual(payload.result, {
    stopped: true,
    completed: false,
    phase: "paused",
    retryReason: "user-stopped",
    mediaRequests: 0,
  });
});

test("missing BV identities resolve through the view endpoint when aid is available", () => {
  const payload = runBackgroundScenario({
    exports: ["syncFromBilibiliToState"],
    setupSource: `
      globalThis.__viewRequests = 0;
      globalThis.fetch = async (request) => {
        const url = String(request);
        let data;
        if (url.includes("/x/web-interface/nav")) {
          data = { isLogin: true, mid: 1 };
        } else if (url.includes("/x/v3/fav/folder/created/list-all")) {
          data = { list: [{ id: 99, title: "Remote", media_count: 1 }] };
        } else if (url.includes("/x/v3/fav/resource/list")) {
          data = {
            medias: [{ id: 123, title: "Missing BV", upper: { name: "UP" } }],
            has_more: false,
            info: { media_count: 1 },
          };
        } else if (url.includes("/x/web-interface/view") && url.includes("aid=123")) {
          globalThis.__viewRequests += 1;
          data = { bvid: "BVRESOLVED123" };
        } else {
          throw new Error("Unexpected URL: " + url);
        }
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const state = ${emptyStateSource};
      const result = await syncFromBilibiliToState(state, {});
      return {
        viewRequests: globalThis.__viewRequests,
        bvids: state.videos.map((video) => video.bvid),
        unresolved: result.unresolvedItems,
      };
    `,
  });

  assert.equal(payload.result.viewRequests, 1);
  assert.deepEqual(payload.result.bvids, ["BVRESOLVED123"]);
  assert.deepEqual(payload.result.unresolved, []);
});

test("unresolved identities are reported and block destructive reconciliation", () => {
  const payload = runBackgroundScenario({
    exports: ["syncFromBilibiliToState"],
    setupSource: `
      globalThis.fetch = async (request) => {
        const url = String(request);
        const data = url.includes("/x/web-interface/nav")
          ? { isLogin: true, mid: 1 }
          : url.includes("/x/v3/fav/folder/created/list-all")
            ? { list: [{ id: 99, title: "Remote", media_count: 1 }] }
            : url.includes("/x/v3/fav/resource/list")
              ? {
                  medias: [{ title: "No identity" }],
                  has_more: false,
                  info: { media_count: 1 },
                }
              : null;
        if (data === null) throw new Error("Unexpected URL: " + url);
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const state = ${existingFolderStateSource(["BVKEEP"])};
      const result = await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [99],
      });
      return {
        relationCount: state.folderItems.length,
        unresolved: result.unresolvedItems,
        incomplete: result.incompleteFolders,
      };
    `,
  });

  assert.equal(payload.result.relationCount, 1);
  assert.equal(payload.result.unresolved.length, 1);
  assert.equal(payload.result.unresolved[0].title, "No identity");
  assert.equal(payload.result.incomplete.length, 1);
});

test("a naturally-ended count gap completes with unavailable warnings and no deletion", () => {
  const payload = runBackgroundScenario({
    exports: ["syncFromBilibiliToState"],
    setupSource: `
      globalThis.fetch = async (request) => {
        const url = String(request);
        let data;
        if (url.includes("/x/web-interface/nav")) {
          data = { isLogin: true, mid: 1 };
        } else if (url.includes("/x/v3/fav/folder/created/list-all")) {
          data = { list: [{ id: 99, title: "Remote", media_count: 2 }] };
        } else if (url.includes("/x/v3/fav/resource/list")) {
          data = {
            medias: [{ bvid: "BVKEEP", title: "Keep", upper: { name: "UP" } }],
            has_more: false,
            info: { media_count: 2 },
          };
        } else {
          throw new Error("Unexpected URL: " + url);
        }
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const state = ${existingFolderStateSource(["BVKEEP", "BVLOCALONLY"])};
      const result = await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [99],
      });
      return {
        relationCount: state.folderItems.length,
        incomplete: result.incompleteFolders,
        unavailable: result.unavailableFolders,
        unavailableCount: result.summary.unavailableRemoteVideos,
        completed: result.completed,
        removed: result.summary.folderLinksRemoved,
      };
    `,
  });

  assert.equal(payload.result.relationCount, 2);
  assert.equal(payload.result.incomplete.length, 0);
  assert.equal(payload.result.unavailable.length, 1);
  assert.equal(payload.result.unavailable[0].expected, 2);
  assert.equal(payload.result.unavailable[0].observed, 1);
  assert.equal(payload.result.unavailable[0].unavailable, 1);
  assert.equal(payload.result.unavailableCount, 1);
  assert.equal(payload.result.completed, true);
  assert.equal(payload.result.removed, 0);
});

test("returned invalid videos only warn and still complete the sync", () => {
  const payload = runBackgroundScenario({
    exports: ["syncFromBilibiliToState"],
    setupSource: `
      globalThis.fetch = async (request) => {
        const url = String(request);
        const data = url.includes("/x/web-interface/nav")
          ? { isLogin: true, mid: 1 }
          : url.includes("/x/v3/fav/folder/created/list-all")
            ? { list: [{ id: 99, title: "Remote", media_count: 1 }] }
            : url.includes("/x/v3/fav/resource/list")
              ? {
                  medias: [{ bvid: "BVINVALID", title: "Deleted video", attr: 1 }],
                  has_more: false,
                  info: { media_count: 1 },
                }
              : null;
        if (data === null) throw new Error("Unexpected URL: " + url);
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const state = ${emptyStateSource};
      const result = await syncFromBilibiliToState(state, {});
      return {
        completed: result.completed,
        invalidVideosDetected: result.invalidVideosDetected,
        isInvalid: state.videos[0]?.isInvalid,
        errors: result.errors,
      };
    `,
  });

  assert.deepEqual(payload.result, {
    completed: true,
    invalidVideosDetected: 1,
    isInvalid: true,
    errors: [],
  });
});

test("completed warning syncs do not implicitly create a tag task", async () => {
  const source = await readFile(backgroundPath, "utf8");
  assert.doesNotMatch(
    source,
    /TAG_SYNC_ENABLED\s*&&\s*result\.completed\s*&&\s*!result\.riskBlocked[\s\S]{0,160}startTagEnrichmentTask/,
  );
});

test("an empty page that still reports more pages remains incomplete", () => {
  const payload = runBackgroundScenario({
    exports: ["syncFromBilibiliToState"],
    setupSource: `
      globalThis.fetch = async (request) => {
        const url = String(request);
        const data = url.includes("/x/web-interface/nav")
          ? { isLogin: true, mid: 1 }
          : url.includes("/x/v3/fav/folder/created/list-all")
            ? { list: [{ id: 99, title: "Remote", media_count: 2 }] }
            : url.includes("/x/v3/fav/resource/list")
              ? { medias: [], has_more: true, info: { media_count: 2 } }
              : null;
        if (data === null) throw new Error("Unexpected URL: " + url);
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const state = ${existingFolderStateSource(["BVKEEP"])};
      const result = await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [99],
      });
      return {
        completed: result.completed,
        incomplete: result.incompleteFolders,
        unavailable: result.unavailableFolders,
        relationCount: state.folderItems.length,
      };
    `,
  });

  assert.equal(payload.result.completed, false);
  assert.equal(payload.result.incomplete.length, 1);
  assert.equal(payload.result.unavailable.length, 0);
  assert.equal(payload.result.relationCount, 1);
});

test("risk-blocked scans preserve every pre-existing local relationship", () => {
  const payload = runBackgroundScenario({
    exports: ["syncFromBilibiliToState"],
    setupSource: `
      globalThis.fetch = async (request) => {
        const url = String(request);
        if (url.includes("/x/web-interface/nav")) {
          return new Response(JSON.stringify({
            code: 0,
            data: { isLogin: true, mid: 1 },
          }), { status: 200 });
        }
        if (url.includes("/x/v3/fav/folder/created/list-all")) {
          return new Response(JSON.stringify({
            code: 0,
            data: { list: [{ id: 99, title: "Remote", media_count: 1 }] },
          }), { status: 200 });
        }
        if (url.includes("/x/v3/fav/resource/list")) {
          return new Response(JSON.stringify({ code: -412, message: "risk" }), {
            status: 412,
          });
        }
        throw new Error("Unexpected URL: " + url);
      };
    `,
    scenarioSource: `
      const state = ${existingFolderStateSource(["BVKEEP"])};
      const result = await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [99],
      });
      return {
        relationCount: state.folderItems.length,
        riskBlocked: result.riskBlocked,
        removed: result.summary.folderLinksRemoved,
      };
    `,
  });

  assert.equal(payload.result.riskBlocked, true);
  assert.equal(payload.result.relationCount, 1);
  assert.equal(payload.result.removed, 0);
});

test("a local relationship is removed only after two complete remote omissions", () => {
  const payload = runBackgroundScenario({
    exports: ["syncFromBilibiliToState"],
    setupSource: `
      globalThis.fetch = async (request) => {
        const url = String(request);
        const data = url.includes("/x/web-interface/nav")
          ? { isLogin: true, mid: 1 }
          : url.includes("/x/v3/fav/folder/created/list-all")
            ? { list: [{ id: 99, title: "Remote", media_count: 0 }] }
            : url.includes("/x/v3/fav/resource/list")
              ? { medias: [], has_more: false, info: { media_count: 0 } }
              : null;
        if (data === null) throw new Error("Unexpected URL: " + url);
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const state = ${existingFolderStateSource(["BVOMITTED"])};
      const first = await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [99],
      });
      const afterFirst = state.folderItems.length;
      const candidatesAfterFirst =
        state.syncMeta.favoritesJob.deletionCandidatesByFolder["99"];
      const second = await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [99],
      });
      return {
        afterFirst,
        afterSecond: state.folderItems.length,
        candidatesAfterFirst,
        firstRemoved: first.summary.folderLinksRemoved,
        secondRemoved: second.summary.folderLinksRemoved,
      };
    `,
  });

  assert.equal(payload.result.afterFirst, 1);
  assert.deepEqual(payload.result.candidatesAfterFirst, ["BVOMITTED"]);
  assert.equal(payload.result.firstRemoved, 0);
  assert.equal(payload.result.afterSecond, 0);
  assert.equal(payload.result.secondRemoved, 1);
});
