<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { Button } from "./components/ui/button";
import { Progress } from "./components/ui/progress";
import ConfirmActionDialog from "./components/dialogs/ConfirmActionDialog.vue";
import ManageTagsDialog from "./components/dialogs/ManageTagsDialog.vue";
import RenameTagDialog from "./components/dialogs/RenameTagDialog.vue";
import SyncImportDialog from "./components/dialogs/SyncImportDialog.vue";
import AutoInitSetupDialog from "./components/dialogs/AutoInitSetupDialog.vue";
import AiOrganizerDialog from "./components/dialogs/AiOrganizerDialog.vue";
import AiSettingsDialog from "./components/dialogs/AiSettingsDialog.vue";
import WebDavBackupDialog from "./components/dialogs/WebDavBackupDialog.vue";
import VideoDetailDialog from "./components/dialogs/VideoDetailDialog.vue";
import FollowingUpImportDialog from "./components/dialogs/FollowingUpImportDialog.vue";
import AiCategoryBrowser from "./components/AiCategoryBrowser.vue";
import AiOrganizerStatusBar from "./components/AiOrganizerStatusBar.vue";
import TagEnrichmentStatusBar from "./components/sync/TagEnrichmentStatusBar.vue";
import FavoritesSyncStatusBar from "./components/sync/FavoritesSyncStatusBar.vue";
import ManagerFolderNavigation from "./components/layout/ManagerFolderNavigation.vue";
import ManagerHeader from "./components/layout/ManagerHeader.vue";
import ManagerPanel from "./components/panels/ManagerPanel.vue";
import CommentsPanel from "./components/panels/CommentsPanel.vue";
import FavoriteArticlesPanel from "./components/panels/FavoriteArticlesPanel.vue";
import FollowingUpPanel from "./components/panels/FollowingUpPanel.vue";
import TrashPanel from "./components/panels/TrashPanel.vue";
import {
  PAGE_SIZE_OPTIONS,
  TRASH_CONTENT_PAGE_SIZE_OPTIONS,
  TRASH_FOLDER_PAGE_SIZE_OPTIONS,
  TRASH_VIDEO_PAGE_SIZE_OPTIONS,
  useLibraryStore,
} from "./stores/library";
import { useAppUiStore } from "./stores/app-ui";
import { parseKeyword as parseKeywordFromUtils } from "./lib/search-keyword";
import {
  canOpenAiCategoryBrowser,
  loadAllAiBrowserVideos,
} from "./lib/ai-category-browser.js";
import { MANAGER_I18N } from "./lib/manager-i18n";
import {
  BACKUP_REMINDER_CHECK_INTERVAL_MS,
  formatLocalDay,
  shouldShowBackupReminder,
} from "./lib/backup-reminder.js";
import {
  clearFolderSelection,
  estimateSelectedVideoCount,
  orderSelectedFolderIds,
  selectAllFolderIds,
  toggleFolderSelection,
} from "./lib/sync-folder-selection.js";
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
  clearFolderAiCategories,
  applyAiOrganizer,
  cancelAiOrganizer,
  deleteFavoriteComment,
  deleteFavoriteArticle,
  createArticleFolder,
  deleteArticleFolder,
  downloadAiOrganizerBackup,
  exportLibrary,
  fetchAiOrganizerPreview,
  fetchAiOrganizerStatus,
  fetchFollowingUpImportStatus,
  fetchFollowingUps,
  fetchFavoriteComments,
  fetchFavoriteArticles,
  fetchArticleFolders,
  fetchAiSettings,
  fetchVideos,
  fetchFolderAiCategories,
  fetchHistoryModelSyncStatus,
  dismissHistoryModelSyncStatus,
  acknowledgeExtensionUpdateNotice,
  checkExtensionUpdate,
  dismissTagEnrichmentStatus,
  fetchExtensionUpdateStatus,
  fetchTagEnrichmentStatus,
  fetchBidirectionalSyncSettings,
  fetchWebDavSettings,
  fetchBilibiliSyncFolders,
  isExtensionLocalApiRuntime,
  importLibrary,
  markBackupReminderBackupCompleted,
  markBackupReminderShown,
  downloadWebDavBackup,
  pauseTagEnrichment,
  pauseAiOrganizer,
  resumeAiOrganizer,
  resumeTagEnrichment,
  restoreWebDavBackup,
  runFolderAiCategories,
  runTagEnrichmentNow,
  updateTagEnrichmentSettings,
  startFollowingUpImport,
  startAiOrganizer,
  startFolderPlaybackSession,
  startHistoryModelSync,
  stopHistoryModelSync,
  testWebDavConnection,
  testAiSettings,
  uploadWebDavBackup,
  updateAiSettings,
  updateArticleFolder,
  updateAiOrganizerAssignment,
  updateBidirectionalSyncSettings,
  updateWebDavSettings,
  type BidirectionalSyncSettings,
  type ExtensionUpdateStatus,
  type HistoryModelSyncStatus,
  type TagEnrichmentSettings,
  type TagEnrichmentStatus,
  type WebDavSettings,
  updateVideo,
  reorderArticleFolders,
  undoAiOrganizer,
  type SyncRemoteFolder,
} from "./lib/api";
import type {
  AiCategoryKey,
  AiOrganizerConfig,
  AiOrganizerPreviewItem,
  AiOrganizerStatus,
  AiSettings,
  FollowingUpImportStatus,
  FavoriteComment,
  FavoriteArticle,
  ArticleFolder,
  FollowedUp,
  Folder,
  FolderAiCategories,
  Pagination,
  Tag,
  Video,
  VideoFilter,
} from "./types";

const uiStore = useAppUiStore();
const {
  locale,
  isDark,
  videoCardWidth,
  commentCardWidth,
  articleCardWidth,
} = storeToRefs(uiStore);
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

