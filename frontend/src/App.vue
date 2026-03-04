<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { Button } from "./components/ui/button";
import { Progress } from "./components/ui/progress";
import ConfirmActionDialog from "./components/dialogs/ConfirmActionDialog.vue";
import ManageTagsDialog from "./components/dialogs/ManageTagsDialog.vue";
import RenameTagDialog from "./components/dialogs/RenameTagDialog.vue";
import SyncImportDialog from "./components/dialogs/SyncImportDialog.vue";
import AutoInitSetupDialog from "./components/dialogs/AutoInitSetupDialog.vue";
import BidirectionalSyncSettingsDialog from "./components/dialogs/BidirectionalSyncSettingsDialog.vue";
import WebDavBackupDialog from "./components/dialogs/WebDavBackupDialog.vue";
import VideoDetailDialog from "./components/dialogs/VideoDetailDialog.vue";
import FolderSidebar from "./components/FolderSidebar.vue";
import ManagerHeader from "./components/layout/ManagerHeader.vue";
import ManagerPanel from "./components/panels/ManagerPanel.vue";
import TrashPanel from "./components/panels/TrashPanel.vue";
import {
  PAGE_SIZE_OPTIONS,
  TRASH_FOLDER_PAGE_SIZE_OPTIONS,
  TRASH_VIDEO_PAGE_SIZE_OPTIONS,
  useLibraryStore,
} from "./stores/library";
import { useAppUiStore } from "./stores/app-ui";
import {
  parseKeyword as parseKeywordFromUtils,
} from "./lib/search-keyword";
import { MANAGER_I18N } from "./lib/manager-i18n";
import { useAppToast } from "./composables/use-app-toast";
import { useConfirmDialog } from "./composables/use-confirm-dialog";
import { useLoadingProgress } from "./composables/use-loading-progress";
import { useManageTagsDialog } from "./composables/use-manage-tags-dialog";
import { useManagerActions } from "./composables/use-manager-actions";
import { useManagerFilterActions } from "./composables/use-manager-filter-actions";
import { useManagerHeaderState } from "./composables/use-manager-header-state";
import { useManagerPaginationActions } from "./composables/use-manager-pagination-actions";
import { useManagerRouteSync } from "./composables/use-manager-route-sync";
import { useRenameTagDialog } from "./composables/use-rename-tag-dialog";
import { useVideoDetail } from "./composables/use-video-detail";
import {
  exportLibrary,
  fetchHistoryModelSyncStatus,
  fetchTagEnrichmentStatus,
  fetchBidirectionalSyncSettings,
  fetchWebDavSettings,
  fetchBilibiliSyncFolders,
  importLibrary,
  downloadWebDavBackup,
  pauseTagEnrichment,
  resumeTagEnrichment,
  restoreWebDavBackup,
  runTagEnrichmentNow,
  startHistoryModelSync,
  testWebDavConnection,
  uploadWebDavBackup,
  updateBidirectionalSyncSettings,
  updateWebDavSettings,
  type BidirectionalSyncSettings,
  type HistoryModelSyncStatus,
  type TagEnrichmentStatus,
  type WebDavSettings,
  updateVideo,
  type SyncRemoteFolder,
} from "./lib/api";
import type { Tag } from "./types";

const uiStore = useAppUiStore();
const { locale, isDark } = storeToRefs(uiStore);
const router = useRouter();
const route = useRoute();

function t(key: string, vars: Record<string, string | number> = {}) {
  const entry = MANAGER_I18N[key];
  const template = entry ? entry[locale.value] : key;
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(vars[token] ?? "")
  );
}

const {
  confirmDialogOpen,
  confirmDialogTitle,
  confirmDialogDescription,
  confirmDialogConfirmText,
  confirmDialogVariant,
  openConfirmDialog,
  resolveConfirmDialog,
  setConfirmDialogOpen,
} = useConfirmDialog(
  () => t("dialog.confirm.title"),
  () => t("common.confirm")
);
const {
  renameTagDialogOpen,
  renameTagValue,
  renameTagTarget,
  openRenameTagDialog: openRenameCustomTagDialog,
  setRenameDialogOpen,
} = useRenameTagDialog<Tag>();

function toggleLocale() {
  uiStore.toggleLocale();
}

const libraryStore = useLibraryStore();
const {
  folders,
  tags,
  videos,
  trashFolders,
  trashVideos,
  keyword,
  selectedFolderId,
  selectedVideoIds,
  selectedTrashFolderIds,
  selectedTrashVideoIds,
  batchTargetFolderId,
  batchPanelOpen,
  fromDate,
  toDate,
  newCustomTagName,
  manageCustomTagPage,
  videoPage,
  videoPageSize,
  trashFolderPage,
  trashFolderPageSize,
  trashVideoPage,
  trashVideoPageSize,
  loading,
  total,
  trashVideoTotal,
  customTags,
  manageCustomTagTotalPages,
  pagedManageCustomTags,
  hasSelection,
  canMoveFromCurrentFolder,
  videoTotalPages,
  trashVideoTotalPages,
  trashFolderTotalPages,
  pagedTrashFolders,
} = storeToRefs(libraryStore);

const {
  refreshFolders: refreshFoldersData,
  refreshTags: refreshTagsData,
  refreshVideos: refreshVideosData,
  refreshTrash: refreshTrashData,
  resetForViewSwitch,
} = libraryStore;

const toolsOpen = ref(false);
const trashMode = computed(() => route.name === "trash");
const syncingImport = ref(false);
const exportingLibrary = ref(false);
const importingLibrary = ref(false);
const syncDialogOpen = ref(false);
const autoInitDialogOpen = ref(false);
const syncFetchingFolders = ref(false);
const syncFolders = ref<SyncRemoteFolder[]>([]);
const syncSelectedFolderIds = ref<number[]>([]);
const autoInitFetchingFolders = ref(false);
const autoInitFolders = ref<SyncRemoteFolder[]>([]);
const autoInitSelectedFolderIds = ref<number[]>([]);
const autoInitSubmitting = ref(false);
const syncChunkSize = ref(20);
const syncSpeedMode = ref<"stable" | "balanced" | "fast">("balanced");
const syncIncludeTagEnrichment = ref(false);
const tagEnrichmentStatus = ref<TagEnrichmentStatus | null>(null);
const tagEnrichmentLoading = ref(false);
const bidirectionalSyncDialogOpen = ref(false);
const bidirectionalSyncSettings = ref<BidirectionalSyncSettings | null>(null);
const bidirectionalSyncSaving = ref(false);
const webdavDialogOpen = ref(false);
const webdavSettings = ref<WebDavSettings | null>(null);
const webdavBusy = ref(false);
const TAG_SYNC_ENABLED = true;
const autoInitRunning = ref(false);
const AUTO_INIT_STATE_KEY = "bilishelf-auto-init-v3";
const AUTO_INIT_LOCK_KEY = "bilishelf-auto-init-v3.lock";
const AUTO_INIT_LOCK_TTL_MS = 90_000;
const AUTO_INIT_PROBE_SCHEDULE_MS = [30_000, 45_000, 60_000, 90_000, 120_000, 180_000, 300_000];
const AUTO_INIT_STATE_TIMEOUT_MS = 6 * 60 * 1000;
const SYNC_CURSOR_STORAGE_KEY = "bilishelf-sync-cursors-v1";
const SYNC_CHUNK_DELAY_MS = 1100;
const SYNC_CHUNK_DELAY_JITTER_MS = 500;
const SYNC_MAX_ROUNDS = 800;
const EXPORT_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_EXPORT_AT_KEY = "bilishelf-last-export-at";
const LAST_EXPORT_REMINDER_DAY_KEY = "bilishelf-last-export-reminder-day";
const importFileInput = ref<HTMLInputElement | null>(null);
const autoInitOwnerId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const tickNow = ref(Date.now());
let autoInitHeartbeatTimer: number | null = null;
let tagEnrichmentPollTimer: number | null = null;
let autoInitRetryTimer: number | null = null;
let tickTimer: number | null = null;

const SYNC_SPEED_PROFILES = {
  stable: {
    pagesPerRound: 1,
    delayMs: 900,
    jitterMs: 280
  },
  balanced: {
    pagesPerRound: 2,
    delayMs: 520,
    jitterMs: 180
  },
  fast: {
    pagesPerRound: 3,
    delayMs: 320,
    jitterMs: 120
  }
} as const;

