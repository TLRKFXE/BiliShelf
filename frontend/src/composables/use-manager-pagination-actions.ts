import type { Ref } from "vue";

type UseManagerPaginationActionsParams = {
  videoPage: Ref<number>;
  videoTotalPages: Ref<number>;
  videoPageSize: Ref<number>;
  selectedVideoIds: Ref<number[]>;
  batchPanelOpen: Ref<boolean>;
  syncManagerQueryToRoute: (replace?: boolean) => Promise<void>;
  refreshVideos: () => Promise<void>;
  trashFolderPage: Ref<number>;
  trashFolderTotalPages: Ref<number>;
  selectedTrashFolderIds: Ref<number[]>;
  trashFolderPageSize: Ref<number>;
  trashVideoPage: Ref<number>;
  trashVideoTotalPages: Ref<number>;
  selectedTrashVideoIds: Ref<number[]>;
  trashVideoPageSize: Ref<number>;
  refreshTrash: () => Promise<void>;
};

export function useManagerPaginationActions(
  params: UseManagerPaginationActionsParams
) {
  const {
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
  } = params;

  async function goToVideoPage(nextPage: number) {
    const target = Math.min(Math.max(1, nextPage), videoTotalPages.value);
    if (target === videoPage.value) return;
    videoPage.value = target;
    selectedVideoIds.value = [];
    batchPanelOpen.value = false;
    await syncManagerQueryToRoute();
    await refreshVideos();
  }

  async function prevVideoPage() {
    await goToVideoPage(videoPage.value - 1);
  }

  async function nextVideoPage() {
    await goToVideoPage(videoPage.value + 1);
  }

  async function handleVideoPageSizeChange(value: string) {
    const parsed = Number(value);
    if (
      !Number.isFinite(parsed) ||
      parsed <= 0 ||
      parsed === videoPageSize.value
    ) {
      return;
    }
    videoPageSize.value = parsed;
    videoPage.value = 1;
    selectedVideoIds.value = [];
    batchPanelOpen.value = false;
    await syncManagerQueryToRoute();
    await refreshVideos();
  }

  function goToTrashFolderPage(nextPage: number) {
    const target = Math.min(Math.max(1, nextPage), trashFolderTotalPages.value);
    if (target === trashFolderPage.value) return;
    trashFolderPage.value = target;
    selectedTrashFolderIds.value = [];
  }

  function prevTrashFolderPage() {
    goToTrashFolderPage(trashFolderPage.value - 1);
  }

  function nextTrashFolderPage() {
    goToTrashFolderPage(trashFolderPage.value + 1);
  }

  function handleTrashFolderPageSizeChange(value: string) {
    const parsed = Number(value);
    if (
      !Number.isFinite(parsed) ||
      parsed <= 0 ||
      parsed === trashFolderPageSize.value
    ) {
      return;
    }
    trashFolderPageSize.value = parsed;
    trashFolderPage.value = 1;
    selectedTrashFolderIds.value = [];
  }

  async function goToTrashVideoPage(nextPage: number) {
    const target = Math.min(Math.max(1, nextPage), trashVideoTotalPages.value);
    if (target === trashVideoPage.value) return;
    trashVideoPage.value = target;
    selectedTrashVideoIds.value = [];
    await refreshTrash();
  }

  async function prevTrashVideoPage() {
    await goToTrashVideoPage(trashVideoPage.value - 1);
  }

  async function nextTrashVideoPage() {
    await goToTrashVideoPage(trashVideoPage.value + 1);
  }

  async function handleTrashVideoPageSizeChange(value: string) {
    const parsed = Number(value);
    if (
      !Number.isFinite(parsed) ||
      parsed <= 0 ||
      parsed === trashVideoPageSize.value
    ) {
      return;
    }
    trashVideoPageSize.value = parsed;
    trashVideoPage.value = 1;
    selectedTrashVideoIds.value = [];
    await refreshTrash();
  }

  return {
    goToVideoPage,
    prevVideoPage,
    nextVideoPage,
    handleVideoPageSizeChange,
    goToTrashFolderPage,
    prevTrashFolderPage,
    nextTrashFolderPage,
    handleTrashFolderPageSizeChange,
    goToTrashVideoPage,
    prevTrashVideoPage,
    nextTrashVideoPage,
    handleTrashVideoPageSizeChange,
  };
}
