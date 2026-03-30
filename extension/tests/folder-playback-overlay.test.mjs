import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

async function readContentSource() {
  const source = await readFile(
    path.join(repoRoot, "extension", "content.js"),
    "utf8"
  );
  return source.replace(/\r\n/g, "\n");
}

test("content script reads the active playback session and renders a dedicated overlay", async () => {
  const source = await readContentSource();

  assert.match(source, /requestLocalApi\("GET", "\/playback\/session"\)/);
  assert.match(source, /id: "bl-playback-overlay"/);
  assert.match(source, /function refreshPlaybackOverlay\(\)/);
});

test("playback overlay exposes previous next open-manager and end-session controls", async () => {
  const source = await readContentSource();

  assert.match(source, /id: "bl-playback-prev"/);
  assert.match(source, /id: "bl-playback-next"/);
  assert.match(source, /id: "bl-playback-open-manager"/);
  assert.match(source, /id: "bl-playback-end-session"/);
});

test("playback overlay updates the active cursor before rendering controls", async () => {
  const source = await readContentSource();

  assert.match(source, /requestLocalApi\("PATCH", "\/playback\/session\/current"/);
  assert.match(source, /findPlaybackQueueIndex\(/);
  assert.match(source, /getAdjacentPlaybackItems\(/);
});

test("playback overlay stays hidden on non-queued pages", async () => {
  const source = await readContentSource();

  assert.match(source, /if \(!session\) \{\s*hidePlaybackOverlay\(\);/s);
  assert.match(source, /if \(currentIndex < 0\) \{\s*hidePlaybackOverlay\(\);/s);
});