const libraryStore = useLibraryStore();
const {
  folders,
  tags,
  videos,
  trashFolders,
  trashVideos,
  trashComments,
  trashArticles,
  keyword,
  selectedFolderId,
  selectedVideoIds,
  selectedTrashFolderIds,
  selectedTrashVideoIds,
  selectedTrashCommentIds,
  selectedTrashArticleIds,
  batchTargetFolderId,
  batchPanelOpen,
  fromDate,
  toDate,
  newCustomTagName,
  manageCustomTagSearch,
  manageCustomTagSort,
  manageCustomTagFilteredTotal,
  manageCustomTagPage,
  videoPage,
  videoPageSize,
  trashFolderPage,
  trashFolderPageSize,
  trashVideoPage,
  trashVideoPageSize,
  trashCommentPage,
  trashCommentPageSize,
  trashArticlePage,
  trashArticlePageSize,
  loading,
  total,
  trashVideoTotal,
  trashCommentTotal,
  trashArticleTotal,
  customTags,
  manageCustomTagTotalPages,
  pagedManageCustomTags,
  hasSelection,
  canMoveFromCurrentFolder,
  videoTotalPages,
  trashVideoTotalPages,
  trashFolderTotalPages,
  trashCommentTotalPages,
  trashArticleTotalPages,
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
const followingUpsMode = computed(() => route.name === "following-ups");
const commentsMode = computed(() => route.name === "comments");
const articlesMode = computed(() => route.name === "articles");
const syncingImport = ref(false);
const exportingLibrary = ref(false);
const importingLibrary = ref(false);
const syncDialogOpen = ref(false);
const syncHistoryStatus = shallowRef<HistoryModelSyncStatus | null>(null);
const syncStopping = ref(false);
let syncHistoryPollTimer: number | null = null;
function isHistoryModelSyncActive(status: HistoryModelSyncStatus | null) {
  return Boolean(
    status?.running ||
      (status?.phase === "waiting" && status.retryAutomatic),
  );
}
const favoritesSyncActive = computed(
  () => syncingImport.value || isHistoryModelSyncActive(syncHistoryStatus.value),
);
const favoritesSyncStatusVisible = computed(
  () =>
    !trashMode.value &&
    !followingUpsMode.value &&
    !commentsMode.value &&
    !articlesMode.value &&
    Boolean(syncHistoryStatus.value && syncHistoryStatus.value.phase !== "idle"),
);
const followingUps = ref<FollowedUp[]>([]);
const followingUpKeyword = ref("");
const followingUpLoading = ref(false);
const followingUpImportStatus = ref<FollowingUpImportStatus | null>(null);
const followingUpImportDialogOpen = ref(false);
let followingUpImportPollTimer: number | null = null;
const favoriteComments = ref<FavoriteComment[]>([]);
const favoriteCommentKeyword = ref("");
const favoriteCommentAppliedKeyword = ref("");
const favoriteCommentLoading = ref(false);
const favoriteCommentPagination = ref<Pagination>({
  page: 1,
  pageSize: 20,
  total: 0,
});
let favoriteCommentFetchToken = 0;
const favoriteArticles = ref<FavoriteArticle[]>([]);
const articleFolders = ref<ArticleFolder[]>([]);
const favoriteArticleKeyword = ref("");
const favoriteArticleAppliedKeyword = ref("");
const favoriteArticleLoading = ref(false);
const favoriteArticlePagination = ref<Pagination>({ page: 1, pageSize: 20, total: 0 });
let favoriteArticleFetchToken = 0;
const navigationFolders = computed(() =>
  articlesMode.value ? articleFolders.value : folders.value,
);
const navigationActiveFolder = computed(
  () =>
    navigationFolders.value.find((folder) => folder.id === selectedFolderId.value) ??
    null,
);
const autoInitDialogOpen = ref(false);
const syncFetchingFolders = ref(false);
const syncFolders = ref<SyncRemoteFolder[]>([]);
const syncSelectedFolderIds = ref<number[]>([]);
const autoInitFetchingFolders = ref(false);
const autoInitFolders = ref<SyncRemoteFolder[]>([]);
const autoInitSelectedFolderIds = ref<number[]>([]);
const autoInitSubmitting = ref(false);
const tagEnrichmentStatus = ref<TagEnrichmentStatus | null>(null);
const tagEnrichmentLoading = ref(false);
const tagSelectedFolderIds = ref<number[]>([]);
const tagEnrichmentStatusVisible = computed(() => {
  const status = tagEnrichmentStatus.value;
  if (!status) return false;
  if (status.phase !== "idle") return true;
  return (
    (syncHistoryStatus.value?.startedAt ?? 0) > (status.dismissedAt ?? 0)
  );
});
const tagEnrichmentSettings = computed<TagEnrichmentSettings | null>(() => {
  const status = tagEnrichmentStatus.value;
  if (!status) return null;
  return {
    batchSize: status.batchSize,
    intervalSeconds: status.intervalSeconds,
    batchSizeMin: status.batchSizeMin,
    batchSizeMax: status.batchSizeMax,
    intervalSecondsMin: status.intervalSecondsMin,
    intervalSecondsMax: status.intervalSecondsMax,
  };
});
const aiSettingsDialogOpen = ref(false);
const settingsSection = ref<
  "ai" | "listener" | "tags" | "language" | "theme" | "cards" | "about"
>("ai");
const extensionUpdateStatus = ref<ExtensionUpdateStatus | null>(null);
const extensionUpdateLoading = ref(false);
const reopenAiOrganizerAfterSettings = ref(false);
const aiSettings = ref<AiSettings | null>(null);
const aiSettingsBusy = ref(false);
const aiOrganizerDialogOpen = ref(false);
const aiOrganizerStatus = ref<AiOrganizerStatus | null>(null);
const aiOrganizerBusy = ref(false);
const aiOrganizerPreviewItems = ref<AiOrganizerPreviewItem[]>([]);
const aiOrganizerPreviewPagination = ref<Pagination | null>(null);
const aiOrganizerPreviewLowOnly = ref(false);
let aiOrganizerPollTimer: number | null = null;
const aiOrganizerStatusBarVisible = computed(() => {
  const phase = aiOrganizerStatus.value?.phase;
  return (
    Boolean(aiOrganizerStatus.value?.id) &&
    !trashMode.value &&
    !followingUpsMode.value &&
    !commentsMode.value &&
    !articlesMode.value &&
    ["planning", "classifying", "waiting", "paused", "ready", "failed"].includes(
      phase ?? "idle",
    )
  );
});
const selectedFolderAiCategories = ref<FolderAiCategories | null>(null);
const folderAiCategoriesCache = ref<Record<number, FolderAiCategories>>({});
const aiRunningFolderId = ref<number | null>(null);
const aiCategoryBrowserOpen = ref(false);
const aiCategoryBrowserCategory = ref<AiCategoryKey | null>(null);
const aiBrowserFolderVideos = ref<Record<number, Video[]>>({});
const aiBrowserFolderVideosLoading = ref<Record<number, boolean>>({});
const bidirectionalSyncSettings = ref<BidirectionalSyncSettings | null>(null);
const bidirectionalSyncSaving = ref(false);
const webdavDialogOpen = ref(false);
const webdavSettings = ref<WebDavSettings | null>(null);
const webdavBusy = ref(false);
const AI_CATEGORIES_ENABLED = false;
const EXTENSION_LOCAL_API_RUNTIME = isExtensionLocalApiRuntime();
const AI_ORGANIZER_ENABLED = EXTENSION_LOCAL_API_RUNTIME;
const TAG_SYNC_ENABLED = EXTENSION_LOCAL_API_RUNTIME;
const BILIBILI_LISTENER_SETTINGS_ENABLED = EXTENSION_LOCAL_API_RUNTIME;
const autoInitRunning = ref(false);
const AUTO_INIT_STATE_KEY = "bilishelf-auto-init-v3";
const AUTO_INIT_LOCK_KEY = "bilishelf-auto-init-v3.lock";
const AUTO_INIT_LOCK_TTL_MS = 90_000;
const AUTO_INIT_PROBE_SCHEDULE_MS = [
  30_000, 45_000, 60_000, 90_000, 120_000, 180_000, 300_000,
];
const AUTO_INIT_STATE_TIMEOUT_MS = 6 * 60 * 1000;
const SYNC_CURSOR_STORAGE_KEY = "bilishelf-sync-cursors-v1";
const LAST_EXPORT_AT_KEY = "bilishelf-last-export-at";
const LAST_EXPORT_REMINDER_DAY_KEY = "bilishelf-last-export-reminder-day";
const importFileInput = ref<HTMLInputElement | null>(null);
const autoInitOwnerId = `tab-${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;
const tickNow = ref(Date.now());
let autoInitHeartbeatTimer: number | null = null;
let tagEnrichmentPollTimer: number | null = null;
let syncLiveRefreshTimer: number | null = null;
let syncLiveRefreshRunning = false;
let syncLiveRefreshPending = false;
let autoInitRetryTimer: number | null = null;
let tickTimer: number | null = null;
let exportReminderTimer: number | null = null;
let folderAiFetchToken = 0;

const { notifySuccess, notifyError } = useAppToast(t);
const { detailOpen, detailLoading, detailVideo, openVideoDetail } =
  useVideoDetail(t, notifyError);
const detailSaving = ref(false);
const isBusy = computed(() => loading.value || detailLoading.value);
const progressValue = useLoadingProgress(isBusy);
const activeFolder = computed<Folder | null>(() => {
  const folderId = selectedFolderId.value;
  if (folderId === null) return null;
  return folders.value.find((item) => item.id === folderId) ?? null;
});
const selectedFolderHasAiRecord = computed(
  () => AI_CATEGORIES_ENABLED && selectedFolderAiCategories.value !== null
);
const selectedFolderCanOpenAiBrowser = computed(() => {
  if (!AI_CATEGORIES_ENABLED || trashMode.value || selectedFolderId.value === null) {
    return false;
  }
  return canOpenAiCategoryBrowser(selectedFolderAiCategories.value);
});
const aiCategoryBrowserVideos = computed(() => {
  const folderId = activeFolder.value?.id;
  if (!folderId) return [] as Video[];
  return aiBrowserFolderVideos.value[folderId] ?? [];
});
const aiCategoryBrowserVideosLoading = computed(() => {
  const folderId = activeFolder.value?.id;
  if (!folderId) return false;
  return Boolean(aiBrowserFolderVideosLoading.value[folderId]);
});
const {
  currentViewLabel: headerCurrentViewLabel,
  currentScopeLabel: headerCurrentScopeLabel,
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
  followingUpsMode,
  commentsMode,
  articlesMode,
  selectedFolderId,
  folders: navigationFolders,
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

const { prevManageCustomTagPage, nextManageCustomTagPage } =
  useManageTagsDialog({
    toolsOpen,
    manageCustomTagPage,
    manageCustomTagTotalPages,
    manageCustomTagSearch,
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

async function refreshVideos(options: { silent?: boolean } = {}) {
  if (trashMode.value) return;
  try {
    const { extracted, globalKeyword } = parseKeywordFromUtils(keyword.value);
    await refreshVideosData({
      extracted,
      globalKeyword,
      silent: options.silent === true,
    });
  } catch (error) {
    console.error(error);
    notifyError(t("toast.loadVideosFail"), error);
  }
}

async function loadFollowingUps() {
  followingUpLoading.value = true;
  try {
    followingUps.value = await fetchFollowingUps();
  } catch (error) {
    notifyError(t("toast.followingUpsLoadFail"), error);
  } finally {
    followingUpLoading.value = false;
  }
}

async function refreshFollowingUpImportStatus() {
  try {
    followingUpImportStatus.value = await fetchFollowingUpImportStatus();
    if (followingUpImportStatus.value.running) {
      stopFollowingUpImportPolling();
      followingUpImportPollTimer = window.setTimeout(refreshFollowingUpImportStatus, 2000);
      return;
    }
    stopFollowingUpImportPolling();
    await loadFollowingUps();
    if (followingUpImportStatus.value.current > 0) {
      notifySuccess(t("toast.followingUpsImportDone"));
    }
  } catch (error) {
    stopFollowingUpImportPolling();
    notifyError(t("toast.followingUpsImportFail"), error);
  }
}

async function handleStartFollowingUpImport() {
  try {
    const response = await startFollowingUpImport();
    followingUpImportStatus.value = response.status;
    if (response.status.running || response.started) {
      stopFollowingUpImportPolling();
      followingUpImportPollTimer = window.setTimeout(refreshFollowingUpImportStatus, 1200);
    } else {
      await loadFollowingUps();
      notifySuccess(t("toast.followingUpsImportDone"));
    }
  } catch (error) {
    notifyError(t("toast.followingUpsImportFail"), error);
  }
}

function stopFollowingUpImportPolling() {
  if (followingUpImportPollTimer !== null) {
    window.clearTimeout(followingUpImportPollTimer);
    followingUpImportPollTimer = null;
  }
}

function openFollowingUpSpace(record: FollowedUp) {
  window.open(record.spaceUrl, "_blank", "noopener,noreferrer");
}

async function refreshArticleFolders() {
  try {
    articleFolders.value = await fetchArticleFolders();
    if (
      articlesMode.value &&
      selectedFolderId.value !== null &&
      !articleFolders.value.some((folder) => folder.id === selectedFolderId.value)
    ) {
      selectedFolderId.value = null;
    }
  } catch (error) {
    notifyError(t("toast.articleFoldersLoadFail"), error);
  }
}

async function loadFavoriteCommentCount() {
  try {
    const result = await fetchFavoriteComments({ page: 1, pageSize: 1 });
    favoriteCommentPagination.value.total = result.pagination.total;
    maybeNotifyExportReminder();
  } catch (error) {
    console.warn("[comments] count failed:", error);
  }
}

async function loadFavoriteArticleCount() {
  try {
    const result = await fetchFavoriteArticles({ page: 1, pageSize: 1 });
    favoriteArticlePagination.value.total = result.pagination.total;
    maybeNotifyExportReminder();
  } catch (error) {
    console.warn("[articles] count failed:", error);
  }
}

async function loadFavoriteComments() {
  const token = ++favoriteCommentFetchToken;
  favoriteCommentLoading.value = true;
  try {
    const result = await fetchFavoriteComments({
      q: favoriteCommentAppliedKeyword.value,
      page: favoriteCommentPagination.value.page,
      pageSize: favoriteCommentPagination.value.pageSize,
    });
    if (token !== favoriteCommentFetchToken) return;
    favoriteComments.value = result.items;
    favoriteCommentPagination.value = result.pagination;
    maybeNotifyExportReminder();
  } catch (error) {
    if (token !== favoriteCommentFetchToken) return;
    notifyError(t("toast.commentsLoadFail"), error);
  } finally {
    if (token === favoriteCommentFetchToken) {
      favoriteCommentLoading.value = false;
    }
  }
}

async function searchFavoriteComments() {
  favoriteCommentAppliedKeyword.value = favoriteCommentKeyword.value.trim();
  favoriteCommentPagination.value.page = 1;
  await loadFavoriteComments();
}

async function changeFavoriteCommentPage(page: number) {
  const totalPages = Math.max(
    1,
    Math.ceil(
      favoriteCommentPagination.value.total /
        favoriteCommentPagination.value.pageSize
    )
  );
  favoriteCommentPagination.value.page = Math.min(
    Math.max(1, Math.trunc(page)),
    totalPages
  );
  await loadFavoriteComments();
}

async function changeFavoriteCommentPageSize(pageSize: number) {
  favoriteCommentPagination.value.page = 1;
  favoriteCommentPagination.value.pageSize = pageSize;
  await loadFavoriteComments();
}

async function removeFavoriteComment(comment: FavoriteComment) {
  const confirmed = await openConfirmDialog({
    title: t("comments.deleteTitle"),
    description: t("comments.deleteDescription", {
      author: comment.authorName,
    }),
    confirmText: t("common.delete"),
    variant: "destructive",
  });
  if (!confirmed) return;

  favoriteCommentLoading.value = true;
  try {
    await deleteFavoriteComment(comment.id);
    if (
      favoriteComments.value.length === 1 &&
      favoriteCommentPagination.value.page > 1
    ) {
      favoriteCommentPagination.value.page -= 1;
    }
    await loadFavoriteComments();
    notifySuccess(t("toast.commentDeleted"));
  } catch (error) {
    notifyError(t("toast.commentDeleteFail"), error);
  } finally {
    favoriteCommentLoading.value = false;
  }
}

async function loadFavoriteArticles() {
  const token = ++favoriteArticleFetchToken;
  favoriteArticleLoading.value = true;
  try {
    const result = await fetchFavoriteArticles({
      q: favoriteArticleAppliedKeyword.value,
      page: favoriteArticlePagination.value.page,
      pageSize: favoriteArticlePagination.value.pageSize,
      folderId: selectedFolderId.value ?? undefined,
    });
    if (token !== favoriteArticleFetchToken) return;
    favoriteArticles.value = result.items;
    favoriteArticlePagination.value = result.pagination;
    maybeNotifyExportReminder();
  } catch (error) {
    if (token === favoriteArticleFetchToken) notifyError(t("toast.articlesLoadFail"), error);
  } finally {
    if (token === favoriteArticleFetchToken) favoriteArticleLoading.value = false;
  }
}

async function handleCreateArticleFolder(payload: {
  name: string;
  description?: string;
  groupName?: string | null;
}) {
  try {
    await createArticleFolder(payload);
    await refreshArticleFolders();
    notifySuccess(t("toast.articleFolderCreated"));
  } catch (error) {
    notifyError(t("toast.articleFolderCreateFail"), error);
  }
}

async function handleUpdateArticleFolder(payload: {
  id: number;
  name?: string;
  description?: string | null;
  groupName?: string | null;
}) {
  try {
    await updateArticleFolder(payload.id, payload);
    await refreshArticleFolders();
    notifySuccess(t("toast.articleFolderUpdated"));
  } catch (error) {
    notifyError(t("toast.articleFolderUpdateFail"), error);
  }
}

async function handleRemoveArticleFolder(id: number) {
  const confirmed = await openConfirmDialog({
    title: t("articles.deleteFolderTitle"),
    description: t("articles.deleteFolderDescription"),
    confirmText: t("common.delete"),
    variant: "destructive",
  });
  if (!confirmed) return;
  try {
    await deleteArticleFolder(id);
    if (selectedFolderId.value === id) selectedFolderId.value = null;
    await Promise.all([refreshArticleFolders(), loadFavoriteArticles()]);
    notifySuccess(t("toast.articleFolderDeleted"));
  } catch (error) {
    notifyError(t("toast.articleFolderDeleteFail"), error);
  }
}

async function handleReorderArticleFolders(folderIds: number[]) {
  if (folderIds.length === 0) return;
  try {
    await reorderArticleFolders(folderIds);
    await refreshArticleFolders();
  } catch (error) {
    notifyError(t("toast.articleFolderReorderFail"), error);
  }
}

async function removeFolderFromManager(id: number) {
  await handleRemoveFolder(id);
  if (articlesMode.value) await loadFavoriteArticles();
}

async function searchFavoriteArticles() {
  favoriteArticleAppliedKeyword.value = favoriteArticleKeyword.value.trim();
  favoriteArticlePagination.value.page = 1;
  await loadFavoriteArticles();
}

async function changeFavoriteArticlePage(page: number) {
  const totalPages = Math.max(1, Math.ceil(favoriteArticlePagination.value.total / favoriteArticlePagination.value.pageSize));
  favoriteArticlePagination.value.page = Math.min(Math.max(1, Math.trunc(page)), totalPages);
  await loadFavoriteArticles();
}

async function changeFavoriteArticlePageSize(pageSize: number) {
  favoriteArticlePagination.value.page = 1;
  favoriteArticlePagination.value.pageSize = pageSize;
  await loadFavoriteArticles();
}

async function removeFavoriteArticle(article: FavoriteArticle) {
  const confirmed = await openConfirmDialog({
    title: t("articles.deleteTitle"),
    description: t("articles.deleteDescription", { title: article.title }),
    confirmText: t("common.delete"),
    variant: "destructive",
  });
  if (!confirmed) return;
  favoriteArticleLoading.value = true;
  try {
    await deleteFavoriteArticle(article.id);
    if (favoriteArticles.value.length === 1 && favoriteArticlePagination.value.page > 1) {
      favoriteArticlePagination.value.page -= 1;
    }
    await loadFavoriteArticles();
    notifySuccess(t("toast.articleDeleted"));
  } catch (error) {
    notifyError(t("toast.articleDeleteFail"), error);
  } finally {
    favoriteArticleLoading.value = false;
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

async function refreshFoldersAndVideos(options: { silent?: boolean } = {}) {
  await Promise.all([refreshFolders(), refreshVideos(options)]);
}

async function refreshTagsAndVideos(options: { silent?: boolean } = {}) {
  await Promise.all([refreshTags(), refreshVideos(options)]);
}

async function refreshFoldersVideosAndTags(options: { silent?: boolean } = {}) {
  await Promise.all([refreshFolders(), refreshVideos(options), refreshTags()]);
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
  handleAnalyzeFolder,
  handleClearFolderAi,
  batchRestoreTrashFolders,
  batchPurgeTrashFolders,
  batchRestoreTrashVideos,
  batchPurgeTrashVideos,
  handleRestoreFolderFromTrash,
  handlePurgeFolderFromTrash,
  handleRestoreVideoFromTrash,
  handlePurgeVideoFromTrash,
  batchRestoreTrashComments,
  batchPurgeTrashComments,
  handleRestoreCommentFromTrash,
  handlePurgeCommentFromTrash,
  batchRestoreTrashArticles,
  batchPurgeTrashArticles,
  handleRestoreArticleFromTrash,
  handlePurgeArticleFromTrash,
} = useManagerActions({
  t,
  notifySuccess,
  notifyError,
  openConfirmDialog,
  selectedFolderId,
  selectedVideoIds,
  selectedTrashFolderIds,
  selectedTrashVideoIds,
  selectedTrashCommentIds,
  selectedTrashArticleIds,
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
  performFolderAiAnalysis: performFolderAiCategories,
  performClearFolderAiAnalysis: performClearFolderAiCategories,
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
  goToTrashCommentPage,
  handleTrashCommentPageSizeChange,
  goToTrashArticlePage,
  handleTrashArticlePageSizeChange,
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
  trashCommentPage,
  trashCommentTotalPages,
  selectedTrashCommentIds,
  trashCommentPageSize,
  trashArticlePage,
  trashArticleTotalPages,
  selectedTrashArticleIds,
  trashArticlePageSize,
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

async function handleSelectFolderWithAiBrowser(id: number | null) {
  if (articlesMode.value) {
    closeAiCategoryBrowser();
    selectedFolderId.value = id;
    favoriteArticlePagination.value.page = 1;
    await loadFavoriteArticles();
    return;
  }
  closeAiCategoryBrowser();
  await handleSelectFolder(id);
}

function handleBatchPanelToggle() {
  if (batchPanelOpen.value) {
    batchPanelOpen.value = false;
    clearVideoSelection();
    batchTargetFolderId.value = null;
    return;
  }
  batchPanelOpen.value = true;
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
  } catch {}
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
  unavailableVideos: number;
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
      [key]: Math.trunc(page),
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
    unavailableVideos: 0,
    lastError: "",
  };
}

function readAutoInitState() {
  try {
    const raw = window.localStorage.getItem(AUTO_INIT_STATE_KEY);
    if (!raw) return getDefaultAutoInitState();
    const parsed = JSON.parse(raw) as Partial<AutoInitState>;
    const base = getDefaultAutoInitState();
    return {
      status: (
        [
          "idle",
          "running",
          "cooldown",
          "completed",
          "failed",
        ] as AutoInitStatus[]
      ).includes(parsed.status as AutoInitStatus)
        ? (parsed.status as AutoInitStatus)
        : base.status,
      folderIds: Array.isArray(parsed.folderIds)
        ? parsed.folderIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
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
      phase1Imported: Math.max(
        0,
        Math.trunc(Number(parsed.phase1Imported ?? 0))
      ),
      phase1Scanned: Math.max(0, Math.trunc(Number(parsed.phase1Scanned ?? 0))),
      targetVideosEstimate: Math.max(
        0,
        Math.trunc(Number(parsed.targetVideosEstimate ?? 0))
      ),
      unavailableVideos: Math.max(
        0,
        Math.trunc(Number(parsed.unavailableVideos ?? 0))
      ),
      lastError: String(parsed.lastError ?? ""),
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
          ...patch,
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
  return (
    text.includes("(412)") ||
    text.includes(" 412") ||
    text.includes("risk-control")
  );
}

const autoInitPhase1Progress = computed(() => {
  const target = Math.max(0, autoInitState.value.targetVideosEstimate);
  const imported = Math.max(0, autoInitState.value.phase1Imported);
  if (autoInitState.value.status === "completed") return 100;
  if (target <= 0) {
    return imported > 0 ? Math.min(95, imported % 100) : 0;
  }
  return Math.max(0, Math.min(100, (imported / target) * 100));
});

const autoInitCooldownRemainMs = computed(() => {
  if (
    autoInitState.value.status !== "cooldown" ||
    !autoInitState.value.nextRetryAt
  )
    return 0;
  return Math.max(0, autoInitState.value.nextRetryAt - tickNow.value);
});

const autoInitStatusText = computed(() => {
  const status = autoInitState.value.status;
  if (status === "running") return t("autoInit.statusRunning");
  if (status === "cooldown") return t("autoInit.statusCooldown");
  if (status === "failed") return t("autoInit.statusFailed");
  if (status === "completed") {
    return autoInitState.value.unavailableVideos > 0
      ? t("autoInit.statusCompletedWithUnavailable", {
          count: autoInitState.value.unavailableVideos,
        })
      : t("autoInit.statusCompleted");
  }
  return t("autoInit.statusIdle");
});

const showAutoInitProgressPanel = computed(() => {
  if (trashMode.value) return false;
  return (
    autoInitState.value.status !== "idle" ||
    autoInitState.value.folderIds.length > 0
  );
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
    if (
      !parsed ||
      typeof parsed.owner !== "string" ||
      !Number.isFinite(parsed.expiresAt)
    ) {
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
  if (
    existing &&
    existing.expiresAt > ts &&
    existing.owner !== autoInitOwnerId
  ) {
    return false;
  }

  const lock = {
    owner: autoInitOwnerId,
    expiresAt: ts + AUTO_INIT_LOCK_TTL_MS,
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
      expiresAt: Date.now() + AUTO_INIT_LOCK_TTL_MS,
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
  return AUTO_INIT_PROBE_SCHEDULE_MS[
    Math.min(index, AUTO_INIT_PROBE_SCHEDULE_MS.length - 1)
  ];
}

async function probeBilibiliRiskRecovery() {
  try {
    await fetchBilibiliSyncFolders({ forceRefresh: true });
    return {
      ready: true as const,
      riskBlocked: false,
      message: "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ready: false as const,
      riskBlocked: looksLikeRiskControlError(message),
      message,
    };
  }
}

function markExportFinishedAt(timestamp = Date.now()) {
  try {
    window.localStorage.setItem(LAST_EXPORT_AT_KEY, String(timestamp));
  } catch {}
  if (EXTENSION_LOCAL_API_RUNTIME) {
    void markBackupReminderBackupCompleted(timestamp).catch((error) => {
      console.warn("[backup-reminder] failed to persist backup time:", error);
    });
  }
}

function maybeNotifyExportReminder() {
  if (EXTENSION_LOCAL_API_RUNTIME) return;
  const hasData =
    (total.value ?? 0) > 0 ||
    favoriteCommentPagination.value.total > 0 ||
    favoriteArticlePagination.value.total > 0;
  const now = Date.now();
  const dayLabel = formatLocalDay(now);
  try {
    const lastReminderDay = window.localStorage.getItem(
      LAST_EXPORT_REMINDER_DAY_KEY
    ) ?? "";
    const lastExportAtRaw = Number(
      window.localStorage.getItem(LAST_EXPORT_AT_KEY) ?? 0
    );
    const lastExportAt = Number.isFinite(lastExportAtRaw) ? lastExportAtRaw : 0;
    if (
      !shouldShowBackupReminder({
        hasData,
        now,
        lastBackupAt: lastExportAt,
        lastReminderDay,
      })
    ) return;

    window.localStorage.setItem(LAST_EXPORT_REMINDER_DAY_KEY, dayLabel);
    if (EXTENSION_LOCAL_API_RUNTIME) {
      void markBackupReminderShown().catch((error) => {
        console.warn("[backup-reminder] failed to persist reminder day:", error);
      });
    }
    notifyError(t("toast.exportReminderTitle"), t("toast.exportReminderDesc"));
  } catch {}
}

function handleExportReminderVisibility() {
  if (document.visibilityState !== "visible") return;
  maybeNotifyExportReminder();
  if (route.name !== "manager") return;
  void refreshHistoryModelSyncStatus();
  if (TAG_SYNC_ENABLED) void refreshTagEnrichmentState();
  if (favoritesSyncActive.value) scheduleSyncLibraryRefresh();
}

function startExportReminderChecks() {
  if (exportReminderTimer !== null) window.clearInterval(exportReminderTimer);
  exportReminderTimer = window.setInterval(
    maybeNotifyExportReminder,
    BACKUP_REMINDER_CHECK_INTERVAL_MS,
  );
  document.addEventListener("visibilitychange", handleExportReminderVisibility);
}

function migrateBackupReminderState() {
  if (!EXTENSION_LOCAL_API_RUNTIME) return;
  try {
    const lastExportAt = Number(
      window.localStorage.getItem(LAST_EXPORT_AT_KEY) ?? 0
    );
    if (Number.isFinite(lastExportAt) && lastExportAt > 0) {
      void markBackupReminderBackupCompleted(lastExportAt, {
        migration: true,
      }).catch((error) => {
        console.warn("[backup-reminder] migration failed:", error);
      });
    }
  } catch {}
}

async function refreshTagEnrichmentState() {
  if (!TAG_SYNC_ENABLED) {
    tagEnrichmentStatus.value = null;
    tagEnrichmentLoading.value = false;
    return;
  }
  tagEnrichmentLoading.value = true;
  try {
    applyTagEnrichmentStatus(await fetchTagEnrichmentStatus());
  } catch (error) {
    console.warn("[tag-enrichment] status failed:", error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

function applyTagEnrichmentStatus(status: TagEnrichmentStatus) {
  const previous = tagEnrichmentStatus.value;
  tagEnrichmentStatus.value = status;
  if (
    !syncDialogOpen.value &&
    tagSelectedFolderIds.value.length === 0 &&
    status.selectedFolderIds.length > 0
  ) {
    const activeFolderIds = new Set(folders.value.map((folder) => folder.id));
    tagSelectedFolderIds.value = status.selectedFolderIds.filter((folderId) =>
      activeFolderIds.has(folderId),
    );
  }
  if (
    previous &&
    (previous.processed !== status.processed ||
      previous.tagsBound !== status.tagsBound ||
      previous.phase !== status.phase) &&
    route.name === "manager"
  ) {
    void refreshTagsAndVideos({ silent: true });
  }
  return status;
}

async function pauseTagEnrichmentFromUi() {
  if (!TAG_SYNC_ENABLED) return;
  if (tagEnrichmentLoading.value) return;
  tagEnrichmentLoading.value = true;
  try {
    applyTagEnrichmentStatus(await pauseTagEnrichment());
    notifySuccess(t("toast.tagEnrichStopped"));
  } catch (error) {
    notifyError(t("toast.tagEnrichPauseFail"), error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function resumeTagEnrichmentFromUi() {
  if (!TAG_SYNC_ENABLED) return;
  if (tagEnrichmentLoading.value) return;
  tagEnrichmentLoading.value = true;
  try {
    const currentPhase = tagEnrichmentStatus.value?.phase ?? "idle";
    const startsNewTask =
      currentPhase === "idle" ||
      currentPhase === "completed" ||
      currentPhase === "failed";
    const status = applyTagEnrichmentStatus(
      await resumeTagEnrichment(
        startsNewTask
          ? { selectedFolderIds: tagSelectedFolderIds.value }
          : undefined,
      ),
    );
    notifySuccess(
      status.phase === "completed" && status.totalMissing === 0
        ? t("toast.tagEnrichNoPending")
        : t("toast.tagEnrichStarted")
    );
  } catch (error) {
    notifyError(t("toast.tagEnrichResumeFail"), error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function runTagEnrichmentNowFromUi() {
  if (!TAG_SYNC_ENABLED) return;
  if (tagEnrichmentLoading.value) return;
  tagEnrichmentLoading.value = true;
  try {
    applyTagEnrichmentStatus(await runTagEnrichmentNow());
    notifySuccess(t("toast.tagEnrichTriggered"));
  } catch (error) {
    notifyError(t("toast.tagEnrichTriggerFail"), error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function dismissTagEnrichmentFromUi() {
  if (!TAG_SYNC_ENABLED || tagEnrichmentLoading.value) return;
  tagEnrichmentLoading.value = true;
  try {
    applyTagEnrichmentStatus(await dismissTagEnrichmentStatus());
  } catch (error) {
    notifyError(t("toast.tagEnrichDismissFail"), error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function saveTagEnrichmentSettingsFromUi(payload: {
  batchSize: number;
  intervalSeconds: number;
}) {
  if (!TAG_SYNC_ENABLED || tagEnrichmentLoading.value) return;
  tagEnrichmentLoading.value = true;
  try {
    applyTagEnrichmentStatus(await updateTagEnrichmentSettings(payload));
    notifySuccess(t("toast.tagEnrichSettingsSaved"));
  } catch (error) {
    notifyError(t("toast.tagEnrichSettingsSaveFail"), error);
  } finally {
    tagEnrichmentLoading.value = false;
  }
}

async function refreshBidirectionalSyncSettings() {
  if (!BILIBILI_LISTENER_SETTINGS_ENABLED) {
    bidirectionalSyncSettings.value = null;
    return;
  }
  try {
    bidirectionalSyncSettings.value = await fetchBidirectionalSyncSettings();
  } catch (error) {
    notifyError(t("toast.syncSettingsLoadFail"), error);
  }
}

async function refreshAiSettings() {
  if (!EXTENSION_LOCAL_API_RUNTIME) {
    aiSettings.value = null;
    return;
  }
  try {
    aiSettings.value = await fetchAiSettings();
  } catch (error) {
    notifyError(t("toast.aiSettingsLoadFail"), error);
  }
}

function setFolderAiCategoryCache(
  folderId: number,
  categories: FolderAiCategories | null
) {
  const next = { ...folderAiCategoriesCache.value };
  if (categories) {
    next[folderId] = categories;
  } else {
    delete next[folderId];
  }
  folderAiCategoriesCache.value = next;
}

function clearAiBrowserFolderVideosCache(folderId: number) {
  const nextVideos = { ...aiBrowserFolderVideos.value };
  const nextLoading = { ...aiBrowserFolderVideosLoading.value };
  delete nextVideos[folderId];
  delete nextLoading[folderId];
  aiBrowserFolderVideos.value = nextVideos;
  aiBrowserFolderVideosLoading.value = nextLoading;
}

async function ensureAiBrowserFolderVideos(folderId: number) {
  if (!EXTENSION_LOCAL_API_RUNTIME) return;
  if (aiBrowserFolderVideos.value[folderId]) return;
  if (aiBrowserFolderVideosLoading.value[folderId]) return;

  aiBrowserFolderVideosLoading.value = {
    ...aiBrowserFolderVideosLoading.value,
    [folderId]: true,
  };

  try {
    const loaded = await loadAllAiBrowserVideos({
      folderId,
      pageSize: 100,
      fetchPage: fetchVideos,
    });

    aiBrowserFolderVideos.value = {
      ...aiBrowserFolderVideos.value,
      [folderId]: loaded,
    };
  } catch (error) {
    notifyError(t("toast.folderAiBrowserVideosLoadFail"), error);
  } finally {
    aiBrowserFolderVideosLoading.value = {
      ...aiBrowserFolderVideosLoading.value,
      [folderId]: false,
    };
  }
}

async function openAiCategoryBrowser() {
  const folderId = selectedFolderId.value;
  if (
    !AI_CATEGORIES_ENABLED ||
    !EXTENSION_LOCAL_API_RUNTIME ||
    trashMode.value ||
    folderId === null
  ) {
    return;
  }

  if (!selectedFolderAiCategories.value) {
    selectedFolderAiCategories.value = folderAiCategoriesCache.value[folderId] ?? null;
  }
  if (!canOpenAiCategoryBrowser(selectedFolderAiCategories.value)) return;

  aiCategoryBrowserCategory.value = null;
  aiCategoryBrowserOpen.value = true;
  void ensureAiBrowserFolderVideos(folderId);
}

function closeAiCategoryBrowser() {
  aiCategoryBrowserOpen.value = false;
  aiCategoryBrowserCategory.value = null;
}

function openAiCategory(category: AiCategoryKey) {
  aiCategoryBrowserCategory.value = category;
}

async function refreshSelectedFolderAiCategories(folderId: number | null) {
  const requestToken = ++folderAiFetchToken;
  if (
    !AI_CATEGORIES_ENABLED ||
    !EXTENSION_LOCAL_API_RUNTIME ||
    trashMode.value ||
    folderId === null
  ) {
    selectedFolderAiCategories.value = null;
    return;
  }

  try {
    const categories = await fetchFolderAiCategories(folderId);
    if (requestToken !== folderAiFetchToken) return;
    if (selectedFolderId.value !== folderId || trashMode.value) return;
    selectedFolderAiCategories.value = categories;
    setFolderAiCategoryCache(folderId, categories);
  } catch (error) {
    if (requestToken !== folderAiFetchToken) return;
    selectedFolderAiCategories.value = null;
    notifyError(t("toast.folderAiLoadFail"), error);
  }
}

async function handleStartFolderPlayback(folderId: number) {
  if (!EXTENSION_LOCAL_API_RUNTIME) {
    notifyError(t("toast.playbackStartFail"), "Extension runtime is unavailable");
    return;
  }
  if (trashMode.value || selectedFolderId.value !== folderId) {
    notifyError(
      t("toast.playbackStartFail"),
      "Please start playback from the active folder."
    );
    return;
  }

  const { extracted, globalKeyword } = parseKeywordFromUtils(keyword.value);
  const filters: VideoFilter = {};
  if (fromDate.value.trim()) {
    const from = new Date(fromDate.value).getTime();
    if (!Number.isNaN(from)) filters.from = from;
  }
  if (toDate.value.trim()) {
    const to = new Date(toDate.value).getTime();
    if (!Number.isNaN(to)) filters.to = to;
  }
  if (extracted.title) filters.title = extracted.title;
  if (extracted.uploader) filters.uploader = extracted.uploader;
  if (extracted.description) filters.description = extracted.description;
  if (extracted.systemTag) filters.systemTag = extracted.systemTag;
  if (extracted.customTag) filters.customTag = extracted.customTag;

  try {
    const result = await startFolderPlaybackSession({
      folderId,
      q: globalKeyword || undefined,
      filters,
      openTab: true,
    });
    if (!result.firstItem?.url) {
      throw new Error("No playable videos in the current folder scope.");
    }

    if (!result.opened) {
      throw new Error("The browser could not open the playback tab.");
    }
    notifySuccess(
      t("toast.playbackStarted"),
      t("toast.playbackStartedDesc", { count: result.playable })
    );
    if (result.skippedInvalid > 0) {
      notifySuccess(
        t("toast.playbackSkippedInvalid"),
        t("toast.playbackSkippedInvalidDesc", {
          count: result.skippedInvalid,
        })
      );
    }
    if (result.truncated) {
      notifySuccess(
        t("toast.playbackTruncated"),
        t("toast.playbackTruncatedDesc", { count: result.playable })
      );
    }
  } catch (error) {
    notifyError(t("toast.playbackStartFail"), error);
  }
}

async function performFolderAiCategories(folderId: number) {
  if (!AI_CATEGORIES_ENABLED || !EXTENSION_LOCAL_API_RUNTIME) {
    throw new Error("AI categorization is unavailable in this runtime.");
  }
  if (selectedFolderId.value !== folderId || trashMode.value) {
    throw new Error("Please categorize the active folder.");
  }
  if (aiRunningFolderId.value !== null) {
    throw new Error("AI categorization is already running.");
  }

  aiRunningFolderId.value = folderId;
  try {
    const categories = await runFolderAiCategories(folderId);
    if (selectedFolderId.value === folderId && !trashMode.value) {
      selectedFolderAiCategories.value = categories;
      setFolderAiCategoryCache(folderId, categories);
      if (canOpenAiCategoryBrowser(categories)) {
        aiCategoryBrowserCategory.value = null;
        aiCategoryBrowserOpen.value = true;
        void ensureAiBrowserFolderVideos(folderId);
      }
    }
  } catch (error) {
    if (selectedFolderId.value === folderId && !trashMode.value) {
      await refreshSelectedFolderAiCategories(folderId);
    }
    throw error;
  } finally {
    if (aiRunningFolderId.value === folderId) {
      aiRunningFolderId.value = null;
    }
  }
}

async function performClearFolderAiCategories(folderId: number) {
  if (!AI_CATEGORIES_ENABLED || !EXTENSION_LOCAL_API_RUNTIME) {
    throw new Error("AI categorization is unavailable in this runtime.");
  }

  await clearFolderAiCategories(folderId);
  setFolderAiCategoryCache(folderId, null);
  clearAiBrowserFolderVideosCache(folderId);
  if (selectedFolderId.value === folderId) {
    selectedFolderAiCategories.value = null;
    closeAiCategoryBrowser();
  }
}

function openSettingsDialog(
  section: "ai" | "listener" | "tags" | "language" | "theme" | "cards" | "about" = "ai",
) {
  settingsSection.value = EXTENSION_LOCAL_API_RUNTIME ? section : "language";
  reopenAiOrganizerAfterSettings.value = aiOrganizerDialogOpen.value;
  aiOrganizerDialogOpen.value = false;
  aiSettingsDialogOpen.value = true;
  if (EXTENSION_LOCAL_API_RUNTIME) {
    void refreshExtensionUpdateState();
    void refreshAiSettings();
    void refreshBidirectionalSyncSettings();
    if (TAG_SYNC_ENABLED) void refreshTagEnrichmentState();
  }
}

function openAiSettingsDialog() {
  openSettingsDialog("ai");
}

function handleAiSettingsDialogOpen(value: boolean) {
  aiSettingsDialogOpen.value = value;
  if (value || !reopenAiOrganizerAfterSettings.value) return;
  reopenAiOrganizerAfterSettings.value = false;
  void openAiOrganizerDialog();
}

async function saveAiSettings(payload: {
  provider?: AiSettings["provider"];
  customProviderName?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  enabled?: boolean;
}) {
  if (!EXTENSION_LOCAL_API_RUNTIME) return;
  if (aiSettingsBusy.value) return;
  const organizerActive =
    aiOrganizerStatus.value?.phase === "planning" ||
    aiOrganizerStatus.value?.phase === "classifying" ||
    aiOrganizerStatus.value?.phase === "waiting" ||
    aiOrganizerStatus.value?.phase === "paused";
  const providerChanging =
    organizerActive &&
    aiSettings.value &&
    ((payload.provider && payload.provider !== aiSettings.value.provider) ||
      (payload.model && payload.model !== aiSettings.value.model));
  if (providerChanging) {
    const confirmed = await openConfirmDialog({
      title: t("ai.organizer.settingsChangeTitle"),
      description: t("ai.organizer.settingsChangeDesc"),
      confirmText: t("common.confirm"),
      variant: "default",
    });
    if (!confirmed) return;
  }
  aiSettingsBusy.value = true;
  try {
    aiSettings.value = await updateAiSettings(payload);
    notifySuccess(t("toast.aiSettingsSaved"));
  } catch (error) {
    notifyError(t("toast.aiSettingsSaveFail"), error);
  } finally {
    aiSettingsBusy.value = false;
  }
}

async function testAiSettingsFromUi(payload: {
  provider?: AiSettings["provider"];
  customProviderName?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  enabled?: boolean;
}) {
  if (!EXTENSION_LOCAL_API_RUNTIME) return;
  if (aiSettingsBusy.value) return;
  aiSettingsBusy.value = true;
  try {
    aiSettings.value = await testAiSettings(payload);
    notifySuccess(t("toast.aiSettingsTestDone"));
  } catch (error) {
    notifyError(t("toast.aiSettingsTestFail"), error);
  } finally {
    aiSettingsBusy.value = false;
  }
}

async function saveBidirectionalSyncSettings(payload: {
  biliToLocalEnabled: boolean;
}) {
  if (!BILIBILI_LISTENER_SETTINGS_ENABLED) return;
  if (bidirectionalSyncSaving.value) return;
  bidirectionalSyncSaving.value = true;
  try {
    bidirectionalSyncSettings.value = await updateBidirectionalSyncSettings(
      payload
    );
    notifySuccess(t("toast.syncSettingsSaved"));
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
    markExportFinishedAt();
    notifySuccess(
      t("toast.webdavUploadDone"),
      t("toast.webdavUploadSummary", {
        videos: result.summary.videos,
        followedUps: result.summary.followedUps,
        tags: result.summary.tags,
        comments: result.summary.comments,
        articles: result.summary.articles,
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
    await loadFavoriteCommentCount();
    if (articlesMode.value) await loadFavoriteArticles();
    else await loadFavoriteArticleCount();
    notifySuccess(
      t("toast.webdavRestoreDone"),
      t("toast.webdavRestoreSummary", {
        videos: result.summary.videosUpserted,
        followedUps: result.summary.followedUpsUpserted,
        links: result.summary.folderLinksAdded,
        tags: result.summary.tagsBound,
        comments: result.summary.commentsUpserted,
        articles: result.summary.articlesUpserted,
      })
    );
  } catch (error) {
    notifyError(t("toast.webdavRestoreFail"), error);
  } finally {
    webdavBusy.value = false;
  }
}

function startTagEnrichmentPolling() {
  if (!TAG_SYNC_ENABLED) return;
  if (tagEnrichmentPollTimer !== null)
    window.clearInterval(tagEnrichmentPollTimer);
  tagEnrichmentPollTimer = window.setInterval(() => {
    if (route.name !== "manager") return;
    void refreshTagEnrichmentState();
  }, 5_000);
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

function stopAiOrganizerPolling() {
  if (aiOrganizerPollTimer !== null) {
    window.clearInterval(aiOrganizerPollTimer);
    aiOrganizerPollTimer = null;
  }
}

function ensureAiOrganizerPolling() {
  const phase = aiOrganizerStatus.value?.phase;
  const shouldPoll =
    phase === "planning" || phase === "classifying" || phase === "waiting";
  if (!shouldPoll) {
    stopAiOrganizerPolling();
    return;
  }
  if (aiOrganizerPollTimer !== null) return;
  aiOrganizerPollTimer = window.setInterval(() => {
    void refreshAiOrganizerState(true);
  }, 2_500);
}

async function loadAiOrganizerPreview(page = 1) {
  if (!AI_ORGANIZER_ENABLED || !aiOrganizerStatus.value?.id) {
    aiOrganizerPreviewItems.value = [];
    aiOrganizerPreviewPagination.value = null;
    return;
  }
  const result = await fetchAiOrganizerPreview({
    page,
    pageSize: 30,
    lowConfidence: aiOrganizerPreviewLowOnly.value,
  });
  aiOrganizerPreviewItems.value = result.items;
  aiOrganizerPreviewPagination.value = result.pagination;
}

async function refreshAiOrganizerState(silent = false) {
  if (!AI_ORGANIZER_ENABLED) return;
  try {
    const previousPhase = aiOrganizerStatus.value?.phase;
    aiOrganizerStatus.value = await fetchAiOrganizerStatus();
    ensureAiOrganizerPolling();
    const phase = aiOrganizerStatus.value.phase;
    if (
      aiOrganizerDialogOpen.value &&
      (phase === "ready" || phase === "completed") &&
      (previousPhase !== phase || aiOrganizerPreviewItems.value.length === 0)
    ) {
      await loadAiOrganizerPreview(1);
    }
  } catch (error) {
    if (!silent) notifyError(t("toast.aiOrganizerLoadFail"), error);
  }
}

async function openAiOrganizerDialog() {
  if (!AI_ORGANIZER_ENABLED) return;
  aiOrganizerDialogOpen.value = true;
  await Promise.all([refreshAiSettings(), refreshAiOrganizerState()]);
  if ((aiOrganizerStatus.value?.processed ?? 0) > 0) {
    await loadAiOrganizerPreview(1).catch((error) =>
      notifyError(t("toast.aiOrganizerPreviewFail"), error),
    );
  }
}

async function startAiOrganizerFromUi(config: Partial<AiOrganizerConfig>) {
  if (aiOrganizerBusy.value) return;
  let replaceExisting = false;
  if (aiOrganizerStatus.value?.id && aiOrganizerStatus.value.phase !== "idle") {
    const confirmed = await openConfirmDialog({
      title: t("ai.organizer.replaceTitle"),
      description: t("ai.organizer.replaceDesc"),
      confirmText: t("ai.organizer.start"),
      variant: "default",
    });
    if (!confirmed) return;
    replaceExisting = true;
  }
  aiOrganizerBusy.value = true;
  try {
    aiOrganizerPreviewItems.value = [];
    aiOrganizerPreviewPagination.value = null;
    aiOrganizerStatus.value = await startAiOrganizer({
      ...config,
      locale: locale.value,
      replaceExisting,
    });
    ensureAiOrganizerPolling();
    notifySuccess(t("toast.aiOrganizerStarted"));
  } catch (error) {
    notifyError(t("toast.aiOrganizerStartFail"), error);
  } finally {
    aiOrganizerBusy.value = false;
  }
}

async function pauseAiOrganizerFromUi() {
  if (aiOrganizerBusy.value) return;
  aiOrganizerBusy.value = true;
  try {
    aiOrganizerStatus.value = await pauseAiOrganizer();
    ensureAiOrganizerPolling();
  } catch (error) {
    notifyError(t("toast.aiOrganizerPauseFail"), error);
  } finally {
    aiOrganizerBusy.value = false;
  }
}

async function resumeAiOrganizerFromUi() {
  if (aiOrganizerBusy.value) return;
  aiOrganizerBusy.value = true;
  try {
    aiOrganizerStatus.value = await resumeAiOrganizer();
    ensureAiOrganizerPolling();
  } catch (error) {
    notifyError(t("toast.aiOrganizerResumeFail"), error);
  } finally {
    aiOrganizerBusy.value = false;
  }
}

async function cancelAiOrganizerFromUi() {
  if (aiOrganizerBusy.value) return;
  const confirmed = await openConfirmDialog({
    title: t("ai.organizer.cancelTitle"),
    description: t("ai.organizer.cancelDesc"),
    confirmText: t("ai.organizer.cancel"),
    variant: "destructive",
  });
  if (!confirmed) return;
  aiOrganizerBusy.value = true;
  try {
    aiOrganizerStatus.value = await cancelAiOrganizer();
    ensureAiOrganizerPolling();
  } catch (error) {
    notifyError(t("toast.aiOrganizerCancelFail"), error);
  } finally {
    aiOrganizerBusy.value = false;
  }
}

async function applyAiOrganizerFromUi() {
  if (aiOrganizerBusy.value || !aiOrganizerStatus.value?.canApply) return;
  const confirmed = await openConfirmDialog({
    title: t("ai.organizer.applyTitle"),
    description: t("ai.organizer.applyDesc", {
      folders: aiOrganizerStatus.value.taxonomy.length,
      videos: aiOrganizerStatus.value.total,
    }),
    confirmText: t("ai.organizer.apply"),
    variant: "default",
  });
  if (!confirmed) return;
  aiOrganizerBusy.value = true;
  try {
    aiOrganizerStatus.value = await applyAiOrganizer();
    await refreshFoldersAndVideos();
    notifySuccess(t("toast.aiOrganizerApplied"));
  } catch (error) {
    notifyError(t("toast.aiOrganizerApplyFail"), error);
  } finally {
    aiOrganizerBusy.value = false;
  }
}

async function undoAiOrganizerFromUi() {
  if (aiOrganizerBusy.value || !aiOrganizerStatus.value?.canUndo) return;
  const confirmed = await openConfirmDialog({
    title: t("ai.organizer.undoTitle"),
    description: t("ai.organizer.undoDesc"),
    confirmText: t("ai.organizer.undo"),
    variant: "default",
  });
  if (!confirmed) return;
  aiOrganizerBusy.value = true;
  try {
    aiOrganizerStatus.value = await undoAiOrganizer();
    await refreshFoldersAndVideos();
    notifySuccess(t("toast.aiOrganizerUndone"));
  } catch (error) {
    notifyError(t("toast.aiOrganizerUndoFail"), error);
  } finally {
    aiOrganizerBusy.value = false;
  }
}

async function downloadAiOrganizerBackupFromUi() {
  if (aiOrganizerBusy.value) return;
  aiOrganizerBusy.value = true;
  try {
    const payload = await downloadAiOrganizerBackup();
    downloadTextFile(payload.filename, payload.content, payload.mimeType);
  } catch (error) {
    notifyError(t("toast.aiOrganizerBackupFail"), error);
  } finally {
    aiOrganizerBusy.value = false;
  }
}

async function setAiOrganizerPreviewLowOnly(value: boolean) {
  aiOrganizerPreviewLowOnly.value = value;
  try {
    await loadAiOrganizerPreview(1);
  } catch (error) {
    notifyError(t("toast.aiOrganizerPreviewFail"), error);
  }
}

async function updateAiOrganizerAssignmentFromUi(
  videoId: number,
  folderKey: string,
) {
  if (aiOrganizerBusy.value) return;
  aiOrganizerBusy.value = true;
  try {
    aiOrganizerStatus.value = await updateAiOrganizerAssignment({
      videoId,
      folderKey,
    });
    await loadAiOrganizerPreview(aiOrganizerPreviewPagination.value?.page ?? 1);
  } catch (error) {
    notifyError(t("toast.aiOrganizerEditFail"), error);
  } finally {
    aiOrganizerBusy.value = false;
  }
}

function stopHistoryModelSyncPolling() {
  if (syncHistoryPollTimer !== null) {
    window.clearTimeout(syncHistoryPollTimer);
    syncHistoryPollTimer = null;
  }
}

async function refreshExtensionUpdateState(options: { force?: boolean; announce?: boolean } = {}) {
  if (!EXTENSION_LOCAL_API_RUNTIME) return;
  try {
    const status = options.force
      ? await checkExtensionUpdate()
      : await fetchExtensionUpdateStatus();
    extensionUpdateStatus.value = status;
    if (options.announce && status.notice) {
      notifySuccess(
        t("toast.extensionUpdated", { version: status.notice.currentVersion }),
        t("toast.extensionUpdatedDesc", { previous: status.notice.previousVersion }),
      );
      extensionUpdateStatus.value = await acknowledgeExtensionUpdateNotice();
    }
  } catch (error) {
    if (options.force) notifyError(t("toast.extensionUpdateCheckFail"), error);
    else console.warn("[extension-update] status failed:", error);
  }
}

async function checkExtensionUpdateFromUi() {
  if (!EXTENSION_LOCAL_API_RUNTIME || extensionUpdateLoading.value) return;
  extensionUpdateLoading.value = true;
  try {
    const status = await checkExtensionUpdate();
    extensionUpdateStatus.value = status;
    if (status.lastError) {
      notifyError(t("toast.extensionUpdateCheckFail"), status.lastError);
    } else if (status.updateAvailable) {
      notifySuccess(t("toast.extensionUpdateAvailable", { version: status.latestLabel }));
    } else {
      notifySuccess(t("toast.extensionUpToDate"));
    }
  } catch (error) {
    notifyError(t("toast.extensionUpdateCheckFail"), error);
  } finally {
    extensionUpdateLoading.value = false;
  }
}

function historySyncDataSignature(status: HistoryModelSyncStatus | null) {
  if (!status) return "";
  const summary = status.summary;
  return [
    status.phase,
    status.current,
    status.folderIndex,
    status.currentPage,
    summary.foldersSynced,
    summary.videosProcessed,
    summary.videosUpserted,
    summary.folderLinksAdded,
    summary.folderLinksRemoved,
    summary.unavailableRemoteVideos,
  ].join(":");
}

function scheduleSyncLibraryRefresh() {
  syncLiveRefreshPending = true;
  if (syncLiveRefreshTimer !== null || syncLiveRefreshRunning) return;
  syncLiveRefreshTimer = window.setTimeout(async () => {
    syncLiveRefreshTimer = null;
    if (!syncLiveRefreshPending || route.name !== "manager") return;
    syncLiveRefreshPending = false;
    syncLiveRefreshRunning = true;
    try {
      await refreshFoldersAndVideos({ silent: true });
    } finally {
      syncLiveRefreshRunning = false;
      if (syncLiveRefreshPending) scheduleSyncLibraryRefresh();
    }
  }, 250);
}

function applyHistoryModelSyncStatus(
  status: HistoryModelSyncStatus,
  options: { refreshLibrary?: boolean } = {},
) {
  const previousSignature = historySyncDataSignature(syncHistoryStatus.value);
  syncHistoryStatus.value = status;
  const nextSignature = historySyncDataSignature(status);
  if (
    options.refreshLibrary !== false &&
    previousSignature &&
    previousSignature !== nextSignature
  ) {
    scheduleSyncLibraryRefresh();
  }
  ensureHistoryModelSyncPolling();
  return status;
}

function ensureHistoryModelSyncPolling() {
  const shouldPoll =
    !syncingImport.value &&
    isHistoryModelSyncActive(syncHistoryStatus.value);
  if (!shouldPoll) {
    stopHistoryModelSyncPolling();
    return;
  }
  if (syncHistoryPollTimer !== null) return;
  syncHistoryPollTimer = window.setTimeout(async () => {
    syncHistoryPollTimer = null;
    await refreshHistoryModelSyncStatus();
  }, 1000);
}

async function refreshHistoryModelSyncStatus() {
  try {
    const status = await fetchHistoryModelSyncStatus();
    applyHistoryModelSyncStatus(status);
    if (status.selectedRemoteFolderIds.length > 0) {
      const available = new Set(syncFolders.value.map((item) => item.remoteId));
      syncSelectedFolderIds.value =
        available.size > 0
          ? status.selectedRemoteFolderIds.filter((id) => available.has(id))
          : [...status.selectedRemoteFolderIds];
    }
    return status;
  } catch (error) {
    console.error(error);
    stopHistoryModelSyncPolling();
    return null;
  }
}

async function loadAutoInitFolderOptions(force = false) {
  if (autoInitFetchingFolders.value) return;
  if (!force && autoInitFolders.value.length > 0) return;
  autoInitFetchingFolders.value = true;
  try {
    const result = await fetchBilibiliSyncFolders();
    autoInitFolders.value = (result.items ?? []).filter(
      (folder) => folder.mediaCount > 0
    );
    const available = new Set(
      autoInitFolders.value.map((item) => item.remoteId)
    );
    autoInitSelectedFolderIds.value = autoInitSelectedFolderIds.value.filter(
      (id) => available.has(id)
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
  if (
    state.status === "idle" &&
    state.folderIds.length === 0 &&
    isFreshLibrary
  ) {
    openAutoInitDialog();
  }
}

function toggleAutoInitFolder(remoteId: number, checked: boolean) {
  autoInitSelectedFolderIds.value = toggleFolderSelection(
    autoInitSelectedFolderIds.value,
    remoteId,
    checked
  );
}

function selectAllAutoInitFolders() {
  autoInitSelectedFolderIds.value = selectAllFolderIds(autoInitFolders.value);
}

function clearAutoInitFolders() {
  autoInitSelectedFolderIds.value = clearFolderSelection(
    autoInitSelectedFolderIds.value
  );
}

function estimateTargetVideosByFolders(
  folderIds: number[],
  candidates: SyncRemoteFolder[]
) {
  return estimateSelectedVideoCount(folderIds, candidates);
}

function startUnifiedFavoritesSync(
  folderIds: number[],
  targetVideosEstimate: number,
  candidates: SyncRemoteFolder[]
) {
  const normalizedIds = orderSelectedFolderIds(folderIds, candidates);
  writeAutoInitState({
    status: "running",
    folderIds: normalizedIds,
    folderIndex: 0,
    nextRetryAt: null,
    riskStreak: 0,
    phase1Imported: 0,
    phase1Scanned: 0,
    targetVideosEstimate: Math.max(0, Math.trunc(targetVideosEstimate)),
    lastError: "",
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
    startUnifiedFavoritesSync(
      autoInitSelectedFolderIds.value,
      targetVideosEstimate,
      autoInitFolders.value
    );
  } finally {
    autoInitSubmitting.value = false;
  }
}

async function openSyncImportDialog() {
  syncDialogOpen.value = true;
  const status = await refreshHistoryModelSyncStatus();
  const tasks: Promise<unknown>[] = [];
  if (!isHistoryModelSyncActive(status)) {
    tasks.push(loadSyncFolderOptions());
  }
  if (TAG_SYNC_ENABLED) tasks.push(refreshTagEnrichmentState());
  await Promise.all(tasks);
  const activeFolderIds = new Set(folders.value.map((folder) => folder.id));
  const persistedTagFolderIds =
    tagEnrichmentStatus.value?.selectedFolderIds.filter((folderId) =>
      activeFolderIds.has(folderId),
    ) ?? [];
  if (persistedTagFolderIds.length > 0) {
    tagSelectedFolderIds.value = persistedTagFolderIds;
  } else if (
    selectedFolderId.value !== null &&
    activeFolderIds.has(selectedFolderId.value)
  ) {
    tagSelectedFolderIds.value = [selectedFolderId.value];
  } else {
    tagSelectedFolderIds.value = folders.value.map((folder) => folder.id);
  }
}

function toggleSyncFolder(remoteId: number, checked: boolean) {
  syncSelectedFolderIds.value = toggleFolderSelection(
    syncSelectedFolderIds.value,
    remoteId,
    checked
  );
}

function selectAllSyncFolders() {
  syncSelectedFolderIds.value = selectAllFolderIds(syncFolders.value);
}

function clearSyncFolders() {
  syncSelectedFolderIds.value = clearFolderSelection(
    syncSelectedFolderIds.value
  );
}

async function submitSyncImport() {
  if (syncingImport.value || exportingLibrary.value || autoInitRunning.value)
    return;
  if (syncSelectedFolderIds.value.length === 0) {
    notifyError(t("toast.autoInitPickFolder"));
    return;
  }
  void runFavoritesSyncLikeHistory(
    syncSelectedFolderIds.value,
    {
      notify: true,
      closeDialogOnSuccess: false,
    }
  );
}

async function resumeHistoryModelSyncFromUi() {
  if (syncingImport.value) return;
  const folderIds = syncHistoryStatus.value?.selectedRemoteFolderIds.length
    ? syncHistoryStatus.value.selectedRemoteFolderIds
    : syncSelectedFolderIds.value;
  await runFavoritesSyncLikeHistory(folderIds, {
    notify: true,
    closeDialogOnSuccess: false,
  });
}

async function stopHistoryModelSyncFromUi() {
  if (syncStopping.value) return;
  syncStopping.value = true;
  try {
    const result = await stopHistoryModelSync();
    applyHistoryModelSyncStatus(result.status);
  } catch (error) {
    notifyError(t("toast.syncStopFail"), error);
  } finally {
    syncStopping.value = false;
  }
}

function toggleTagFolder(folderId: number, checked: boolean) {
  const selected = new Set(tagSelectedFolderIds.value);
  if (checked) selected.add(folderId);
  else selected.delete(folderId);
  tagSelectedFolderIds.value = folders.value
    .map((folder) => folder.id)
    .filter((id) => selected.has(id));
}

function selectAllTagFolders() {
  tagSelectedFolderIds.value = folders.value.map((folder) => folder.id);
}

function clearTagFolders() {
  tagSelectedFolderIds.value = [];
}

async function dismissHistoryModelSyncFromUi() {
  if (syncStopping.value || favoritesSyncActive.value) return;
  syncStopping.value = true;
  try {
    const result = await dismissHistoryModelSyncStatus();
    applyHistoryModelSyncStatus(result.status, { refreshLibrary: false });
    stopHistoryModelSyncPolling();
  } catch (error) {
    notifyError(t("toast.syncDismissFail"), error);
  } finally {
    syncStopping.value = false;
  }
}

async function restartHistoryModelSyncFromUi() {
  if (syncingImport.value || syncSelectedFolderIds.value.length === 0) return;
  await runFavoritesSyncLikeHistory(syncSelectedFolderIds.value, {
    notify: true,
    closeDialogOnSuccess: false,
    restart: true,
  });
}

type FolderSyncRunResult = {
  completed: boolean;
  foldersSynced: number;
  videosImported: number;
  videosScanned: number;
  unavailableRemoteVideos: number;
  invalidVideosDetected: number;
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
    restart?: boolean;
  }
): Promise<FolderSyncRunResult> {
  syncingImport.value = true;
  try {
    const uniqueFolderIds = [
      ...new Set(selectedRemoteFolderIds.filter((id) => id > 0)),
    ];
    const resumePageByFolder =
      options.resumePageByFolder ?? buildResumePageByFolder(uniqueFolderIds);
    let startResult = await startHistoryModelSync({
      selectedRemoteFolderIds: uniqueFolderIds,
      resumePageByFolder,
      restart: options.restart,
    });
    applyHistoryModelSyncStatus(startResult.status);
    if (!startResult.started && !startResult.status.running) {
      await sleepMs(180);
      startResult = await startHistoryModelSync({
        selectedRemoteFolderIds: uniqueFolderIds,
        resumePageByFolder,
        restart: options.restart,
      });
      applyHistoryModelSyncStatus(startResult.status);
    }
    if (
      !startResult.started &&
      !startResult.status.running &&
      startResult.status.phase !== "paused" &&
      startResult.status.phase !== "waiting" &&
      startResult.status.phase !== "failed"
    ) {
      throw new Error("Sync task did not start, please retry");
    }

    let status: HistoryModelSyncStatus | null = startResult.status;
    const pollStartedAt = Date.now();
    while (true) {
      status = await fetchHistoryModelSyncStatus();
      applyHistoryModelSyncStatus(status);
      const waitingForAutomaticRetry =
        status.phase === "waiting" && status.retryAutomatic;
      if (!status.running && !waitingForAutomaticRetry) break;
      if (Date.now() - pollStartedAt > 2 * 60 * 60 * 1000) {
        throw new Error("Sync polling exceeded 2 hours timeout");
      }
      await sleepMs(850);
    }
    if (!status) {
      throw new Error("Sync status is unavailable");
    }

    const foldersSynced = Math.max(0, status.summary.foldersSynced);
    const videosImported = Math.max(0, status.summary.videosUpserted);
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
    const singleFolderId =
      uniqueFolderIds.length === 1 ? uniqueFolderIds[0] : null;
    const singleFolderNextPage =
      singleFolderId !== null
        ? resumeMap[String(singleFolderId)] ?? null
        : null;
    const unavailableRemoteVideos = Math.max(
      0,
      Number(status.summary.unavailableRemoteVideos || 0),
    );
    const invalidVideosDetected = Math.max(
      0,
      Number(status.invalidVideosDetected || 0),
    );
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
    if (TAG_SYNC_ENABLED) {
      await refreshTagEnrichmentState();
    }

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
        ? t("toast.syncHiddenErrors", { count: errorsOmittedTotal })
        : "",
      hiddenCount > 0
        ? t("toast.syncHiddenErrors", { count: hiddenCount })
        : "",
      systemError?.message || "",
    ]
      .filter(Boolean)
      .join(" | ");

    const completed = status.phase === "completed";
    const fullyFailed = !completed && videosImported === 0 && allErrors.length > 0;
    const noProgress = videosImported === 0 && videosScanned === 0;
    if (options.notify) {
      if (fullyFailed) {
        notifyError(
          t("toast.syncFail"),
          errorDesc || t("common.requestFailed")
        );
      } else if (completed) {
        if (options.closeDialogOnSuccess) {
          syncDialogOpen.value = false;
        }
        const summaryMessage = t("toast.syncSummary", {
          folders: foldersSynced,
          videos: videosImported,
        });
        const warningMessages = [
          unavailableRemoteVideos > 0
            ? t("toast.syncUnavailable", { count: unavailableRemoteVideos })
            : "",
          invalidVideosDetected > 0
            ? t("toast.syncInvalidDetected", { count: invalidVideosDetected })
            : "",
        ].filter(Boolean);
        notifySuccess(t("toast.syncDone"), [summaryMessage, ...warningMessages].join(" | "));
      } else if (allErrors.length > 0) {
        notifyError(t("toast.syncPartial"), errorDesc || t("common.requestFailed"));
      }
    }

    return {
      completed,
      foldersSynced,
      videosImported,
      videosScanned,
      unavailableRemoteVideos,
      invalidVideosDetected,
      riskBlocked,
      noProgress,
      hasMorePage:
        Number.isFinite(Number(singleFolderNextPage)) &&
        Number(singleFolderNextPage) > 1,
      nextPage:
        Number.isFinite(Number(singleFolderNextPage)) &&
        Number(singleFolderNextPage) > 1
          ? Math.trunc(Number(singleFolderNextPage))
          : null,
      errors: allErrors,
      errorsOmittedTotal,
    };
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : String(error);
    const riskBlocked = looksLikeRiskControlError(message);
    if (options.notify) notifyError(t("toast.syncFail"), error);
    return {
      completed: false,
      foldersSynced: 0,
      videosImported: 0,
      videosScanned: 0,
      unavailableRemoteVideos: 0,
      invalidVideosDetected: 0,
      riskBlocked,
      noProgress: true,
      hasMorePage: false,
      nextPage: null,
      errors: [{ folder: "__sync__", message }],
      errorsOmittedTotal: 0,
    };
  } finally {
    syncingImport.value = false;
    ensureHistoryModelSyncPolling();
  }
}

function startAutoInitLockHeartbeat() {
  if (autoInitHeartbeatTimer !== null)
    window.clearInterval(autoInitHeartbeatTimer);
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
  let normalizedIds = state.folderIds.filter(
    (id) => Number.isFinite(id) && id > 0
  );
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
  if (
    state.status === "cooldown" &&
    state.nextRetryAt &&
    Date.now() < state.nextRetryAt
  ) {
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
          lastError:
            probe.message ||
            "Risk-control is still active. Waiting for next probe.",
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
        lastError: probe.message || "Probe failed before sync resume.",
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
        folderIndex: Math.max(
          0,
          Math.min(state.folderIndex, normalizedIds.length)
        ),
        nextRetryAt: null,
        lastError: "",
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
    const startIndex = Math.max(
      0,
      Math.min(latestState.folderIndex, normalizedIds.length)
    );
    writeAutoInitState({
      status: "running",
      folderIds: normalizedIds,
      folderIndex: startIndex,
      nextRetryAt: null,
      lastError: "",
    });

    let totalImported = Math.max(0, state.phase1Imported);
    let totalScanned = Math.max(0, state.phase1Scanned);
    let totalUnavailable = Math.max(0, state.unavailableVideos);
    for (let index = startIndex; index < normalizedIds.length; index += 1) {
      const folderId = normalizedIds[index];
      const result = await runFavoritesSyncLikeHistory([folderId], {
        notify: false,
        closeDialogOnSuccess: false,
      });
      totalImported += result.videosImported;
      totalScanned += result.videosScanned;
      totalUnavailable +=
        result.unavailableRemoteVideos + result.invalidVideosDetected;

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
          unavailableVideos: totalUnavailable,
          lastError: result.errors[0]?.message || "risk-control (412)",
        });
        notifyError(t("toast.autoInitCooling"), t("toast.autoInitCoolingDesc"));
        return;
      }

      if (!result.completed) {
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
          unavailableVideos: totalUnavailable,
          lastError: result.errors[0]?.message || "sync failed",
        });
        notifyError(
          t("toast.autoInitFail"),
          result.errors[0]?.message || t("common.requestFailed")
        );
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
        unavailableVideos: totalUnavailable,
        lastError: "",
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
      unavailableVideos: totalUnavailable,
      lastError: "",
    });
    if (TAG_SYNC_ENABLED) {
      await refreshTagEnrichmentState();
    }
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
      lastError: message,
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
  if (syncingImport.value || exportingLibrary.value || importingLibrary.value)
    return;
  exportingLibrary.value = true;
  try {
    const payload = await exportLibrary(format);
    if (!payload.content || payload.content.trim().length === 0) {
      throw new Error("Export content is empty");
    }
    downloadTextFile(payload.filename, payload.content, payload.mimeType);
    if (format === "json") markExportFinishedAt();
    notifySuccess(
      t("toast.exportDone"),
      t("toast.exportSummary", {
        videos: payload.summary.videos,
        followedUps: payload.summary.followedUps,
        tags: payload.summary.tags,
        comments: payload.summary.comments,
        articles: payload.summary.articles,
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
  if (syncingImport.value || exportingLibrary.value || importingLibrary.value)
    return;
  importFileInput.value?.click();
}

function detectImportFormat(
  fileName: string,
  content: string
): "json" | "csv" | null {
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
  if (syncingImport.value || exportingLibrary.value || importingLibrary.value)
    return;

  importingLibrary.value = true;
  try {
    const content = await file.text();
    const format = detectImportFormat(file.name, content);
    if (!format) {
      throw new Error("Unsupported import file type, use JSON or CSV");
    }

    const result = await importLibrary({
      format,
      content,
    });
    await refreshFoldersVideosAndTags();
    await refreshTrash();
    if (commentsMode.value) {
      await loadFavoriteComments();
    } else {
      await loadFavoriteCommentCount();
    }
    if (articlesMode.value) {
      await Promise.all([refreshArticleFolders(), loadFavoriteArticles()]);
    } else {
      await loadFavoriteArticleCount();
    }

    notifySuccess(
      t("toast.importDone"),
      t("toast.importSummary", {
        videos: result.summary.videosUpserted,
        followedUps: result.summary.followedUpsUpserted,
        links: result.summary.folderLinksAdded,
        tags: result.summary.tagsBound,
        comments: result.summary.commentsUpserted,
        articles: result.summary.articlesUpserted,
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

function setTrashCommentSelection(id: number, checked: boolean) {
  libraryStore.setTrashCommentSelection(id, checked);
}

function selectAllTrashComments() {
  libraryStore.selectAllTrashComments();
}

function clearTrashCommentSelection() {
  libraryStore.clearTrashCommentSelection();
}

function setTrashArticleSelection(id: number, checked: boolean) {
  libraryStore.setTrashArticleSelection(id, checked);
}

function selectAllTrashArticles() {
  libraryStore.selectAllTrashArticles();
}

function clearTrashArticleSelection() {
  libraryStore.clearTrashArticleSelection();
}

function isTrashFolderSelected(id: number) {
  return libraryStore.isTrashFolderSelected(id);
}

function isTrashVideoSelected(id: number) {
  return libraryStore.isTrashVideoSelected(id);
}

function isTrashCommentSelected(id: number) {
  return libraryStore.isTrashCommentSelected(id);
}

function isTrashArticleSelected(id: number) {
  return libraryStore.isTrashArticleSelected(id);
}

async function applyViewMode(nextName: unknown) {
  resetForViewSwitch();
  if (nextName === "trash") {
    trashFolderPage.value = 1;
    trashVideoPage.value = 1;
    trashCommentPage.value = 1;
    trashArticlePage.value = 1;
    await refreshTrash();
  } else if (nextName === "manager") {
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

async function toggleFollowingUpsMode(next: boolean) {
  const targetName = next ? "following-ups" : "manager";
  if (route.name === targetName) return;
  if (next) {
    await router.push({ name: targetName });
    return;
  }
  await router.push({ name: targetName, query: buildManagerQuery() });
}

async function toggleCommentsMode(next: boolean) {
  const targetName = next ? "comments" : "manager";
  if (route.name === targetName) return;
  if (next) {
    await router.push({ name: targetName });
    return;
  }
  await router.push({ name: targetName, query: buildManagerQuery() });
}

async function toggleArticlesMode(next: boolean) {
  const targetName = next ? "articles" : "manager";
  if (route.name === targetName) return;
  if (next) await router.push({ name: targetName });
  else await router.push({ name: targetName, query: buildManagerQuery() });
}

watch(
  () => route.name,
  async (nextName, previousName) => {
    if (!routeReady.value) return;
    if (nextName === previousName) return;
    try {
      await applyViewMode(nextName);
      if (nextName === "manager") {
        startTagEnrichmentPolling();
        maybePromptAutoInitSetupDialog();
      } else if (nextName === "following-ups") {
        stopTagEnrichmentPolling();
        await loadFollowingUps();
        await refreshFollowingUpImportStatus();
      } else if (nextName === "comments") {
        stopTagEnrichmentPolling();
        await loadFavoriteComments();
      } else if (nextName === "articles") {
        stopTagEnrichmentPolling();
        await Promise.all([refreshArticleFolders(), loadFavoriteArticles()]);
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
  () => favoriteCommentPagination.value.total,
  () => {
    maybeNotifyExportReminder();
  }
);

watch(
  () => favoriteArticlePagination.value.total,
  () => {
    maybeNotifyExportReminder();
  },
);

watch(
  [selectedFolderId, trashMode],
  ([folderId, isTrash], [previousFolderId, wasTrash] = [null, false]) => {
    if (!AI_CATEGORIES_ENABLED || isTrash || folderId === null) {
      folderAiFetchToken += 1;
      selectedFolderAiCategories.value = null;
      closeAiCategoryBrowser();
      return;
    }
    if (wasTrash || previousFolderId !== folderId) {
      closeAiCategoryBrowser();
    }
    selectedFolderAiCategories.value =
      folderAiCategoriesCache.value[folderId] ?? null;
    void refreshSelectedFolderAiCategories(folderId);
  },
  { immediate: true }
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
  startExportReminderChecks();
  migrateBackupReminderState();
  await uiStore.initFromStorage();
  // Update checks are intentionally out of the library bootstrap path: a
  // temporary network failure must never prevent the manager from loading.
  void refreshExtensionUpdateState({ announce: true });
  if (route.name === "manager") {
    applyManagerQuery(route.query);
  }
  loading.value = true;
  try {
    await libraryStore.ensureBootstrapped();
    if (route.name === "manager") {
      await refreshHistoryModelSyncStatus();
    }
    if (BILIBILI_LISTENER_SETTINGS_ENABLED) {
      await refreshBidirectionalSyncSettings();
    }
    if (AI_ORGANIZER_ENABLED) {
      await refreshAiOrganizerState(true);
    }
    if (
      selectedFolderId.value !== null &&
      !folders.value.some((folder) => folder.id === selectedFolderId.value)
    ) {
      selectedFolderId.value = null;
    }
    if (route.name === "trash") {
      await refreshTrash();
    } else if (route.name === "following-ups") {
      await loadFollowingUps();
      await refreshFollowingUpImportStatus();
    } else if (route.name === "comments") {
      await loadFavoriteComments();
    } else if (route.name === "articles") {
      await Promise.all([refreshArticleFolders(), loadFavoriteArticles()]);
    } else {
      await refreshVideos();
      if (TAG_SYNC_ENABLED) {
        await refreshTagEnrichmentState();
        startTagEnrichmentPolling();
      }
    }
    if (route.name !== "comments" && route.name !== "articles") {
      await loadFavoriteCommentCount();
      await loadFavoriteArticleCount();
    } else if (route.name === "comments") {
      await loadFavoriteArticleCount();
    } else {
      await loadFavoriteCommentCount();
    }
    maybeNotifyExportReminder();
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
  document.removeEventListener("visibilitychange", handleExportReminderVisibility);
  if (exportReminderTimer !== null) {
    window.clearInterval(exportReminderTimer);
    exportReminderTimer = null;
  }
  if (tickTimer !== null) {
    window.clearInterval(tickTimer);
    tickTimer = null;
  }
  if (autoInitRetryTimer !== null) {
    window.clearTimeout(autoInitRetryTimer);
    autoInitRetryTimer = null;
  }
  stopHistoryModelSyncPolling();
  if (syncLiveRefreshTimer !== null) {
    window.clearTimeout(syncLiveRefreshTimer);
    syncLiveRefreshTimer = null;
  }
  stopFollowingUpImportPolling();
  stopTagEnrichmentPolling();
  stopAiOrganizerPolling();
  stopAutoInitLockHeartbeat();
  releaseAutoInitLock();
});
</script>

<template>
  <main
    class="mx-auto grid min-h-screen w-full max-w-[1840px] grid-cols-1 gap-5 px-4 py-5 lg:h-[100dvh] lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden lg:px-6 lg:py-7"
    :class="followingUpsMode || commentsMode ? '' : 'lg:grid-cols-[320px_1fr]'"
  >
    <ManagerFolderNavigation
      v-if="!followingUpsMode && !commentsMode"
      :t="t"
      :folders="navigationFolders"
      :active-folder="navigationActiveFolder"
      :active-folder-id="selectedFolderId"
      :result-count="articlesMode ? favoriteArticlePagination.total : total"
      :collection-label="articlesMode ? t('articles.allFolders') : ''"
      :folder-heading="articlesMode ? t('articles.folders') : ''"
      :folder-item-count-label="articlesMode ? t('articles.folderCountTemplate') : ''"
      :show-playback-actions="EXTENSION_LOCAL_API_RUNTIME && !trashMode && !articlesMode"
      :has-selected-folder-ai-record="selectedFolderHasAiRecord"
      :can-open-selected-folder-ai-browser="selectedFolderCanOpenAiBrowser"
      :ai-running-folder-id="aiRunningFolderId"
      :show-ai-actions="AI_CATEGORIES_ENABLED && EXTENSION_LOCAL_API_RUNTIME && !trashMode && !articlesMode"
      :locale="locale"
      @select="handleSelectFolderWithAiBrowser"
      @create="articlesMode ? handleCreateArticleFolder($event) : handleCreateFolder($event)"
      @update="articlesMode ? handleUpdateArticleFolder($event) : handleUpdateFolder($event)"
      @remove="articlesMode ? handleRemoveArticleFolder($event) : removeFolderFromManager($event)"
      @reorder="articlesMode ? handleReorderArticleFolders($event) : handleReorderFolders($event)"
      @start-playback="handleStartFolderPlayback"
      @analyze="handleAnalyzeFolder"
      @clear-ai="handleClearFolderAi"
      @open-ai-browser="openAiCategoryBrowser"
    />

    <section class="min-w-0 space-y-4 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
      <ManagerHeader
        :t="t"
        :trash-mode="trashMode"
        :following-ups-mode="followingUpsMode"
        :comments-mode="commentsMode"
        :articles-mode="articlesMode"
        :show-ai-organizer="AI_ORGANIZER_ENABLED"
        :current-view-label="headerCurrentViewLabel"
        :current-scope-label="headerCurrentScopeLabel"
        :progress-value="progressValue"
        :syncing="favoritesSyncActive"
        :exporting="exportingLibrary"
        :importing="importingLibrary"
        @open-settings="openSettingsDialog()"
        @open-tags="toolsOpen = true"
        @open-ai-organizer="openAiOrganizerDialog"
        @open-webdav-settings="openWebDavDialog"
        @sync-import="openSyncImportDialog"
        @import-file="openImportFileDialog"
        @export-json="handleExport('json')"
        @export-csv="handleExport('csv')"
        @toggle-trash="toggleTrashMode(!trashMode)"
        @open-following-ups="toggleFollowingUpsMode(!followingUpsMode)"
        @open-comments="toggleCommentsMode(!commentsMode)"
        @open-articles="toggleArticlesMode(!articlesMode)"
      />

      <section
        v-if="showAutoInitProgressPanel && !trashMode && !followingUpsMode && !commentsMode && !articlesMode"
        class="panel-surface space-y-3 rounded-lg border p-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-semibold">
              {{ t("autoInit.progressTitle") }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ autoInitStatusText }}
              <span
                v-if="
                  autoInitState.status === 'cooldown' &&
                  autoInitCooldownRemainMs > 0
                "
              >
                ·
                {{
                  t("autoInit.cooldownRemain", {
                    time: formatSeconds(autoInitCooldownRemainMs),
                  })
                }}
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
                (autoInitState.status === 'cooldown' &&
                  autoInitCooldownRemainMs > 0)
              "
              @click="resumeAutoInitFromUi"
            >
              {{ t("autoInit.resume") }}
            </Button>
          </div>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">{{
              t("autoInit.phase1Title")
            }}</span>
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

        <p
          v-if="autoInitState.lastError"
          class="text-xs text-amber-600 dark:text-amber-400 whitespace-pre-wrap"
        >
          {{ autoInitState.lastError }}
        </p>
      </section>

      <FavoritesSyncStatusBar
        v-if="favoritesSyncStatusVisible && syncHistoryStatus"
        :status="syncHistoryStatus"
        :stopping="syncStopping"
        :t="t"
        @open="openSyncImportDialog"
        @stop="stopHistoryModelSyncFromUi"
        @dismiss="dismissHistoryModelSyncFromUi"
      />

      <TagEnrichmentStatusBar
        v-if="
          TAG_SYNC_ENABLED &&
          tagEnrichmentStatus &&
          tagEnrichmentStatusVisible &&
          !trashMode &&
          !followingUpsMode &&
          !commentsMode &&
          !articlesMode
        "
        :status="tagEnrichmentStatus"
        :loading="tagEnrichmentLoading"
        :start-disabled="false"
        :now-ms="tickNow"
        :t="t"
        @refresh="refreshTagEnrichmentState"
        @start="resumeTagEnrichmentFromUi"
        @stop="pauseTagEnrichmentFromUi"
        @run="runTagEnrichmentNowFromUi"
        @dismiss="dismissTagEnrichmentFromUi"
        @interrupt="dismissTagEnrichmentFromUi"
      />

      <AiOrganizerStatusBar
        v-if="aiOrganizerStatusBarVisible && aiOrganizerStatus"
        :status="aiOrganizerStatus"
        :busy="aiOrganizerBusy"
        :now-ms="tickNow"
        :t="t"
        @open="openAiOrganizerDialog"
        @pause="pauseAiOrganizerFromUi"
        @resume="resumeAiOrganizerFromUi"
        @stop="cancelAiOrganizerFromUi"
      />

      <AiCategoryBrowser
        v-if="AI_CATEGORIES_ENABLED && !trashMode && !commentsMode && !articlesMode && aiCategoryBrowserOpen"
        :t="t"
        :locale="locale"
        :folder="activeFolder"
        :result="selectedFolderAiCategories"
        :videos="aiCategoryBrowserVideos"
        :videos-loading="aiCategoryBrowserVideosLoading"
        :initial-category="aiCategoryBrowserCategory"
        @back="closeAiCategoryBrowser"
        @open-category="openAiCategory"
      />

      <FollowingUpPanel
        v-else-if="followingUpsMode"
        :t="t"
        :records="followingUps"
        :keyword="followingUpKeyword"
        :loading="followingUpLoading"
        :status="followingUpImportStatus"
        @update:keyword="followingUpKeyword = $event"
        @import="followingUpImportDialogOpen = true"
        @refresh="loadFollowingUps"
        @open-space="openFollowingUpSpace"
      />

      <CommentsPanel
        v-else-if="commentsMode"
        :t="t"
        :locale="locale"
        :comments="favoriteComments"
        :keyword="favoriteCommentKeyword"
        :loading="favoriteCommentLoading"
        :pagination="favoriteCommentPagination"
        :card-width="commentCardWidth"
        @update:keyword="favoriteCommentKeyword = $event"
        @search="searchFavoriteComments"
        @refresh="loadFavoriteComments"
        @delete="removeFavoriteComment"
        @change-page="changeFavoriteCommentPage"
        @change-page-size="changeFavoriteCommentPageSize"
      />

      <FavoriteArticlesPanel
        v-else-if="articlesMode"
        :t="t"
        :locale="locale"
        :articles="favoriteArticles"
        :active-folder-id="selectedFolderId"
        :keyword="favoriteArticleKeyword"
        :loading="favoriteArticleLoading"
        :pagination="favoriteArticlePagination"
        :card-width="articleCardWidth"
        @update:keyword="favoriteArticleKeyword = $event"
        @search="searchFavoriteArticles"
        @refresh="loadFavoriteArticles"
        @delete="removeFavoriteArticle"
        @change-page="changeFavoriteArticlePage"
        @change-page-size="changeFavoriteArticlePageSize"
      />

      <ManagerPanel
        v-else-if="!trashMode"
        :t="t"
        :locale="locale"
        :keyword="keyword"
        :active-folder="activeFolder"
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
        :video-card-width="videoCardWidth"
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
        :trash-comments="trashComments"
        :trash-articles="trashArticles"
        :trash-video-total="trashVideoTotal"
        :trash-comment-total="trashCommentTotal"
        :trash-article-total="trashArticleTotal"
        :selected-trash-folder-ids="selectedTrashFolderIds"
        :selected-trash-video-ids="selectedTrashVideoIds"
        :selected-trash-comment-ids="selectedTrashCommentIds"
        :selected-trash-article-ids="selectedTrashArticleIds"
        :trash-folder-page="trashFolderPage"
        :trash-folder-total-pages="trashFolderTotalPages"
        :trash-folder-page-size="trashFolderPageSize"
        :trash-folder-page-size-options="TRASH_FOLDER_PAGE_SIZE_OPTIONS"
        :trash-video-page="trashVideoPage"
        :trash-video-total-pages="trashVideoTotalPages"
        :trash-video-page-size="trashVideoPageSize"
        :trash-video-page-size-options="TRASH_VIDEO_PAGE_SIZE_OPTIONS"
        :trash-comment-page="trashCommentPage"
        :trash-comment-total-pages="trashCommentTotalPages"
        :trash-comment-page-size="trashCommentPageSize"
        :trash-comment-page-size-options="TRASH_CONTENT_PAGE_SIZE_OPTIONS"
        :trash-article-page="trashArticlePage"
        :trash-article-total-pages="trashArticleTotalPages"
        :trash-article-page-size="trashArticlePageSize"
        :trash-article-page-size-options="TRASH_CONTENT_PAGE_SIZE_OPTIONS"
        :is-trash-folder-selected="isTrashFolderSelected"
        :is-trash-video-selected="isTrashVideoSelected"
        :is-trash-comment-selected="isTrashCommentSelected"
        :is-trash-article-selected="isTrashArticleSelected"
        @select-all-trash-folders="selectAllTrashFolders"
        @clear-trash-folder-selection="clearTrashFolderSelection"
        @batch-restore-trash-folders="batchRestoreTrashFolders"
        @batch-purge-trash-folders="batchPurgeTrashFolders"
        @set-trash-folder-selection="
          setTrashFolderSelection($event.id, $event.checked)
        "
        @prev-trash-folder-page="prevTrashFolderPage"
        @next-trash-folder-page="nextTrashFolderPage"
        @trash-folder-page-size-change="handleTrashFolderPageSizeChange($event)"
        @restore-folder-from-trash="handleRestoreFolderFromTrash"
        @purge-folder-from-trash="handlePurgeFolderFromTrash"
        @select-all-trash-videos="selectAllTrashVideos"
        @clear-trash-video-selection="clearTrashVideoSelection"
        @batch-restore-trash-videos="batchRestoreTrashVideos"
        @batch-purge-trash-videos="batchPurgeTrashVideos"
        @set-trash-video-selection="
          setTrashVideoSelection($event.id, $event.checked)
        "
        @prev-trash-video-page="prevTrashVideoPage"
        @next-trash-video-page="nextTrashVideoPage"
        @trash-video-page-size-change="handleTrashVideoPageSizeChange($event)"
        @restore-video-from-trash="handleRestoreVideoFromTrash"
        @purge-video-from-trash="handlePurgeVideoFromTrash"
        @select-all-trash-comments="selectAllTrashComments"
        @clear-trash-comment-selection="clearTrashCommentSelection"
        @batch-restore-trash-comments="batchRestoreTrashComments"
        @batch-purge-trash-comments="batchPurgeTrashComments"
        @set-trash-comment-selection="setTrashCommentSelection($event.id, $event.checked)"
        @prev-trash-comment-page="goToTrashCommentPage(trashCommentPage - 1)"
        @next-trash-comment-page="goToTrashCommentPage(trashCommentPage + 1)"
        @trash-comment-page-size-change="handleTrashCommentPageSizeChange($event)"
        @restore-comment-from-trash="handleRestoreCommentFromTrash"
        @purge-comment-from-trash="handlePurgeCommentFromTrash"
        @select-all-trash-articles="selectAllTrashArticles"
        @clear-trash-article-selection="clearTrashArticleSelection"
        @batch-restore-trash-articles="batchRestoreTrashArticles"
        @batch-purge-trash-articles="batchPurgeTrashArticles"
        @set-trash-article-selection="setTrashArticleSelection($event.id, $event.checked)"
        @prev-trash-article-page="goToTrashArticlePage(trashArticlePage - 1)"
        @next-trash-article-page="goToTrashArticlePage(trashArticlePage + 1)"
        @trash-article-page-size-change="handleTrashArticlePageSizeChange($event)"
        @restore-article-from-trash="handleRestoreArticleFromTrash"
        @purge-article-from-trash="handlePurgeArticleFromTrash"
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
      :search="manageCustomTagSearch"
      :sort="manageCustomTagSort"
      :filtered-total="manageCustomTagFilteredTotal"
      @update:open="toolsOpen = $event"
      @update:new-tag-name="newCustomTagName = $event"
      @update:search="manageCustomTagSearch = $event"
      @update:sort="manageCustomTagSort = $event"
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
      @select-all="selectAllAutoInitFolders"
      @clear-selection="clearAutoInitFolders"
      @toggle-folder="
        (remoteId, checked) => toggleAutoInitFolder(remoteId, checked)
      "
      @start="confirmAutoInitSetup"
    />

    <AiSettingsDialog
      :open="aiSettingsDialogOpen"
      :t="t"
      :loading="aiSettingsBusy"
      :settings="aiSettings"
      :section="settingsSection"
      :listener-loading="bidirectionalSyncSaving"
      :listener-settings="bidirectionalSyncSettings"
      :tag-enrichment-loading="tagEnrichmentLoading"
      :tag-enrichment-settings="tagEnrichmentSettings"
      :show-ai="AI_ORGANIZER_ENABLED || AI_CATEGORIES_ENABLED"
      :show-listener="BILIBILI_LISTENER_SETTINGS_ENABLED"
      :show-tag-enrichment="TAG_SYNC_ENABLED"
      :locale="locale"
      :is-dark="isDark"
      :video-card-width="videoCardWidth"
      :comment-card-width="commentCardWidth"
      :article-card-width="articleCardWidth"
      :update-status="extensionUpdateStatus"
      :update-loading="extensionUpdateLoading"
      @update:open="handleAiSettingsDialogOpen"
      @update:section="settingsSection = $event"
      @reload="refreshAiSettings"
      @save="saveAiSettings"
      @test="testAiSettingsFromUi"
      @reload-listener="refreshBidirectionalSyncSettings"
      @save-listener="saveBidirectionalSyncSettings"
      @save-tag-enrichment="saveTagEnrichmentSettingsFromUi"
      @set-locale="uiStore.setLocale($event)"
      @set-theme="uiStore.setTheme($event)"
      @set-video-card-width="uiStore.setVideoCardWidth($event)"
      @set-comment-card-width="uiStore.setCommentCardWidth($event)"
      @set-article-card-width="uiStore.setArticleCardWidth($event)"
      @check-update="checkExtensionUpdateFromUi"
    />

    <AiOrganizerDialog
      v-if="AI_ORGANIZER_ENABLED"
      :open="aiOrganizerDialogOpen"
      :t="t"
      :status="aiOrganizerStatus"
      :settings="aiSettings"
      :current-folder="activeFolder"
      :busy="aiOrganizerBusy"
      :preview-items="aiOrganizerPreviewItems"
      :preview-pagination="aiOrganizerPreviewPagination"
      :preview-low-only="aiOrganizerPreviewLowOnly"
      @update:open="aiOrganizerDialogOpen = $event"
      @settings="openAiSettingsDialog"
      @refresh="refreshAiOrganizerState()"
      @start="startAiOrganizerFromUi"
      @pause="pauseAiOrganizerFromUi"
      @resume="resumeAiOrganizerFromUi"
      @cancel="cancelAiOrganizerFromUi"
      @apply="applyAiOrganizerFromUi"
      @undo="undoAiOrganizerFromUi"
      @backup="downloadAiOrganizerBackupFromUi"
      @preview-page="loadAiOrganizerPreview"
      @update:preview-low-only="setAiOrganizerPreviewLowOnly"
      @update-assignment="updateAiOrganizerAssignmentFromUi"
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
      :resume-page="syncResumePage"
      :status="syncHistoryStatus"
      :now-ms="tickNow"
      :stopping="syncStopping"
      :tag-enrichment-status="tagEnrichmentStatus"
      :tag-enrichment-loading="tagEnrichmentLoading"
      :tag-folders="folders"
      :selected-tag-folder-ids="tagSelectedFolderIds"
      @update:open="syncDialogOpen = $event"
      @reload="loadSyncFolderOptions(true)"
      @select-all="selectAllSyncFolders"
      @clear-selection="clearSyncFolders"
      @toggle-tag-folder="toggleTagFolder"
      @select-all-tag-folders="selectAllTagFolders"
      @clear-tag-folder-selection="clearTagFolders"
      @toggle-folder="
        (remoteId, checked) => toggleSyncFolder(remoteId, checked)
      "
      @submit="submitSyncImport"
      @resume="resumeHistoryModelSyncFromUi"
      @restart="restartHistoryModelSyncFromUi"
      @stop="stopHistoryModelSyncFromUi"
      @dismiss="dismissHistoryModelSyncFromUi"
      @refresh-tag-enrichment="refreshTagEnrichmentState"
      @start-tag-enrichment="resumeTagEnrichmentFromUi"
      @stop-tag-enrichment="pauseTagEnrichmentFromUi"
      @run-tag-enrichment="runTagEnrichmentNowFromUi"
      @dismiss-tag-enrichment="dismissTagEnrichmentFromUi"
      @interrupt-tag-enrichment="dismissTagEnrichmentFromUi"
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
    <FollowingUpImportDialog
      :open="followingUpImportDialogOpen"
      :t="t"
      :loading="followingUpLoading"
      :status="followingUpImportStatus"
      @update:open="followingUpImportDialogOpen = $event"
      @confirm="handleStartFollowingUpImport"
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
