import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  normalizeRecoveredInvalidVideoMetadata,
  mergeRecoveredInvalidVideoFields,
} from "../shared/invalid-video-recovery.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

test("normalizeRecoveredInvalidVideoMetadata trims and normalizes", () => {
  const input = {
    title: "  Archival Title ",
    coverUrl: "//i0.hdslb.com/bfs/archive/cover.jpg",
    description: "  Description  ",
  };
  const normalized = normalizeRecoveredInvalidVideoMetadata(input);

  assert.strictEqual(normalized.title, "Archival Title");
  assert.strictEqual(
    normalized.coverUrl,
    "https://i0.hdslb.com/bfs/archive/cover.jpg"
  );
  assert.strictEqual(normalized.description, "Description");
});

test("normalizeRecoveredInvalidVideoMetadata drops malformed values", () => {
  const normalized = normalizeRecoveredInvalidVideoMetadata({
    title: { bad: true },
    coverUrl: "javascript:alert(1)",
    description: "   ",
  });

  assert.strictEqual(normalized.title, null);
  assert.strictEqual(normalized.coverUrl, null);
  assert.strictEqual(normalized.description, null);
});

test("mergeRecoveredInvalidVideoFields only updates invalid video fields", () => {
  const recovered = normalizeRecoveredInvalidVideoMetadata({
    title: "Recovered Title",
    coverUrl: "//i0.hdslb.com/bfs/archive/cover.jpg",
    description: "Recovered description",
  });

  const video = {
    isInvalid: true,
    title: "Old Title",
    coverUrl: "https://placeholder",
    description: "",
    uploader: "Existing UP",
    uploaderSpaceUrl: "https://space.bilibili.com/1",
  };

  const result = mergeRecoveredInvalidVideoFields(video, recovered);

  assert.ok(result.changed);
  assert.strictEqual(video.title, "Recovered Title");
  assert.strictEqual(
    video.coverUrl,
    "https://i0.hdslb.com/bfs/archive/cover.jpg"
  );
  assert.strictEqual(video.description, "Recovered description");
  assert.strictEqual(video.uploader, "Existing UP");
  assert.strictEqual(video.uploaderSpaceUrl, "https://space.bilibili.com/1");
  assert.deepStrictEqual(result.updates, {
    title: "Recovered Title",
    coverUrl: "https://i0.hdslb.com/bfs/archive/cover.jpg",
    description: "Recovered description",
  });
});

test("mergeRecoveredInvalidVideoFields ignores non-invalid videos", () => {
  const normalized = normalizeRecoveredInvalidVideoMetadata({
    title: "Recovered Title",
  });
  const video = {
    isInvalid: false,
    title: "Valid Title",
  };

  const result = mergeRecoveredInvalidVideoFields(video, normalized);
  assert.strictEqual(result.changed, false);
  assert.deepStrictEqual(result.updates, {});
});

test("background sync result and recovery routes expose invalid-video recovery contracts", async () => {
  const source = await readFile(
    path.join(repoRoot, "extension", "entrypoints", "background.ts"),
    "utf8"
  );

  assert.match(source, /invalidVideosDetected/);
  assert.match(source, /invalidVideoIds/);
  assert.match(source, /\/sync\/bilibili\/invalid-video-recovery\/start/);
  assert.match(source, /\/sync\/bilibili\/invalid-video-recovery\/status/);
  assert.doesNotMatch(
    source,
    /chrome\.alarms\.create\([^)]*invalid-video-recovery/i
  );
});

test("frontend wires invalid-video recovery api helpers and prompt dialog", async () => {
  const apiSource = await readFile(
    path.join(repoRoot, "frontend", "src", "lib", "api.ts"),
    "utf8"
  );
  const appSource = await readFile(
    path.join(repoRoot, "frontend", "src", "App.vue"),
    "utf8"
  );
  const dialogSource = await readFile(
    path.join(
      repoRoot,
      "frontend",
      "src",
      "components",
      "dialogs",
      "InvalidVideoRecoveryDialog.vue"
    ),
    "utf8"
  );
  const i18nSource = await readFile(
    path.join(repoRoot, "frontend", "src", "lib", "manager-i18n.ts"),
    "utf8"
  );

  assert.match(apiSource, /startInvalidVideoRecovery/);
  assert.match(apiSource, /fetchInvalidVideoRecoveryStatus/);

  assert.match(appSource, /InvalidVideoRecoveryDialog/);
  assert.match(appSource, /<InvalidVideoRecoveryDialog/);
  assert.match(appSource, /invalidVideoIds/);
  assert.match(appSource, /invalidVideoRecovery/);

  assert.match(dialogSource, /defineProps/);
  assert.match(dialogSource, /emit\(['"]start['"]\)/);

  assert.match(i18nSource, /invalidVideoRecovery\.dialogTitle/);
  assert.match(i18nSource, /toast\.invalidVideoRecovery/);
});
