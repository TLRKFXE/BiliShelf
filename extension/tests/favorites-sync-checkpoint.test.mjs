import test from "node:test";
import assert from "node:assert/strict";

import { runBackgroundScenario } from "./helpers/background-runtime-harness.mjs";

test("favorites job normalization restores a valid cursor and rejects malformed seen identities", () => {
  const payload = runBackgroundScenario({
    exports: ["getFavoritesSyncStatus", "normalizeFavoritesSyncJobMeta"],
    scenarioSource: `
      const baseActive = {
        id: "job-1",
        phase: "paused",
        selectedRemoteFolderIds: [99],
        currentFolderRemoteId: 99,
        currentFolderTitle: "Remote",
        currentFolderIndex: 1,
        folderTotal: 1,
        nextPage: 3,
        seenBvidKeysByFolder: { 99: ["BVPAGE1A", "bvpage1a", "BVPAGE1B"] },
        completedRemoteFolderIds: [],
        startedAt: 100,
        updatedAt: 200,
      };
      const restored = normalizeFavoritesSyncJobMeta({ active: baseActive });
      const malformed = normalizeFavoritesSyncJobMeta({
        active: {
          ...baseActive,
          seenBvidKeysByFolder: { 99: "not-an-array" },
        },
      });
      const durableStatus = getFavoritesSyncStatus({
        syncMeta: { favoritesJob: restored },
      });
      return {
        restoredPage: restored.active?.nextPage,
        restoredSeen: restored.active?.seenBvidKeysByFolder?.["99"],
        statusRunning: durableStatus.running,
        statusResume: durableStatus.resumePageByFolder,
        malformedPage: malformed.active?.nextPage,
        malformedSeen: malformed.active?.seenBvidKeysByFolder?.["99"],
      };
    `,
  });

  assert.equal(payload.result.restoredPage, 3);
  assert.deepEqual(payload.result.restoredSeen, ["BVPAGE1A", "BVPAGE1B", "bvpage1a"]);
  assert.equal(payload.result.statusRunning, false);
  assert.deepEqual(payload.result.statusResume, { 99: 3 });
  assert.equal(payload.result.malformedPage, 1);
  assert.deepEqual(payload.result.malformedSeen, []);
});

test("matching selections reuse a durable job while a different selection starts over", () => {
  const payload = runBackgroundScenario({
    exports: ["normalizeFavoritesSyncJobMeta", "prepareFavoritesSyncJob"],
    scenarioSource: `
      const meta = normalizeFavoritesSyncJobMeta();
      const created = prepareFavoritesSyncJob(meta, [99, 42, 99], 1_000);
      created.currentFolderRemoteId = 99;
      created.nextPage = 4;
      created.seenBvidKeysByFolder["99"] = ["bvseen"];

      const restoredMeta = normalizeFavoritesSyncJobMeta(
        JSON.parse(JSON.stringify(meta)),
      );
      const resumed = prepareFavoritesSyncJob(restoredMeta, [42, 99], 2_000);
      const resumedSnapshot = {
        sameId: resumed.id === created.id,
        page: resumed.nextPage,
        seen: resumed.seenBvidKeysByFolder["99"],
      };
      const restarted = prepareFavoritesSyncJob(restoredMeta, [99], 3_000);
      return {
        selected: created.selectedRemoteFolderIds,
        resumed: resumedSnapshot,
        restarted: {
          sameId: restarted.id === created.id,
          page: restarted.nextPage,
          seen: restarted.seenBvidKeysByFolder["99"] || [],
        },
      };
    `,
  });

  assert.deepEqual(payload.result.selected, [42, 99]);
  assert.deepEqual(payload.result.resumed, {
    sameId: true,
    page: 4,
    seen: ["bvseen"],
  });
  assert.deepEqual(payload.result.restarted, {
    sameId: false,
    page: 1,
    seen: [],
  });
});

