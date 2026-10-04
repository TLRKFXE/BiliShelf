const VERSION_PATTERN = /^v?(\d+(?:\.\d+){0,3})(?:[-+].*)?$/i;

export function normalizeExtensionVersion(value) {
  const text = typeof value === "string" ? value.trim() : "";
  const match = text.match(VERSION_PATTERN);
  return match ? match[1] : null;
}

function versionParts(value) {
  const normalized = normalizeExtensionVersion(value);
  if (!normalized) return null;
  const parts = normalized.split(".").map((part) => Number.parseInt(part, 10));
  while (parts.length < 4) parts.push(0);
  return parts;
}

export function compareExtensionVersions(left, right) {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  if (!leftParts || !rightParts) return 0;
  for (let index = 0; index < 4; index += 1) {
    if (leftParts[index] === rightParts[index]) continue;
    return leftParts[index] > rightParts[index] ? 1 : -1;
  }
  return 0;
}

export function resolveExtensionReleaseChannel({
  userAgent = "",
  hasGeckoSettings = false,
} = {}) {
  const normalizedUserAgent = String(userAgent).toLowerCase();
  if (normalizedUserAgent.includes("edg/")) return "edge";
  if (normalizedUserAgent.includes("firefox/") || hasGeckoSettings) {
    return "firefox";
  }
  return "chrome";
}

export function resolveExtensionUpdateAvailability({
  currentVersion,
  storeVersion,
  storeUrl,
  githubVersion,
  githubLabel,
  githubUrl,
}) {
  const current = normalizeExtensionVersion(currentVersion) ?? "0";
  const store = normalizeExtensionVersion(storeVersion);
  const github = normalizeExtensionVersion(githubVersion);
  const storeUpdateAvailable = Boolean(
    store && compareExtensionVersions(store, current) > 0,
  );
  const githubUpdateAvailable = Boolean(
    github && compareExtensionVersions(github, current) > 0,
  );
  const latestVersion =
    store && github
      ? compareExtensionVersions(store, github) >= 0
        ? store
        : github
      : store ?? github ?? current;
  const latestLabel =
    github && latestVersion === github && String(githubLabel || "").trim()
      ? String(githubLabel).trim()
      : `v${latestVersion}`;
  const storePending = Boolean(
    store && storeUrl && githubUpdateAvailable && !storeUpdateAvailable,
  );
  const preferredSource = storeUpdateAvailable
    ? "store"
    : storePending
      ? "store"
      : githubUpdateAvailable
        ? "github"
        : storeUrl
          ? "store"
          : "github";
  const preferredUrl =
    preferredSource === "store" && storeUrl ? storeUrl : githubUrl;

  return {
    currentVersion: current,
    storeVersion: store,
    githubVersion: github,
    latestVersion,
    latestLabel,
    storeUpdateAvailable,
    githubUpdateAvailable,
    updateAvailable: storeUpdateAvailable || githubUpdateAvailable,
    storePending,
    preferredSource,
    preferredUrl,
  };
}