const { notifySuccess, notifyError } = useAppToast(t);
const { detailOpen, detailLoading, detailVideo, openVideoDetail } = useVideoDetail(
  t,
  notifyError
);
const detailSaving = ref(false);
const isBusy = computed(() => loading.value || detailLoading.value);
const progressValue = useLoadingProgress(isBusy);
const {
  currentViewLabel: headerCurrentViewLabel,
  currentScopeLabel: headerCurrentScopeLabel,
  localeToggleText,
  batchPanelClasses: headerBatchPanelClasses,
  batchOutlineButtonClasses: headerBatchOutlineButtonClasses,
  batchSecondaryButtonClasses: headerBatchSecondaryButtonClasses,
  batchSelectTriggerClasses: headerBatchSelectTriggerClasses,
  batchSelectedTextClasses: headerBatchSelectedTextClasses,
} = useManagerHeaderState({
  t,
  locale,
  isDark,
  trashMode,
  selectedFolderId,
  folders,
});

const {
  routeReady,
  syncingFromRoute,
  syncingToRoute,
  buildManagerQuery,
  applyManagerQuery,
  syncManagerQueryToRoute,
} = useManagerRouteSync({
  route,
  router,
  trashMode,
  keyword,
  selectedFolderId,
  fromDate,
  toDate,
  videoPage,
  videoPageSize,
});

const { prevManageCustomTagPage, nextManageCustomTagPage } = useManageTagsDialog({
  toolsOpen,
  manageCustomTagPage,
  manageCustomTagTotalPages,
});

async function refreshFolders() {
  try {
    await refreshFoldersData();
    if (
      selectedFolderId.value !== null &&
      !folders.value.some((folder) => folder.id === selectedFolderId.value)
    ) {
      selectedFolderId.value = null;
    }
  } catch (error) {
    console.error(error);
    notifyError(t("toast.loadFoldersFail"), error);
  }
}

async function refreshTags() {
  try {
    await refreshTagsData();
  } catch (error) {
    console.error(error);
    notifyError(t("toast.loadTagsFail"), error);
  }
}

async function refreshVideos() {
  if (trashMode.value) return;
  try {
    const { extracted, globalKeyword } = parseKeywordFromUtils(
      keyword.value
    );
    await refreshVideosData({ extracted, globalKeyword });
  } catch (error) {
    console.error(error);
    notifyError(t("toast.loadVideosFail"), error);
  }
}

async function refreshTrash() {
  try {
    await refreshTrashData();
  } catch (error) {
    console.error(error);
    notifyError(t("toast.loadTrashFail"), error);
  }
}

async function refreshFoldersAndVideos() {
  await Promise.all([refreshFolders(), refreshVideos()]);
}

async function refreshTagsAndVideos() {
  await Promise.all([refreshTags(), refreshVideos()]);
}

async function refreshFoldersVideosAndTags() {
  await Promise.all([refreshFolders(), refreshVideos(), refreshTags()]);
}

async function refreshTrashAndVideos() {
  await Promise.all([refreshTrash(), refreshVideos()]);
}

async function refreshTrashFoldersAndVideos() {
  await Promise.all([refreshTrash(), refreshFolders(), refreshVideos()]);
}

const {
  handleCreateFolder,
  handleUpdateFolder,
  handleRemoveFolder,
  handleReorderFolders,
  handleCreateCustomTag,
  submitRenameCustomTag,
  handleDeleteCustomTag,
  handleBatchMoveOrCopy,
  handleBatchDelete,
  handleQuickAction,
  batchRestoreTrashFolders,
  batchPurgeTrashFolders,
  batchRestoreTrashVideos,
  batchPurgeTrashVideos,
  handleRestoreFolderFromTrash,
  handlePurgeFolderFromTrash,
  handleRestoreVideoFromTrash,
  handlePurgeVideoFromTrash,
} = useManagerActions({
  t,
  notifySuccess,
  notifyError,
  openConfirmDialog,
  selectedFolderId,
  selectedVideoIds,
  selectedTrashFolderIds,
  selectedTrashVideoIds,
  batchTargetFolderId,
  batchPanelOpen,
  hasSelection,
  newCustomTagName,
  renameTagTarget,
  renameTagValue,
  setRenameDialogOpen,
  refreshFolders,
  refreshTagsAndVideos,
  refreshFoldersAndVideos,
  refreshFoldersVideosAndTags,
  refreshTrash,
  refreshTrashAndVideos,
  refreshTrashFoldersAndVideos,
  openVideoDetail,
});

function setVideoSelection(id: number, checked: boolean) {
  if (checked && !selectedVideoIds.value.includes(id)) {
    libraryStore.setVideoSelection(id, true);
    batchPanelOpen.value = true;
    return;
  }
  libraryStore.setVideoSelection(id, checked);
}

function clearVideoSelection() {
  libraryStore.clearVideoSelection();
}

function selectAllVisible() {
  libraryStore.selectAllVisible();
}

const {
  goToVideoPage,
  prevVideoPage,
  nextVideoPage,
  handleVideoPageSizeChange,
  prevTrashFolderPage,
  nextTrashFolderPage,
  handleTrashFolderPageSizeChange,
  prevTrashVideoPage,
  nextTrashVideoPage,
  handleTrashVideoPageSizeChange,
} = useManagerPaginationActions({
  videoPage,
  videoTotalPages,
  videoPageSize,
  selectedVideoIds,
  batchPanelOpen,
  syncManagerQueryToRoute,
  refreshVideos,
  trashFolderPage,
  trashFolderTotalPages,
  selectedTrashFolderIds,
  trashFolderPageSize,
  trashVideoPage,
  trashVideoTotalPages,
  selectedTrashVideoIds,
  trashVideoPageSize,
  refreshTrash,
});

const {
  handleSearchSubmit,
  applyDateFilter,
  clearDateFilter,
  handleSelectFolder,
  clearSearch,
  handleAppendFieldToken,
} = useManagerFilterActions({
  trashMode,
  keyword,
  fromDate,
  toDate,
  selectedFolderId,
  selectedVideoIds,
  batchPanelOpen,
  videoPage,
  syncManagerQueryToRoute,
  refreshVideos,
  locale,
});

function handleBatchPanelToggle() {
  if (batchPanelOpen.value) {
    batchPanelOpen.value = false;
    clearVideoSelection();
    batchTargetFolderId.value = null;
    return;
  }
  batchPanelOpen.value = true;
}

function toggleTheme() {
  uiStore.toggleTheme();
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
}