test("a page checkpoint persists imported relations and the next cursor together", () => {
  const payload = runBackgroundScenario({
    exports: [
      "normalizeFavoritesSyncJobMeta",
      "prepareFavoritesSyncJob",
      "syncFromBilibiliToState",
    ],
    setupSource: `
      const media = (bvid) => ({
        bvid,
        title: bvid,
        cover: "",
        upper: { name: "UP" },
        intro: "",
        link: "",
        fav_time: 200,
        pubtime: 100,
      });
      globalThis.fetch = async (request) => {
        const url = String(request);
        let data;
        if (url.includes("/x/web-interface/nav")) {
          data = { isLogin: true, mid: 1 };
        } else if (url.includes("/x/v3/fav/folder/created/list-all")) {
          data = { list: [{ id: 99, title: "Remote", media_count: 4 }] };
        } else if (url.includes("/x/v3/fav/resource/list")) {
          const page = Number(url.match(/[?&]pn=(\\d+)/)?.[1] || 1);
          if (page === 2) {
            return new Response(JSON.stringify({ code: -412, message: "risk" }), {
              status: 412,
            });
          }
          data = {
            medias: [media("BVPAGE1A"), media("BVPAGE1B")],
            has_more: true,
            info: { media_count: 4 },
          };
        } else {
          throw new Error("Unexpected URL: " + url);
        }
        return new Response(JSON.stringify({ code: 0, data }), { status: 200 });
      };
    `,
    scenarioSource: `
      const jobMeta = normalizeFavoritesSyncJobMeta();
      const job = prepareFavoritesSyncJob(jobMeta, [99], 1_000);
      const state = {
        counters: { folder: 1, video: 1, folderItem: 1, tag: 1, videoTag: 1 },
        folders: [],
        videos: [],
        folderItems: [],
        tags: [],
        videoTags: [],
        followedUps: [],
        syncMeta: { favoritesJob: jobMeta },
        ai: {},
      };
      const persisted = [];
      await syncFromBilibiliToState(state, {
        selectedRemoteFolderIds: [99],
        job,
        onCheckpoint: async () => {
          persisted.push(JSON.parse(JSON.stringify({
            folderItems: state.folderItems,
            active: state.syncMeta.favoritesJob.active,
          })));
        },
      });
      const pageOneCheckpoint = persisted.find(
        (snapshot) => snapshot.active?.nextPage === 2,
      );
      return {
        relationCount: pageOneCheckpoint?.folderItems.length || 0,
        page: pageOneCheckpoint?.active?.nextPage,
        seen: pageOneCheckpoint?.active?.seenBvidKeysByFolder?.["99"],
        riskRetry: state.syncMeta.favoritesJob.active?.retry,
      };
    `,
  });

  assert.equal(payload.result.relationCount, 2);
  assert.equal(payload.result.page, 2);
  assert.deepEqual(payload.result.seen, ["BVPAGE1A", "BVPAGE1B"]);
  assert.equal(payload.result.riskRetry.automatic, false);
  assert.equal(payload.result.riskRetry.reason, "risk-control");
  assert.ok(payload.result.riskRetry.nextRetryAt > 0);
});

test("completing a durable job clears its checkpoint and retains the final summary", () => {
  const payload = runBackgroundScenario({
    exports: [
      "completeFavoritesSyncJob",
      "normalizeFavoritesSyncJobMeta",
      "prepareFavoritesSyncJob",
    ],
    scenarioSource: `
      const meta = normalizeFavoritesSyncJobMeta();
      const job = prepareFavoritesSyncJob(meta, [99], 1_000);
      job.summary.videosProcessed = 4;
      job.summary.videosUpserted = 4;
      completeFavoritesSyncJob(meta, job, 2_000);
      const restored = normalizeFavoritesSyncJobMeta(JSON.parse(JSON.stringify(meta)));
      return {
        active: restored.active,
        finishedAt: restored.lastStatus.finishedAt,
        processed: restored.lastStatus.summary.videosProcessed,
        upserted: restored.lastStatus.summary.videosUpserted,
      };
    `,
  });

  assert.equal(payload.result.active, null);
  assert.equal(payload.result.finishedAt, 2_000);
  assert.equal(payload.result.processed, 4);
  assert.equal(payload.result.upserted, 4);
});
