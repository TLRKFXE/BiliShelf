<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import ConfirmActionDialog from "./components/dialogs/ConfirmActionDialog.vue";
import ManageTagsDialog from "./components/dialogs/ManageTagsDialog.vue";
import RenameTagDialog from "./components/dialogs/RenameTagDialog.vue";
import SyncImportDialog from "./components/dialogs/SyncImportDialog.vue";
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
  fetchBilibiliSyncFolders,
  importLibrary,
  syncFromBilibili,
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
const syncFetchingFolders = ref(false);
const syncFolders = ref<SyncRemoteFolder[]>([]);
const syncSelectedFolderIds = ref<number[]>([]);
const syncChunkSize = ref(20);
const syncSpeedMode = ref<"stable" | "balanced" | "fast">("balanced");
const syncIncludeTagEnrichment = ref(true);
const SYNC_CURSOR_STORAGE_KEY = "bilishelf-sync-cursors-v1";
const SYNC_CHUNK_DELAY_MS = 1100;
const SYNC_CHUNK_DELAY_JITTER_MS = 500;
const SYNC_MAX_ROUNDS = 800;
const EXPORT_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const LAST_EXPORT_AT_KEY = "bilishelf-last-export-at";
const LAST_EXPORT_REMINDER_DAY_KEY = "bilishelf-last-export-reminder-day";
const importFileInput = ref<HTMLInputElement | null>(null);

const SYNC_SPEED_PROFILES = {
  stable: {
    pagesPerRound: 1,
    delayMs: 1200,
    jitterMs: 450
  },
  balanced: {
    pagesPerRound: 2,
    delayMs: 650,
    jitterMs: 220
  },
  fast: {
    pagesPerRound: 3,
    delayMs: 260,
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

async function openSyncImportDialog() {
  syncDialogOpen.value = true;
  await loadSyncFolderOptions();
}

function toggleSyncFolder(remoteId: number, checked: boolean) {
  if (!checked) {
    syncSelectedFolderIds.value = syncSelectedFolderIds.value.filter((id) => id !== remoteId);
    return;
  }
  syncSelectedFolderIds.value = [remoteId];
}

async function submitSyncImport() {
  if (syncingImport.value || exportingLibrary.value) return;
  if (syncSelectedFolderIds.value.length !== 1) {
    notifyError(t("toast.syncPickOneFolder"));
    return;
  }

  syncingImport.value = true;
  try {
    const selectedRemoteFolderId = syncSelectedFolderIds.value[0];
    const chunkSize = Math.max(10, Math.min(30, Math.trunc(syncChunkSize.value || 20)));
    const speedProfile = SYNC_SPEED_PROFILES[syncSpeedMode.value];
    const maxPagesPerRound = Math.max(1, speedProfile.pagesPerRound);

    let startPage = getSyncResumePage(selectedRemoteFolderId);
    let rounds = 0;
    let foldersSynced = 0;
    let videosImported = 0;
    let riskBlocked = false;
    let hasMorePage = true;
    let errorsOmittedTotal = 0;
    const allErrors: Array<{ folder: string; message: string }> = [];

    while (hasMorePage && !riskBlocked && rounds < SYNC_MAX_ROUNDS) {
      rounds += 1;
      const result = await syncFromBilibili({
        selectedRemoteFolderIds: [selectedRemoteFolderId],
        startPage,
        includeTagEnrichment: syncIncludeTagEnrichment.value,
        maxFolders: 1,
        maxPagesPerFolder: maxPagesPerRound,
        maxVideosPerFolder: Math.max(20, chunkSize * maxPagesPerRound)
      });

      foldersSynced = Math.max(foldersSynced, result.summary.foldersSynced);
      videosImported += result.summary.folderLinksAdded;
      riskBlocked = riskBlocked || Boolean(result.riskBlocked);
      errorsOmittedTotal += Number(result.errorsOmitted ?? 0);
      allErrors.push(...(result.errors ?? []));

      const nextPage = typeof result.nextPage === "number" ? result.nextPage : null;
      hasMorePage = Boolean(result.hasMorePage) && nextPage !== null;
      if (!hasMorePage) {
        setSyncResumePage(selectedRemoteFolderId, null);
        break;
      }

      startPage = nextPage as number;
      setSyncResumePage(selectedRemoteFolderId, startPage);
      if (riskBlocked) break;
      const waitMs =
        speedProfile.delayMs +
        Math.floor(Math.random() * speedProfile.jitterMs);
      await sleepMs(waitMs);
    }

    if (rounds >= SYNC_MAX_ROUNDS && hasMorePage) {
      allErrors.push({
        folder: "__sync__",
        message: "Sync reached safety round limit and stopped early. Re-run sync to continue."
      });
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
      errorsOmittedTotal > 0
        ? t("toast.syncHiddenErrors", {
            count: errorsOmittedTotal
          })
        : "",
      hiddenCount > 0
        ? t("toast.syncHiddenErrors", { count: hiddenCount })
        : "",
      systemError?.message || ""
    ]
      .filter(Boolean)
      .join(" | ");

    const fullyFailed = videosImported === 0 && allErrors.length > 0;
    if (fullyFailed) {
      notifyError(t("toast.syncFail"), errorDesc || t("common.requestFailed"));
      return;
    }

    syncDialogOpen.value = false;
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

    if (videosImported > 0 && getSyncResumePage(selectedRemoteFolderId) > 1) {
      notifySuccess(
        t("toast.syncResumeSaved"),
        t("toast.syncResumeSavedDesc", {
          page: getSyncResumePage(selectedRemoteFolderId)
        })
      );
    }
  } catch (error) {
    console.error(error);
    notifyError(t("toast.syncFail"), error);
  } finally {
    syncingImport.value = false;
  }
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
    await applyViewMode(nextName === "trash");
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

onMounted(async () => {
  uiStore.initFromStorage();
  if (route.name === "manager") {
    applyManagerQuery(route.query);
  }
  loading.value = true;
  try {
    await libraryStore.ensureBootstrapped();
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
    }
    routeReady.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main
    class="mx-auto grid min-h-screen w-full max-w-[1840px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[320px_1fr] lg:px-6 lg:py-8"
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

    <section class="min-w-0 space-y-5">
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
        @sync-import="openSyncImportDialog"
        @import-file="openImportFileDialog"
        @export-json="handleExport('json')"
        @export-csv="handleExport('csv')"
        @toggle-trash="toggleTrashMode(!trashMode)"
        @toggle-locale="toggleLocale"
        @toggle-theme="toggleTheme"
      />

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
      @update:open="syncDialogOpen = $event"
      @reload="loadSyncFolderOptions(true)"
      @toggle-folder="(remoteId, checked) => toggleSyncFolder(remoteId, checked)"
      @update:chunk-size="syncChunkSize = $event"
      @update:include-tag-enrichment="syncIncludeTagEnrichment = $event"
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