function sleepMs(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function readSyncCursorMap() {
  try {
    const raw = window.localStorage.getItem(SYNC_CURSOR_STORAGE_KEY);
    if (!raw) return {} as Record<string, number>;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, number> = {};
    for (const [folderId, pageRaw] of Object.entries(parsed || {})) {
      const page = Number(pageRaw);
      if (Number.isFinite(page) && page > 1) {
        normalized[folderId] = Math.trunc(page);
      }
    }
    return normalized;
  } catch {
    return {} as Record<string, number>;
  }
}

function writeSyncCursorMap(map: Record<string, number>) {
  try {
    window.localStorage.setItem(SYNC_CURSOR_STORAGE_KEY, JSON.stringify(map));
  } catch {
  }
}

const syncCursorMap = ref<Record<string, number>>(readSyncCursorMap());

type AutoInitStatus = "idle" | "running" | "cooldown" | "completed" | "failed";
type AutoInitState = {
  status: AutoInitStatus;
  folderIds: number[];
  folderIndex: number;
  riskStreak: number;
  nextRetryAt: number | null;
  startedAt: number;
  updatedAt: number;
  phase1Imported: number;
  phase1Scanned: number;
  targetVideosEstimate: number;
  lastError: string;
};

function getSyncResumePage(folderId: number) {
  const page = Number(syncCursorMap.value[String(folderId)] || 1);
  return Number.isFinite(page) && page > 1 ? Math.trunc(page) : 1;
}

function setSyncResumePage(folderId: number, page: number | null) {
  const key = String(folderId);
  if (page && Number.isFinite(page) && page > 1) {
    syncCursorMap.value = {
      ...syncCursorMap.value,
      [key]: Math.trunc(page)
    };
  } else if (Object.prototype.hasOwnProperty.call(syncCursorMap.value, key)) {
    const next = { ...syncCursorMap.value };
    delete next[key];
    syncCursorMap.value = next;
  }
  writeSyncCursorMap(syncCursorMap.value);
}

function buildResumePageByFolder(folderIds: number[]) {
  const map: Record<string, number> = {};
  for (const folderId of folderIds) {
    const page = getSyncResumePage(folderId);
    if (page > 1) {
      map[String(folderId)] = page;
    }
  }
  return map;
}

function getDefaultAutoInitState(): AutoInitState {
  const ts = Date.now();
  return {
    status: "idle",
    folderIds: [],
    folderIndex: 0,
    riskStreak: 0,
    nextRetryAt: null,
    startedAt: ts,
    updatedAt: ts,
    phase1Imported: 0,
    phase1Scanned: 0,
    targetVideosEstimate: 0,
    lastError: ""
  };
}

function readAutoInitState() {
  try {
    const raw = window.localStorage.getItem(AUTO_INIT_STATE_KEY);
    if (!raw) return getDefaultAutoInitState();
    const parsed = JSON.parse(raw) as Partial<AutoInitState>;
    const base = getDefaultAutoInitState();
    return {
      status: (["idle", "running", "cooldown", "completed", "failed"] as AutoInitStatus[]).includes(
        parsed.status as AutoInitStatus
      )
        ? (parsed.status as AutoInitStatus)
        : base.status,
      folderIds: Array.isArray(parsed.folderIds)
        ? parsed.folderIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
        : [],
      folderIndex: Math.max(0, Math.trunc(Number(parsed.folderIndex ?? 0))),
      riskStreak: Math.max(0, Math.trunc(Number(parsed.riskStreak ?? 0))),
      nextRetryAt:
        parsed.nextRetryAt && Number.isFinite(Number(parsed.nextRetryAt))
          ? Number(parsed.nextRetryAt)
          : null,
      startedAt:
        parsed.startedAt && Number.isFinite(Number(parsed.startedAt))
          ? Number(parsed.startedAt)
          : base.startedAt,
      updatedAt:
        parsed.updatedAt && Number.isFinite(Number(parsed.updatedAt))
          ? Number(parsed.updatedAt)
          : base.updatedAt,
      phase1Imported: Math.max(0, Math.trunc(Number(parsed.phase1Imported ?? 0))),
      phase1Scanned: Math.max(0, Math.trunc(Number(parsed.phase1Scanned ?? 0))),
      targetVideosEstimate: Math.max(0, Math.trunc(Number(parsed.targetVideosEstimate ?? 0))),
      lastError: String(parsed.lastError ?? "")
    } as AutoInitState;
  } catch {
    return getDefaultAutoInitState();
  }
}

const autoInitState = ref<AutoInitState>(readAutoInitState());

function writeAutoInitState(
  patch: Partial<AutoInitState> | ((current: AutoInitState) => AutoInitState)
) {
  const current = readAutoInitState();
  const next =
    typeof patch === "function"
      ? patch(current)
      : {
          ...current,
          ...patch
        };
  next.updatedAt = Date.now();
  window.localStorage.setItem(AUTO_INIT_STATE_KEY, JSON.stringify(next));
  autoInitState.value = next;
  return next;
}

function formatSeconds(totalMs: number) {
  const totalSec = Math.max(0, Math.ceil(totalMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

function looksLikeRiskControlError(message: string) {
  const text = String(message || "").toLowerCase();
  return text.includes("(412)") || text.includes(" 412") || text.includes("risk-control");
}

const autoInitPhase1Progress = computed(() => {
  const target = Math.max(0, autoInitState.value.targetVideosEstimate);
  const imported = Math.max(0, autoInitState.value.phase1Imported);
  if (target <= 0) {
    if (autoInitState.value.status === "completed") return 100;
    return imported > 0 ? Math.min(95, imported % 100) : 0;
  }
  return Math.max(0, Math.min(100, (imported / target) * 100));
});

const autoInitTagProgress = computed(() => {
  const imported = Math.max(0, autoInitState.value.phase1Imported);
  const missing = Math.max(0, tagEnrichmentStatus.value?.totalMissing ?? 0);
  if (imported <= 0) return missing <= 0 ? 100 : 0;
  const done = Math.max(0, imported - missing);
  return Math.max(0, Math.min(100, (done / imported) * 100));
});

const autoInitCooldownRemainMs = computed(() => {
  if (autoInitState.value.status !== "cooldown" || !autoInitState.value.nextRetryAt) return 0;
  return Math.max(0, autoInitState.value.nextRetryAt - tickNow.value);
});

const autoInitStatusText = computed(() => {
  const status = autoInitState.value.status;
  if (status === "running") return t("autoInit.statusRunning");
  if (status === "cooldown") return t("autoInit.statusCooldown");
  if (status === "failed") return t("autoInit.statusFailed");
  if (status === "completed") return t("autoInit.statusCompleted");
  return t("autoInit.statusIdle");
});

const showAutoInitProgressPanel = computed(() => {
  if (trashMode.value) return false;
  const hasPhaseState =
    autoInitState.value.status !== "idle" || autoInitState.value.folderIds.length > 0;
  const hasTagBacklog = (tagEnrichmentStatus.value?.totalMissing ?? 0) > 0;
  return hasPhaseState || hasTagBacklog;
});

function handleStorageSync(event: StorageEvent) {
  if (event.key === AUTO_INIT_STATE_KEY) {
    autoInitState.value = readAutoInitState();
    return;
  }
  if (event.key === SYNC_CURSOR_STORAGE_KEY) {
    syncCursorMap.value = readSyncCursorMap();
  }
}

function readAutoInitLock() {
  try {
    const raw = window.localStorage.getItem(AUTO_INIT_LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { owner: string; expiresAt: number };
    if (!parsed || typeof parsed.owner !== "string" || !Number.isFinite(parsed.expiresAt)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function tryAcquireAutoInitLock() {
  const ts = Date.now();
  const existing = readAutoInitLock();
  if (existing && existing.expiresAt > ts && existing.owner !== autoInitOwnerId) {
    return false;
  }

  const lock = {
    owner: autoInitOwnerId,
    expiresAt: ts + AUTO_INIT_LOCK_TTL_MS
  };
  window.localStorage.setItem(AUTO_INIT_LOCK_KEY, JSON.stringify(lock));
  const confirmed = readAutoInitLock();
  return Boolean(confirmed && confirmed.owner === autoInitOwnerId);
}

function renewAutoInitLock() {
  const current = readAutoInitLock();
  if (!current || current.owner !== autoInitOwnerId) return false;
  window.localStorage.setItem(
    AUTO_INIT_LOCK_KEY,
    JSON.stringify({
      owner: autoInitOwnerId,
      expiresAt: Date.now() + AUTO_INIT_LOCK_TTL_MS
    })
  );
  return true;
}

function releaseAutoInitLock() {
  const current = readAutoInitLock();
  if (current?.owner === autoInitOwnerId) {
    window.localStorage.removeItem(AUTO_INIT_LOCK_KEY);
  }
}

function getAutoInitCooldownMs(riskStreak: number) {
  const index = Math.max(0, Math.trunc(riskStreak) - 1);
  return AUTO_INIT_PROBE_SCHEDULE_MS[Math.min(index, AUTO_INIT_PROBE_SCHEDULE_MS.length - 1)];
}

async function probeBilibiliRiskRecovery() {
  try {
    await fetchBilibiliSyncFolders({ forceRefresh: true });
    return {
      ready: true as const,
      riskBlocked: false,
      message: ""
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ready: false as const,
      riskBlocked: looksLikeRiskControlError(message),
      message
    };
  }
}

function markExportFinishedAt(timestamp = Date.now()) {
  try {
    window.localStorage.setItem(LAST_EXPORT_AT_KEY, String(timestamp));
  } catch {
  }
}

function maybeNotifyExportReminder() {
  const hasData = (total.value ?? 0) > 0;
  if (!hasData) return;

  const now = Date.now();
  const dayLabel = new Date(now).toISOString().slice(0, 10);
  try {
    const lastReminderDay = window.localStorage.getItem(LAST_EXPORT_REMINDER_DAY_KEY);
    if (lastReminderDay === dayLabel) return;

    const lastExportAtRaw = Number(window.localStorage.getItem(LAST_EXPORT_AT_KEY) ?? 0);
    const lastExportAt = Number.isFinite(lastExportAtRaw) ? lastExportAtRaw : 0;
    if (lastExportAt > 0 && now - lastExportAt < EXPORT_REMINDER_INTERVAL_MS) return;

    window.localStorage.setItem(LAST_EXPORT_REMINDER_DAY_KEY, dayLabel);
    notifyError(
      t("toast.exportReminderTitle"),
      t("toast.exportReminderDesc")
    );
  } catch {
  }
}

async function refreshTagEnrichmentState() {
  tagEnrichmentLoading.value = true;
  try {
    tagEnrichmentStatus.value = await fetchTagEnrichmentStatus();
  } catch (error) {
    console.warn("[tag-enrichment] status failed:", error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function pauseTagEnrichmentFromUi() {
  if (tagEnrichmentLoading.value) return;
  tagEnrichmentLoading.value = true;
  try {
    tagEnrichmentStatus.value = await pauseTagEnrichment();
    notifySuccess(t("toast.tagEnrichPaused"));
  } catch (error) {
    notifyError(t("toast.tagEnrichPauseFail"), error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function resumeTagEnrichmentFromUi() {
  if (tagEnrichmentLoading.value) return;
  tagEnrichmentLoading.value = true;
  try {
    tagEnrichmentStatus.value = await resumeTagEnrichment();
    notifySuccess(t("toast.tagEnrichResumed"));
  } catch (error) {
    notifyError(t("toast.tagEnrichResumeFail"), error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function runTagEnrichmentNowFromUi() {
  if (tagEnrichmentLoading.value) return;
  tagEnrichmentLoading.value = true;
  try {
    tagEnrichmentStatus.value = await runTagEnrichmentNow();
    notifySuccess(t("toast.tagEnrichTriggered"));
  } catch (error) {
    notifyError(t("toast.tagEnrichTriggerFail"), error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function refreshBidirectionalSyncSettings() {
  try {
    bidirectionalSyncSettings.value = await fetchBidirectionalSyncSettings();
  } catch (error) {
    notifyError(t("toast.syncSettingsLoadFail"), error);
  }
}

function openBidirectionalSyncSettingsDialog() {
  bidirectionalSyncDialogOpen.value = true;
  void refreshBidirectionalSyncSettings();
}

async function saveBidirectionalSyncSettings(payload: {
  biliToLocalEnabled: boolean;
}) {
  if (bidirectionalSyncSaving.value) return;
  bidirectionalSyncSaving.value = true;
  try {
    bidirectionalSyncSettings.value = await updateBidirectionalSyncSettings(payload);
    notifySuccess(t("toast.syncSettingsSaved"));
    bidirectionalSyncDialogOpen.value = false;
  } catch (error) {
    notifyError(t("toast.syncSettingsSaveFail"), error);
  } finally {
    bidirectionalSyncSaving.value = false;
  }
}

async function refreshWebDavSettings() {
  try {
    webdavSettings.value = await fetchWebDavSettings();
  } catch (error) {
    notifyError(t("toast.webdavSettingsLoadFail"), error);
  }
}

function openWebDavDialog() {
  webdavDialogOpen.value = true;
  void refreshWebDavSettings();
}

async function saveWebDavSettings(payload: {
  enabled: boolean;
  baseUrl: string;
  username: string;
  password?: string;
  remotePath: string;
}) {
  if (webdavBusy.value) return;
  webdavBusy.value = true;
  try {
    webdavSettings.value = await updateWebDavSettings(payload);
    notifySuccess(t("toast.webdavSettingsSaved"));
  } catch (error) {
    notifyError(t("toast.webdavSettingsSaveFail"), error);
  } finally {
    webdavBusy.value = false;
  }
}

async function testWebDavFromUi(payload?: {
  enabled: boolean;
  baseUrl: string;
  username: string;
  password?: string;
  remotePath: string;
}) {
  if (webdavBusy.value) return;
  webdavBusy.value = true;
  try {
    if (payload) {
      webdavSettings.value = await updateWebDavSettings(payload);
    }
    webdavSettings.value = await testWebDavConnection();
    notifySuccess(t("toast.webdavTestDone"));
  } catch (error) {
    notifyError(t("toast.webdavTestFail"), error);
  } finally {
    webdavBusy.value = false;
  }
}

async function uploadWebDavFromUi() {
  if (webdavBusy.value || syncingImport.value || importingLibrary.value) return;
  webdavBusy.value = true;
  try {
    const result = await uploadWebDavBackup();
    webdavSettings.value = result;
    notifySuccess(
      t("toast.webdavUploadDone"),
      t("toast.webdavUploadSummary", {
        videos: result.summary.videos,
        tags: result.summary.tags
      })
    );
  } catch (error) {
    notifyError(t("toast.webdavUploadFail"), error);
  } finally {
    webdavBusy.value = false;
  }
}

async function downloadWebDavFromUi() {
  if (webdavBusy.value || syncingImport.value || importingLibrary.value) return;
  webdavBusy.value = true;
  try {
    const result = await downloadWebDavBackup();
    downloadTextFile(result.fileName, result.content, result.mimeType);
    notifySuccess(t("toast.webdavDownloadDone"));
    await refreshWebDavSettings();
  } catch (error) {
    notifyError(t("toast.webdavDownloadFail"), error);
  } finally {
    webdavBusy.value = false;
  }
}

async function restoreWebDavFromUi() {
  if (webdavBusy.value || syncingImport.value || importingLibrary.value) return;
  webdavBusy.value = true;
  try {
    const result = await restoreWebDavBackup();
    webdavSettings.value = result.webdav;
    await refreshFoldersVideosAndTags();
    await refreshTrash();
    notifySuccess(
      t("toast.webdavRestoreDone"),
      t("toast.webdavRestoreSummary", {
        videos: result.summary.videosUpserted,
        links: result.summary.folderLinksAdded,
        tags: result.summary.tagsBound
      })
    );
  } catch (error) {
    notifyError(t("toast.webdavRestoreFail"), error);
  } finally {
    webdavBusy.value = false;
  }
}

function startTagEnrichmentPolling() {
  if (tagEnrichmentPollTimer !== null) window.clearInterval(tagEnrichmentPollTimer);
  tagEnrichmentPollTimer = window.setInterval(() => {
    if (route.name !== "manager") return;
    void refreshTagEnrichmentState();
  }, 15_000);
}

function stopTagEnrichmentPolling() {
  if (tagEnrichmentPollTimer !== null) {
    window.clearInterval(tagEnrichmentPollTimer);
    tagEnrichmentPollTimer = null;
  }
}

async function loadSyncFolderOptions(force = false) {
  if (syncFetchingFolders.value) return;
  if (!force && syncFolders.value.length > 0) return;
  syncFetchingFolders.value = true;
  try {
    const result = await fetchBilibiliSyncFolders();
    syncFolders.value = result.items ?? [];
    const available = new Set(syncFolders.value.map((item) => item.remoteId));
    syncSelectedFolderIds.value = syncSelectedFolderIds.value.filter((id) =>
      available.has(id)
    );
  } catch (error) {
    console.error(error);
    notifyError(t("toast.syncLoadFoldersFail"), error);
  } finally {
    syncFetchingFolders.value = false;
  }
}

async function loadAutoInitFolderOptions(force = false) {
  if (autoInitFetchingFolders.value) return;
  if (!force && autoInitFolders.value.length > 0) return;
  autoInitFetchingFolders.value = true;
  try {
    const result = await fetchBilibiliSyncFolders();
    autoInitFolders.value = (result.items ?? []).filter((folder) => folder.mediaCount > 0);
    const available = new Set(autoInitFolders.value.map((item) => item.remoteId));
    autoInitSelectedFolderIds.value = autoInitSelectedFolderIds.value.filter((id) =>
      available.has(id)
    );
  } catch (error) {
    console.error(error);
    notifyError(t("toast.syncLoadFoldersFail"), error);
  } finally {
    autoInitFetchingFolders.value = false;
  }
}

function openAutoInitDialog() {
  autoInitDialogOpen.value = true;
  void loadAutoInitFolderOptions();
}

function maybePromptAutoInitSetupDialog() {
  if (route.name !== "manager") return;
  if (trashMode.value) return;
  if (autoInitDialogOpen.value || autoInitFetchingFolders.value) return;
  const state = readAutoInitState();
  autoInitState.value = state;
  const isFreshLibrary = total.value === 0 && folders.value.length === 0;
  if (state.status === "idle" && state.folderIds.length === 0 && isFreshLibrary) {
    openAutoInitDialog();
  }
}

function toggleAutoInitFolder(remoteId: number, checked: boolean) {
  if (!checked) {
    autoInitSelectedFolderIds.value = autoInitSelectedFolderIds.value.filter((id) => id !== remoteId);
    return;
  }
  autoInitSelectedFolderIds.value = [...new Set([...autoInitSelectedFolderIds.value, remoteId])];
}

function estimateTargetVideosByFolders(folderIds: number[], candidates: SyncRemoteFolder[]) {
  const selectedSet = new Set(folderIds);
  return candidates
    .filter((folder) => selectedSet.has(folder.remoteId))
    .reduce((sum, folder) => sum + Math.max(0, Number(folder.mediaCount || 0)), 0);
}

function startUnifiedFavoritesSync(folderIds: number[], targetVideosEstimate: number) {
  const normalizedIds = [...new Set(folderIds.filter((id) => Number.isFinite(id) && id > 0))];
  writeAutoInitState({
    status: "running",
    folderIds: normalizedIds,
    folderIndex: 0,
    nextRetryAt: null,
    riskStreak: 0,
    phase1Imported: 0,
    phase1Scanned: 0,
    targetVideosEstimate: Math.max(0, Math.trunc(targetVideosEstimate)),
    lastError: ""
  });
  autoInitDialogOpen.value = false;
  syncDialogOpen.value = false;
  void safeMaybeStartAutoInitSync({ force: true });
}

async function confirmAutoInitSetup() {
  if (autoInitSubmitting.value) return;
  if (autoInitSelectedFolderIds.value.length === 0) {
    notifyError(t("toast.autoInitPickFolder"));
    return;
  }
  const targetVideosEstimate = estimateTargetVideosByFolders(
    autoInitSelectedFolderIds.value,
    autoInitFolders.value
  );
  autoInitSubmitting.value = true;
  try {
    startUnifiedFavoritesSync(autoInitSelectedFolderIds.value, targetVideosEstimate);
  } finally {
    autoInitSubmitting.value = false;
  }
}

async function openSyncImportDialog() {
  syncDialogOpen.value = true;
  await Promise.all([loadSyncFolderOptions(), refreshTagEnrichmentState()]);
}

function toggleSyncFolder(remoteId: number, checked: boolean) {
  if (!checked) {
    syncSelectedFolderIds.value = syncSelectedFolderIds.value.filter((id) => id !== remoteId);
    return;
  }
  syncSelectedFolderIds.value = [...new Set([...syncSelectedFolderIds.value, remoteId])];
}

async function submitSyncImport() {
  if (syncingImport.value || exportingLibrary.value || autoInitRunning.value) return;
  if (syncSelectedFolderIds.value.length === 0) {
    notifyError(t("toast.autoInitPickFolder"));
    return;
  }
  const targetVideosEstimate = estimateTargetVideosByFolders(
    syncSelectedFolderIds.value,
    syncFolders.value
  );
  startUnifiedFavoritesSync(syncSelectedFolderIds.value, targetVideosEstimate);
}

type FolderSyncRunResult = {
  foldersSynced: number;
  videosImported: number;
  videosScanned: number;
  riskBlocked: boolean;
  noProgress: boolean;
  hasMorePage: boolean;
  nextPage: number | null;
  errors: Array<{ folder: string; message: string }>;
  errorsOmittedTotal: number;
};

async function runFavoritesSyncLikeHistory(
  selectedRemoteFolderIds: number[],
  options: {
    notify: boolean;
    closeDialogOnSuccess: boolean;
    resumePageByFolder?: Record<string, number>;
  }
): Promise<FolderSyncRunResult> {
  syncingImport.value = true;
  try {
    const uniqueFolderIds = [...new Set(selectedRemoteFolderIds.filter((id) => id > 0))];
    const resumePageByFolder = options.resumePageByFolder ?? buildResumePageByFolder(uniqueFolderIds);
    let startResult = await startHistoryModelSync({
      selectedRemoteFolderIds: uniqueFolderIds,
      resumePageByFolder
    });
    if (!startResult.started && !startResult.status.running) {
      await sleepMs(180);
      startResult = await startHistoryModelSync({
        selectedRemoteFolderIds: uniqueFolderIds,
        resumePageByFolder
      });
    }
    if (!startResult.started && !startResult.status.running) {
      throw new Error("Sync task did not start, please retry");
    }

    let status: HistoryModelSyncStatus | null = null;
    const pollStartedAt = Date.now();
    while (true) {
      status = await fetchHistoryModelSyncStatus();
      if (!status.running) break;
      if (Date.now() - pollStartedAt > 2 * 60 * 60 * 1000) {
        throw new Error("Sync polling exceeded 2 hours timeout");
      }
      await sleepMs(850);
    }
    if (!status) {
      throw new Error("Sync status is unavailable");
    }

    const foldersSynced = Math.max(0, status.summary.foldersSynced);
    const videosImported = Math.max(0, status.summary.folderLinksAdded);
    const videosScanned = Math.max(0, status.summary.videosProcessed);
    const riskBlocked = Boolean(status.riskBlocked);
    const resumeMapRaw = status.resumePageByFolder ?? {};
    const resumeMap: Record<string, number> = {};
    for (const [folderId, pageRaw] of Object.entries(resumeMapRaw)) {
      const page = Number(pageRaw);
      if (Number.isFinite(page) && page > 1) {
        resumeMap[String(folderId)] = Math.trunc(page);
      }
    }
    for (const folderId of uniqueFolderIds) {
      const nextPage = resumeMap[String(folderId)] ?? null;
      setSyncResumePage(folderId, nextPage);
    }
    const singleFolderId = uniqueFolderIds.length === 1 ? uniqueFolderIds[0] : null;
    const singleFolderNextPage =
      singleFolderId !== null ? (resumeMap[String(singleFolderId)] ?? null) : null;
    const errorsOmittedTotal = 0;
    const allErrors = status.errors ?? [];
    if (status.lastError && allErrors.length === 0) {
      allErrors.push({ folder: "__sync__", message: status.lastError });
    }

    if (videosImported > 0) {
      selectedFolderId.value = null;
      keyword.value = "";
      fromDate.value = "";
      toDate.value = "";
      videoPage.value = 1;
      if (!trashMode.value) {
        await syncManagerQueryToRoute();
      }
    }

    await refreshFoldersVideosAndTags();
    await refreshTagEnrichmentState();

    const visibleErrors = Array.from(
      new Set(
        allErrors
          .filter((item) => item.folder !== "__sync__")
          .map((item) => `${item.folder}: ${item.message}`)
      )
    )
      .slice(0, 3)
      .join(" | ");
    const hiddenCount = Math.max(
      0,
      allErrors.filter((item) => item.folder !== "__sync__").length - 3
    );
    const systemError = allErrors.find((item) => item.folder === "__sync__");
    const errorDesc = [
      visibleErrors,
      errorsOmittedTotal > 0 ? t("toast.syncHiddenErrors", { count: errorsOmittedTotal }) : "",
      hiddenCount > 0 ? t("toast.syncHiddenErrors", { count: hiddenCount }) : "",
      systemError?.message || ""
    ]
      .filter(Boolean)
      .join(" | ");

    const fullyFailed = videosImported === 0 && allErrors.length > 0;
    const noProgress = videosImported === 0 && videosScanned === 0;
    if (options.notify) {
      if (fullyFailed) {
        notifyError(t("toast.syncFail"), errorDesc || t("common.requestFailed"));
      } else if (!noProgress) {
        if (options.closeDialogOnSuccess) {
          syncDialogOpen.value = false;
        }
        notifySuccess(
          t("toast.syncDone"),
          t("toast.syncSummary", {
            folders: foldersSynced,
            videos: videosImported
          })
        );
        if (allErrors.length > 0) {
          notifyError(t("toast.syncPartial"), errorDesc);
        }
      }
    }

    return {
      foldersSynced,
      videosImported,
      videosScanned,
      riskBlocked,
      noProgress,
      hasMorePage: Number.isFinite(Number(singleFolderNextPage)) && Number(singleFolderNextPage) > 1,
      nextPage:
        Number.isFinite(Number(singleFolderNextPage)) && Number(singleFolderNextPage) > 1
          ? Math.trunc(Number(singleFolderNextPage))
          : null,
      errors: allErrors,
      errorsOmittedTotal
    };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    const riskBlocked = looksLikeRiskControlError(message);
    if (options.notify) notifyError(t("toast.syncFail"), error);
    return {
      foldersSynced: 0,
      videosImported: 0,
      videosScanned: 0,
      riskBlocked,
      noProgress: true,
      hasMorePage: false,
      nextPage: null,
      errors: [{ folder: "__sync__", message }],
      errorsOmittedTotal: 0
    };
  } finally {
    syncingImport.value = false;
  }
}

function startAutoInitLockHeartbeat() {
  if (autoInitHeartbeatTimer !== null) window.clearInterval(autoInitHeartbeatTimer);
  autoInitHeartbeatTimer = window.setInterval(() => {
    renewAutoInitLock();
  }, Math.max(20_000, Math.floor(AUTO_INIT_LOCK_TTL_MS / 2)));
}

function stopAutoInitLockHeartbeat() {
  if (autoInitHeartbeatTimer !== null) {
    window.clearInterval(autoInitHeartbeatTimer);
    autoInitHeartbeatTimer = null;
  }
}

async function maybeStartAutoInitSync(options: { force?: boolean } = {}) {
  const force = options.force === true;
  if (trashMode.value) return;
  if (autoInitRunning.value || syncingImport.value) return;
  if (autoInitRetryTimer !== null) {
    window.clearTimeout(autoInitRetryTimer);
    autoInitRetryTimer = null;
  }

  const state = readAutoInitState();
  autoInitState.value = state;
  let normalizedIds = state.folderIds.filter((id) => Number.isFinite(id) && id > 0);
  const staleCompletedState =
    state.status === "completed" &&
    normalizedIds.length > 0 &&
    total.value === 0 &&
    folders.value.length === 0;
  if (staleCompletedState) {
    writeAutoInitState(getDefaultAutoInitState());
    normalizedIds = [];
  }
  if (state.status === "completed") return;
  if (state.status === "cooldown" && state.nextRetryAt && Date.now() < state.nextRetryAt) {
    return;
  }
  if (state.status === "cooldown") {
    const probe = await probeBilibiliRiskRecovery();
    if (!probe.ready) {
      if (probe.riskBlocked) {
        const nextRiskStreak = Math.max(1, (state.riskStreak || 0) + 1);
        const cooldownMs = getAutoInitCooldownMs(nextRiskStreak);
        writeAutoInitState({
          status: "cooldown",
          folderIds: normalizedIds,
          folderIndex: state.folderIndex,
          riskStreak: nextRiskStreak,
          nextRetryAt: Date.now() + cooldownMs,
          phase1Imported: Math.max(0, state.phase1Imported || 0),
          phase1Scanned: Math.max(0, state.phase1Scanned || 0),
          targetVideosEstimate: Math.max(0, state.targetVideosEstimate || 0),
          lastError: probe.message || "Risk-control is still active. Waiting for next probe."
        });
        return;
      }
      if (!force) {
        return;
      }
      writeAutoInitState({
        status: "failed",
        folderIds: normalizedIds,
        folderIndex: state.folderIndex,
        riskStreak: Math.max(0, state.riskStreak || 0),
        nextRetryAt: null,
        phase1Imported: Math.max(0, state.phase1Imported || 0),
        phase1Scanned: Math.max(0, state.phase1Scanned || 0),
        targetVideosEstimate: Math.max(0, state.targetVideosEstimate || 0),
        lastError: probe.message || "Probe failed before sync resume."
      });
      return;
    }
  }
  if (normalizedIds.length === 0) {
    if (force) {
      openAutoInitDialog();
    }
    return;
  }

  if (state.status === "idle") {
    if (force) {
      writeAutoInitState({
        status: "running",
        folderIds: normalizedIds,
        folderIndex: Math.max(0, Math.min(state.folderIndex, normalizedIds.length)),
        nextRetryAt: null,
        lastError: ""
      });
    } else {
      return;
    }
  }

  if (
    !force &&
    state.status === "running" &&
    Date.now() - state.updatedAt < AUTO_INIT_STATE_TIMEOUT_MS
  ) {
    return;
  }

  autoInitRunning.value = true;
  try {
    const latestState = readAutoInitState();
    const startIndex = Math.max(0, Math.min(latestState.folderIndex, normalizedIds.length));
    writeAutoInitState({
      status: "running",
      folderIds: normalizedIds,
      folderIndex: startIndex,
      nextRetryAt: null,
      lastError: ""
    });

    let totalImported = Math.max(0, state.phase1Imported);
    let totalScanned = Math.max(0, state.phase1Scanned);
    for (let index = startIndex; index < normalizedIds.length; index += 1) {
      const folderId = normalizedIds[index];
      const result = await runFavoritesSyncLikeHistory([folderId], {
        notify: false,
        closeDialogOnSuccess: false
      });
      totalImported += result.videosImported;
      totalScanned += result.videosScanned;

      if (result.riskBlocked) {
        const latest = readAutoInitState();
        const nextRiskStreak = (latest.riskStreak || 0) + 1;
        const cooldownMs = getAutoInitCooldownMs(nextRiskStreak);
        writeAutoInitState({
          status: "cooldown",
          folderIds: normalizedIds,
          folderIndex: index,
          riskStreak: nextRiskStreak,
          nextRetryAt: Date.now() + cooldownMs,
          phase1Imported: totalImported,
          phase1Scanned: totalScanned,
          targetVideosEstimate: Math.max(0, latest.targetVideosEstimate || 0),
          lastError: result.errors[0]?.message || "risk-control (412)"
        });
        notifyError(t("toast.autoInitCooling"), t("toast.autoInitCoolingDesc"));
        return;
      }

      if (result.noProgress && result.errors.length > 0) {
        const latest = readAutoInitState();
        writeAutoInitState({
          status: "failed",
          folderIds: normalizedIds,
          folderIndex: index,
          riskStreak: latest.riskStreak || 0,
          nextRetryAt: null,
          phase1Imported: totalImported,
          phase1Scanned: totalScanned,
          targetVideosEstimate: Math.max(0, latest.targetVideosEstimate || 0),
          lastError: result.errors[0]?.message || "sync failed"
        });
        notifyError(t("toast.autoInitFail"), result.errors[0]?.message || t("common.requestFailed"));
        return;
      }

      const latest = readAutoInitState();
      writeAutoInitState({
        status: "running",
        folderIds: normalizedIds,
        folderIndex: index + 1,
        riskStreak: latest.riskStreak || 0,
        nextRetryAt: null,
        phase1Imported: totalImported,
        phase1Scanned: totalScanned,
        targetVideosEstimate: Math.max(0, latest.targetVideosEstimate || 0),
        lastError: ""
      });
      await sleepMs(640 + Math.floor(Math.random() * 260));
    }

    const latest = readAutoInitState();
    writeAutoInitState({
      status: "completed",
      folderIds: normalizedIds,
      folderIndex: normalizedIds.length,
      riskStreak: 0,
      nextRetryAt: null,
      phase1Imported: totalImported,
      phase1Scanned: totalScanned,
      targetVideosEstimate: Math.max(0, latest.targetVideosEstimate || 0),
      lastError: ""
    });
    await refreshTagEnrichmentState();
    notifySuccess(
      t("toast.autoInitDone"),
      t("toast.autoInitDoneDesc", { videos: totalImported })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeAutoInitState((current) => ({
      ...current,
      status: "failed",
      nextRetryAt: null,
      lastError: message
    }));
    notifyError(t("toast.autoInitFail"), message);
    console.error("[auto-init] failed:", error);
  } finally {
    autoInitRunning.value = false;
  }
}

async function safeMaybeStartAutoInitSync(options: { force?: boolean } = {}) {
  try {
    await maybeStartAutoInitSync(options);
  } catch (error) {
    console.error("[auto-init] unexpected error:", error);
    notifyError(t("toast.autoInitFail"), error);
    autoInitRunning.value = false;
  }
}

async function resumeAutoInitFromUi() {
  if (autoInitRunning.value || syncingImport.value) return;
  const state = readAutoInitState();
  if (!state.folderIds.length) {
    openAutoInitDialog();
    return;
  }
  void safeMaybeStartAutoInitSync({ force: true });
}

function reopenAutoInitSetupFromUi() {
  openAutoInitDialog();
}

async function handleExport(format: "json" | "csv") {
  if (syncingImport.value || exportingLibrary.value || importingLibrary.value) return;
  exportingLibrary.value = true;
  try {
    const payload = await exportLibrary(format);
    if (!payload.content || payload.content.trim().length === 0) {
      throw new Error("Export content is empty");
    }
    downloadTextFile(payload.filename, payload.content, payload.mimeType);
    markExportFinishedAt();
    notifySuccess(
      t("toast.exportDone"),
      t("toast.exportSummary", {
        videos: payload.summary.videos,
        tags: payload.summary.tags
      })
    );
  } catch (error) {
    console.error(error);
    notifyError(t("toast.exportFail"), error);
  } finally {
    exportingLibrary.value = false;
  }
}

function openImportFileDialog() {
  if (syncingImport.value || exportingLibrary.value || importingLibrary.value) return;
  importFileInput.value?.click();
}

function detectImportFormat(fileName: string, content: string): "json" | "csv" | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".csv")) return "csv";

  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (trimmed.includes(",") && trimmed.includes("\n")) return "csv";
  return null;
}

async function handleImportFilePicked(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (syncingImport.value || exportingLibrary.value || importingLibrary.value) return;

  importingLibrary.value = true;
  try {
    const content = await file.text();
    const format = detectImportFormat(file.name, content);
    if (!format) {
      throw new Error("Unsupported import file type, use JSON or CSV");
    }

    const result = await importLibrary({
      format,
      content
    });
    await refreshFoldersVideosAndTags();
    await refreshTrash();

    notifySuccess(
      t("toast.importDone"),
      t("toast.importSummary", {
        videos: result.summary.videosUpserted,
        links: result.summary.folderLinksAdded,
        tags: result.summary.tagsBound
      })
    );
  } catch (error) {
    console.error(error);
    notifyError(t("toast.importFail"), error);
  } finally {
    importingLibrary.value = false;
  }
}

async function handleSaveVideoDetail(payload: {
  id: number;
  data: {
    title?: string;
    uploader?: string;
    uploaderSpaceUrl?: string | null;
    description?: string;
    publishAt?: number | null;
    bvidUrl?: string;
    customTags?: string[];
    systemTags?: string[];
  };
}) {
  if (detailSaving.value) return;
  detailSaving.value = true;
  try {
    await updateVideo(payload.id, payload.data);
    await Promise.all([refreshVideos(), refreshTrash()]);
    await openVideoDetail(payload.id);
    notifySuccess(t("toast.detailUpdated"));
  } catch (error) {
    notifyError(t("toast.detailUpdateFail"), error);
  } finally {
    detailSaving.value = false;
  }
}

const syncResumePage = computed(() => {
  if (syncSelectedFolderIds.value.length !== 1) return 1;
  return getSyncResumePage(syncSelectedFolderIds.value[0]);
});

function setTrashFolderSelection(id: number, checked: boolean) {
  libraryStore.setTrashFolderSelection(id, checked);
}

function setTrashVideoSelection(id: number, checked: boolean) {
  libraryStore.setTrashVideoSelection(id, checked);
}

function selectAllTrashFolders() {
  libraryStore.selectAllTrashFolders();
}

function clearTrashFolderSelection() {
  libraryStore.clearTrashFolderSelection();
}

function selectAllTrashVideos() {
  libraryStore.selectAllTrashVideos();
}

function clearTrashVideoSelection() {
  libraryStore.clearTrashVideoSelection();
}

function isTrashFolderSelected(id: number) {
  return libraryStore.isTrashFolderSelected(id);
}

function isTrashVideoSelected(id: number) {
  return libraryStore.isTrashVideoSelected(id);
}

async function applyViewMode(next: boolean) {
  resetForViewSwitch();
  if (next) {
    trashFolderPage.value = 1;
    trashVideoPage.value = 1;
    await refreshTrash();
  } else {
    applyManagerQuery(route.query);
    await refreshFoldersAndVideos();
  }
}

async function toggleTrashMode(next: boolean) {
  const targetName = next ? "trash" : "manager";
  if (route.name === targetName) return;
  if (next) {
    await router.push({ name: targetName });
    return;
  }
  await router.push({ name: targetName, query: buildManagerQuery() });
}

watch(
  () => route.name,
  async (nextName, previousName) => {
    if (!routeReady.value) return;
    if (nextName === previousName) return;
    try {
      await applyViewMode(nextName === "trash");
      if (nextName === "manager") {
        startTagEnrichmentPolling();
        maybePromptAutoInitSetupDialog();
      } else {
        stopTagEnrichmentPolling();
      }
    } catch (error) {
      console.error("[route] view switch failed:", error);
      notifyError(t("toast.appLoadFail"), error);
    }
  }
);

watch(
  () => route.query,
  async (nextQuery) => {
    if (!routeReady.value) return;
    if (route.name !== "manager") return;
    if (syncingToRoute.value) return;

    syncingFromRoute.value = true;
    try {
      applyManagerQuery(nextQuery);
      selectedVideoIds.value = [];
      batchPanelOpen.value = false;
      await refreshVideos();
    } finally {
      syncingFromRoute.value = false;
    }
  },
  { deep: true }
);

watch(
  () => total.value,
  () => {
    maybeNotifyExportReminder();
  }
);

watch(
  () => autoInitCooldownRemainMs.value,
  () => {
    // Manual-confirm mode: cooldown end does not auto-resume.
  }
);

onMounted(async () => {
  autoInitState.value = readAutoInitState();
  tickNow.value = Date.now();
  if (tickTimer !== null) window.clearInterval(tickTimer);
  tickTimer = window.setInterval(() => {
    tickNow.value = Date.now();
  }, 1000);
  window.addEventListener("storage", handleStorageSync);
  uiStore.initFromStorage();
  if (route.name === "manager") {
    applyManagerQuery(route.query);
  }
  loading.value = true;
  try {
    await libraryStore.ensureBootstrapped();
    await refreshBidirectionalSyncSettings();
    if (
      selectedFolderId.value !== null &&
      !folders.value.some((folder) => folder.id === selectedFolderId.value)
    ) {
      selectedFolderId.value = null;
    }
    if (route.name === "trash") {
      await refreshTrash();
    } else {
      await refreshVideos();
      maybeNotifyExportReminder();
      await refreshTagEnrichmentState();
      startTagEnrichmentPolling();
    }
    routeReady.value = true;
    if (route.name === "manager") {
      maybePromptAutoInitSetupDialog();
    }
  } catch (error) {
    console.error("[manager] mount failed:", error);
    notifyError(t("toast.appLoadFail"), error);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("storage", handleStorageSync);
  if (tickTimer !== null) {
    window.clearInterval(tickTimer);
    tickTimer = null;
  }
  if (autoInitRetryTimer !== null) {
    window.clearTimeout(autoInitRetryTimer);
    autoInitRetryTimer = null;
  }
  stopTagEnrichmentPolling();
  stopAutoInitLockHeartbeat();
  releaseAutoInitLock();
});
</script>

<template>
  <main
    class="mx-auto grid min-h-screen w-full max-w-[1840px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[320px_1fr] lg:px-6 lg:py-7"
  >
    <FolderSidebar
      :folders="folders"
      :active-folder-id="selectedFolderId"
      :locale="locale"
      @select="handleSelectFolder"
      @create="handleCreateFolder"
      @update="handleUpdateFolder"
      @remove="handleRemoveFolder"
      @reorder="handleReorderFolders"
    />

    <section class="min-w-0 space-y-4">
      <ManagerHeader
        :t="t"
        :trash-mode="trashMode"
        :current-view-label="headerCurrentViewLabel"
        :current-scope-label="headerCurrentScopeLabel"
        :locale-toggle-text="localeToggleText"
        :is-dark="isDark"
        :progress-value="progressValue"
        :syncing="syncingImport"
        :exporting="exportingLibrary"
        :importing="importingLibrary"
        @open-tags="toolsOpen = true"
        @open-sync-settings="openBidirectionalSyncSettingsDialog"
        @open-webdav-settings="openWebDavDialog"
        @sync-import="openSyncImportDialog"
        @import-file="openImportFileDialog"
        @export-json="handleExport('json')"
        @export-csv="handleExport('csv')"
        @toggle-trash="toggleTrashMode(!trashMode)"
        @toggle-locale="toggleLocale"
        @toggle-theme="toggleTheme"
      />

      <section
        v-if="showAutoInitProgressPanel && !trashMode"
        class="panel-surface space-y-3 rounded-lg border p-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">{{ t("autoInit.progressTitle") }}</p>
            <p class="text-xs text-muted-foreground">
              {{ autoInitStatusText }}
              <span v-if="autoInitState.status === 'cooldown' && autoInitCooldownRemainMs > 0">
                · {{ t("autoInit.cooldownRemain", { time: formatSeconds(autoInitCooldownRemainMs) }) }}
              </span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              :disabled="autoInitRunning || syncingImport"
              @click="reopenAutoInitSetupFromUi"
            >
              {{ t("autoInit.openPicker") }}
            </Button>
            <Button
              size="sm"
              :disabled="
                autoInitRunning ||
                syncingImport ||
                (autoInitState.status === 'cooldown' && autoInitCooldownRemainMs > 0)
              "
              @click="resumeAutoInitFromUi"
            >
              {{ t("autoInit.resume") }}
            </Button>
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">{{ t("autoInit.phase1Title") }}</span>
            <span>
              {{
                t("autoInit.phase1Summary", {
                  imported: autoInitState.phase1Imported,
                  scanned: autoInitState.phase1Scanned,
                  target: autoInitState.targetVideosEstimate,
                })
              }}
            </span>
          </div>
          <Progress :model-value="autoInitPhase1Progress" />
        </div>

        <div v-if="TAG_SYNC_ENABLED" class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">{{ t("autoInit.phase2Title") }}</span>
            <span>
              {{
                t("autoInit.phase2Summary", {
                  missing: tagEnrichmentStatus?.totalMissing ?? 0,
                  processed: tagEnrichmentStatus?.lastBatchProcessed ?? 0,
                  bound: tagEnrichmentStatus?.lastBatchBound ?? 0,
                })
              }}
            </span>
          </div>
          <Progress :model-value="autoInitTagProgress" />
          <div class="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              :disabled="tagEnrichmentLoading"
              @click="refreshTagEnrichmentState"
            >
              {{ t("sync.reloadTagEnrich") }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="tagEnrichmentLoading || (tagEnrichmentStatus?.paused ?? true)"
              @click="pauseTagEnrichmentFromUi"
            >
              {{ t("sync.pauseTagEnrich") }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="tagEnrichmentLoading || !(tagEnrichmentStatus?.paused ?? false)"
              @click="resumeTagEnrichmentFromUi"
            >
              {{ t("sync.resumeTagEnrich") }}
            </Button>
            <Button
              size="sm"
              :disabled="tagEnrichmentLoading || (tagEnrichmentStatus?.paused ?? false)"
              @click="runTagEnrichmentNowFromUi"
            >
              {{ t("sync.runTagEnrichNow") }}
            </Button>
          </div>
        </div>

        <p
          v-if="autoInitState.lastError"
          class="text-xs text-amber-600 dark:text-amber-400 whitespace-pre-wrap"
        >
          {{ autoInitState.lastError }}
        </p>
        <p
          v-if="TAG_SYNC_ENABLED && tagEnrichmentStatus?.lastError"
          class="text-xs text-amber-600 dark:text-amber-400 whitespace-pre-wrap"
        >
          {{ tagEnrichmentStatus.lastError }}
        </p>
      </section>

      <ManagerPanel
        v-if="!trashMode"
        :t="t"
        :locale="locale"
        :keyword="keyword"
        :tags="tags"
        :from-date="fromDate"
        :to-date="toDate"
        :videos="videos"
        :loading="loading"
        :selected-video-ids="selectedVideoIds"
        :batch-panel-open="batchPanelOpen"
        :folders="folders"
        :batch-target-folder-id="batchTargetFolderId"
        :can-move-from-current-folder="canMoveFromCurrentFolder"
        :batch-panel-classes="headerBatchPanelClasses"
        :batch-outline-button-classes="headerBatchOutlineButtonClasses"
        :batch-secondary-button-classes="headerBatchSecondaryButtonClasses"
        :batch-select-trigger-classes="headerBatchSelectTriggerClasses"
        :batch-selected-text-classes="headerBatchSelectedTextClasses"
        :video-page="videoPage"
        :video-total-pages="videoTotalPages"
        :total="total"
        :video-page-size="videoPageSize"
        :page-size-options="PAGE_SIZE_OPTIONS"
        @update:keyword="keyword = $event"
        @update:from-date="fromDate = $event"
        @update:to-date="toDate = $event"
        @update:batch-target-folder-id="batchTargetFolderId = $event"
        @append-field-token="handleAppendFieldToken"
        @search="handleSearchSubmit"
        @clear-search="clearSearch"
        @apply-date-filter="applyDateFilter"
        @clear-date-filter="clearDateFilter"
        @toggle-batch-panel="handleBatchPanelToggle"
        @set-selection="setVideoSelection($event.id, $event.checked)"
        @select-all-visible="selectAllVisible"
        @clear-video-selection="clearVideoSelection"
        @quick-action="handleQuickAction"
        @detail="openVideoDetail"
        @prev-video-page="prevVideoPage"
        @next-video-page="nextVideoPage"
        @jump-video-page="goToVideoPage($event)"
        @video-page-size-change="handleVideoPageSizeChange($event)"
        @batch-copy="handleBatchMoveOrCopy('copy')"
        @batch-move="handleBatchMoveOrCopy('move')"
        @batch-delete="handleBatchDelete('global')"
      />

      <TrashPanel
        v-else
        :t="t"
        :loading="loading"
        :trash-folders="trashFolders"
        :paged-trash-folders="pagedTrashFolders"
        :trash-videos="trashVideos"
        :trash-video-total="trashVideoTotal"
        :selected-trash-folder-ids="selectedTrashFolderIds"
        :selected-trash-video-ids="selectedTrashVideoIds"
        :trash-folder-page="trashFolderPage"
        :trash-folder-total-pages="trashFolderTotalPages"
        :trash-folder-page-size="trashFolderPageSize"
        :trash-folder-page-size-options="TRASH_FOLDER_PAGE_SIZE_OPTIONS"
        :trash-video-page="trashVideoPage"
        :trash-video-total-pages="trashVideoTotalPages"
        :trash-video-page-size="trashVideoPageSize"
        :trash-video-page-size-options="TRASH_VIDEO_PAGE_SIZE_OPTIONS"
        :is-trash-folder-selected="isTrashFolderSelected"
        :is-trash-video-selected="isTrashVideoSelected"
        @select-all-trash-folders="selectAllTrashFolders"
        @clear-trash-folder-selection="clearTrashFolderSelection"
        @batch-restore-trash-folders="batchRestoreTrashFolders"
        @batch-purge-trash-folders="batchPurgeTrashFolders"
        @set-trash-folder-selection="setTrashFolderSelection($event.id, $event.checked)"
        @prev-trash-folder-page="prevTrashFolderPage"
        @next-trash-folder-page="nextTrashFolderPage"
        @trash-folder-page-size-change="handleTrashFolderPageSizeChange($event)"
        @restore-folder-from-trash="handleRestoreFolderFromTrash"
        @purge-folder-from-trash="handlePurgeFolderFromTrash"
        @select-all-trash-videos="selectAllTrashVideos"
        @clear-trash-video-selection="clearTrashVideoSelection"
        @batch-restore-trash-videos="batchRestoreTrashVideos"
        @batch-purge-trash-videos="batchPurgeTrashVideos"
        @set-trash-video-selection="setTrashVideoSelection($event.id, $event.checked)"
        @prev-trash-video-page="prevTrashVideoPage"
        @next-trash-video-page="nextTrashVideoPage"
        @trash-video-page-size-change="handleTrashVideoPageSizeChange($event)"
        @restore-video-from-trash="handleRestoreVideoFromTrash"
        @purge-video-from-trash="handlePurgeVideoFromTrash"
      />
    </section>

    <ManageTagsDialog
      :open="toolsOpen"
      :t="t"
      :custom-tags="customTags"
      :paged-custom-tags="pagedManageCustomTags"
      :page="manageCustomTagPage"
      :total-pages="manageCustomTagTotalPages"
      :new-tag-name="newCustomTagName"
      @update:open="toolsOpen = $event"
      @update:new-tag-name="newCustomTagName = $event"
      @create-tag="handleCreateCustomTag()"
      @rename-tag="openRenameCustomTagDialog"
      @delete-tag="handleDeleteCustomTag"
      @prev-page="prevManageCustomTagPage"
      @next-page="nextManageCustomTagPage"
    />

    <AutoInitSetupDialog
      :open="autoInitDialogOpen"
      :t="t"
      :loading="autoInitSubmitting || autoInitRunning"
      :fetching-folders="autoInitFetchingFolders"
      :folders="autoInitFolders"
      :selected-folder-ids="autoInitSelectedFolderIds"
      @update:open="autoInitDialogOpen = $event"
      @reload="loadAutoInitFolderOptions(true)"
      @toggle-folder="(remoteId, checked) => toggleAutoInitFolder(remoteId, checked)"
      @start="confirmAutoInitSetup"
    />

    <BidirectionalSyncSettingsDialog
      :open="bidirectionalSyncDialogOpen"
      :t="t"
      :loading="bidirectionalSyncSaving"
      :settings="bidirectionalSyncSettings"
      @update:open="bidirectionalSyncDialogOpen = $event"
      @reload="refreshBidirectionalSyncSettings"
      @save="saveBidirectionalSyncSettings"
    />

    <WebDavBackupDialog
      :open="webdavDialogOpen"
      :t="t"
      :loading="webdavBusy"
      :settings="webdavSettings"
      @update:open="webdavDialogOpen = $event"
      @reload="refreshWebDavSettings"
      @save="saveWebDavSettings"
      @test="testWebDavFromUi"
      @upload="uploadWebDavFromUi"
      @download="downloadWebDavFromUi"
      @restore="restoreWebDavFromUi"
    />

    <SyncImportDialog
      :open="syncDialogOpen"
      :t="t"
      :loading="syncingImport"
      :fetching-folders="syncFetchingFolders"
      :folders="syncFolders"
      :selected-folder-ids="syncSelectedFolderIds"
      :chunk-size="syncChunkSize"
      :include-tag-enrichment="syncIncludeTagEnrichment"
      :resume-page="syncResumePage"
      :tag-enrichment-status="tagEnrichmentStatus"
      :tag-enrichment-loading="tagEnrichmentLoading"
      @update:open="syncDialogOpen = $event"
      @reload="loadSyncFolderOptions(true)"
      @toggle-folder="(remoteId, checked) => toggleSyncFolder(remoteId, checked)"
      @update:chunk-size="syncChunkSize = $event"
      @update:include-tag-enrichment="syncIncludeTagEnrichment = $event"
      @refresh-tag-enrichment="refreshTagEnrichmentState"
      @pause-tag-enrichment="pauseTagEnrichmentFromUi"
      @resume-tag-enrichment="resumeTagEnrichmentFromUi"
      @run-tag-enrichment="runTagEnrichmentNowFromUi"
      @submit="submitSyncImport"
    />

    <ConfirmActionDialog
      :open="confirmDialogOpen"
      :cancel-text="t('common.cancel')"
      :title="confirmDialogTitle"
      :description="confirmDialogDescription"
      :confirm-text="confirmDialogConfirmText"
      :variant="confirmDialogVariant"
      @update:open="setConfirmDialogOpen($event)"
      @cancel="resolveConfirmDialog(false)"
      @confirm="resolveConfirmDialog(true)"
    />

    <RenameTagDialog
      :open="renameTagDialogOpen"
      :t="t"
      :value="renameTagValue"
      @update:open="setRenameDialogOpen($event)"
      @update:value="renameTagValue = $event"
      @submit="submitRenameCustomTag"
    />

    <VideoDetailDialog
      :open="detailOpen"
      :t="t"
      :loading="detailLoading"
      :saving="detailSaving"
      :detail-video="detailVideo"
      @update:open="detailOpen = $event"
      @save="handleSaveVideoDetail"
    />
    <input
      ref="importFileInput"
      class="sr-only"
      type="file"
      accept=".json,.csv,application/json,text/csv"
      @change="handleImportFilePicked"
    />
  </main>
</template>
