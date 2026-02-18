import type { Ref } from "vue";
import { toggleFieldTokenKeyword, type SearchFieldToken } from "@/lib/search-keyword";
import type { Locale } from "@/stores/app-ui";

type UseManagerFilterActionsParams = {
  trashMode: Ref<boolean>;
  keyword: Ref<string>;
  fromDate: Ref<string>;
  toDate: Ref<string>;
  selectedFolderId: Ref<number | null>;
  selectedVideoIds: Ref<number[]>;
  batchPanelOpen: Ref<boolean>;
  videoPage: Ref<number>;
  syncManagerQueryToRoute: (replace?: boolean) => Promise<void>;
  refreshVideos: () => Promise<void>;
  locale: Ref<Locale>;
};

export function useManagerFilterActions(params: UseManagerFilterActionsParams) {
  const {
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
  } = params;

  async function handleSearchSubmit() {
    videoPage.value = 1;
    await syncManagerQueryToRoute();
    await refreshVideos();
  }

  async function applyDateFilter() {
    videoPage.value = 1;
    await syncManagerQueryToRoute();
    await refreshVideos();
  }

  async function clearDateFilter() {
    if (trashMode.value) return;
    fromDate.value = "";
    toDate.value = "";
    videoPage.value = 1;
    await syncManagerQueryToRoute();
    await refreshVideos();
  }

  async function handleSelectFolder(id: number | null) {
    selectedFolderId.value = id;
    selectedVideoIds.value = [];
    videoPage.value = 1;
    batchPanelOpen.value = false;
    await syncManagerQueryToRoute();
    await refreshVideos();
  }

  async function clearSearch() {
    if (trashMode.value) return;
    keyword.value = "";
    fromDate.value = "";
    toDate.value = "";
    videoPage.value = 1;
    selectedVideoIds.value = [];
    batchPanelOpen.value = false;
    await syncManagerQueryToRoute();
    await refreshVideos();
  }

  function handleAppendFieldToken(field: SearchFieldToken) {
    keyword.value = toggleFieldTokenKeyword(keyword.value, field, locale.value);
  }

  return {
    handleSearchSubmit,
    applyDateFilter,
    clearDateFilter,
    handleSelectFolder,
    clearSearch,
    handleAppendFieldToken,
  };
}
