<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import ConfirmActionDialog from "./components/dialogs/ConfirmActionDialog.vue";
import ManageTagsDialog from "./components/dialogs/ManageTagsDialog.vue";
import RenameTagDialog from "./components/dialogs/RenameTagDialog.vue";
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

const { notifySuccess, notifyError } = useAppToast(t);
const { detailOpen, detailLoading, detailVideo, openVideoDetail } = useVideoDetail(
  t,
  notifyError
);
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

onMounted(async () => {
  uiStore.initFromStorage();
  if (route.name === "manager") {
    applyManagerQuery(route.query);
  }
  loading.value = true;
  try {
    await libraryStore.ensureBootstrapped();
    if (route.name === "trash") {
      await refreshTrash();
    } else {
      await refreshVideos();
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
        @open-tags="toolsOpen = true"
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
      :detail-video="detailVideo"
      @update:open="detailOpen = $event"
    />
  </main>
</template>
