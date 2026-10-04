import test from "node:test";
import assert from "node:assert/strict";

import {
  compareExtensionVersions,
  normalizeExtensionVersion,
  resolveExtensionReleaseChannel,
  resolveExtensionUpdateAvailability,
} from "../shared/extension-update.js";

test("extension versions normalize release prefixes and compare numerically", () => {
  assert.equal(normalizeExtensionVersion("v1.0"), "1.0");
  assert.equal(normalizeExtensionVersion("1.0.1-beta.1"), "1.0.1");
  assert.equal(normalizeExtensionVersion("latest"), null);
  assert.equal(compareExtensionVersions("1.0.1", "1.0"), 1);
  assert.equal(compareExtensionVersions("0.1.26", "0.1.5"), 1);
  assert.equal(compareExtensionVersions("1.0", "1.0.0"), 0);
});

test("browser release channels distinguish Edge, Firefox, and Chrome", () => {
  assert.equal(
    resolveExtensionReleaseChannel({
      userAgent: "Mozilla/5.0 Edg/140.0",
      hasGeckoSettings: true,
    }),
    "edge",
  );
  assert.equal(
    resolveExtensionReleaseChannel({ userAgent: "Mozilla/5.0 Firefox/141.0" }),
    "firefox",
  );
  assert.equal(
    resolveExtensionReleaseChannel({ hasGeckoSettings: true }),
    "firefox",
  );
  assert.equal(
    resolveExtensionReleaseChannel({ userAgent: "Mozilla/5.0 Chrome/140.0" }),
    "chrome",
  );
});

test("store updates take priority over GitHub releases", () => {
  const result = resolveExtensionUpdateAvailability({
    currentVersion: "1.0.0",
    storeVersion: "1.0.2",
    storeUrl: "https://store.example/item",
    githubVersion: "1.0.1",
    githubLabel: "v1.0.1",
    githubUrl: "https://github.example/release",
  });

  assert.equal(result.updateAvailable, true);
  assert.equal(result.storeUpdateAvailable, true);
  assert.equal(result.preferredSource, "store");
  assert.equal(result.preferredUrl, "https://store.example/item");
  assert.equal(result.latestVersion, "1.0.2");
});

test("a newer GitHub release reports store review as pending", () => {
  const result = resolveExtensionUpdateAvailability({
    currentVersion: "0.1.5",
    storeVersion: "0.1.5",
    storeUrl: "https://store.example/item",
    githubVersion: "0.1.26",
    githubLabel: "v1.0",
    githubUrl: "https://github.example/release",
  });

  assert.equal(result.githubUpdateAvailable, true);
  assert.equal(result.storeUpdateAvailable, false);
  assert.equal(result.storePending, true);
  assert.equal(result.preferredSource, "store");
  assert.equal(result.preferredUrl, "https://store.example/item");
  assert.equal(result.latestLabel, "v1.0");
});

test("manual Chrome builds fall back to GitHub when no store URL is configured", () => {
  const result = resolveExtensionUpdateAvailability({
    currentVersion: "0.1.5",
    storeVersion: null,
    storeUrl: null,
    githubVersion: "0.1.26",
    githubLabel: "v1.0",
    githubUrl: "https://github.example/release",
  });

  assert.equal(result.updateAvailable, true);
  assert.equal(result.preferredSource, "github");
  assert.equal(result.preferredUrl, "https://github.example/release");
});

test("current 1.0.1 does not report the mislabeled 1.0.0 release as an update", () => {
  const result = resolveExtensionUpdateAvailability({
    currentVersion: "1.0.1",
    storeVersion: "1.0.1",
    storeUrl: "https://store.example/item",
    githubVersion: "1.0.0",
    githubLabel: "v1.0.0",
    githubUrl: "https://github.example/release",
  });

  assert.equal(result.updateAvailable, false);
  assert.equal(result.storeUpdateAvailable, false);
  assert.equal(result.githubUpdateAvailable, false);
});
