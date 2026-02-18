import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  fetchFolders,
  fetchTags,
  fetchTrashFolders,
  fetchTrashVideos,
  fetchVideos,
  searchVideos,
} from "@/lib/api";
import type { Folder, Tag, Video, VideoFilter } from "@/types";

export const PAGE_SIZE_OPTIONS = [12, 24, 30, 48, 60];
export const TRASH_VIDEO_PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
export const TRASH_FOLDER_PAGE_SIZE_OPTIONS = [5, 10, 20, 30];
export const MANAGE_CUSTOM_TAG_PAGE_SIZE = 24;

function toNumericId(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const useLibraryStore = defineStore("library", () => {
  const folders = ref<Folder[]>([]);
  const tags = ref<Tag[]>([]);
  const videos = ref<Video[]>([]);
  const trashFolders = ref<Folder[]>([]);
  const trashVideos = ref<Video[]>([]);

  const keyword = ref("");
  const selectedFolderId = ref<number | null>(null);
  const selectedVideoIds = ref<number[]>([]);
  const selectedTrashFolderIds = ref<number[]>([]);
  const selectedTrashVideoIds = ref<number[]>([]);
  const batchTargetFolderId = ref<number | null>(null);
  const batchPanelOpen = ref(false);
  const fromDate = ref("");
  const toDate = ref("");
  const newCustomTagName = ref("");
  const manageCustomTagPage = ref(1);
  const videoPage = ref(1);
  const videoPageSize = ref(30);
  const trashFolderPage = ref(1);
  const trashFolderPageSize = ref(10);
  const trashVideoPage = ref(1);
  const trashVideoPageSize = ref(20);

  const loading = ref(false);
  const total = ref(0);
  const trashVideoTotal = ref(0);
  const bootstrapped = ref(false);
  let bootstrapPromise: Promise<void> | null = null;

  const customTags = computed(() =>
    tags.value.filter((tag) => tag.type === "custom")
  );
  const manageCustomTagTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(customTags.value.length / MANAGE_CUSTOM_TAG_PAGE_SIZE)
    )
  );
  const pagedManageCustomTags = computed(() => {
    const start = (manageCustomTagPage.value - 1) * MANAGE_CUSTOM_TAG_PAGE_SIZE;
    return customTags.value.slice(start, start + MANAGE_CUSTOM_TAG_PAGE_SIZE);
  });
  const hasSelection = computed(() => selectedVideoIds.value.length > 0);
  const canMoveFromCurrentFolder = computed(
    () => selectedFolderId.value !== null
  );
  const videoTotalPages = computed(() =>
    Math.max(1, Math.ceil(total.value / videoPageSize.value))
  );
  const trashVideoTotalPages = computed(() =>
    Math.max(1, Math.ceil(trashVideoTotal.value / trashVideoPageSize.value))
  );
  const trashFolderTotalPages = computed(() =>
    Math.max(1, Math.ceil(trashFolders.value.length / trashFolderPageSize.value))
  );
  const pagedTrashFolders = computed(() => {
    const start = (trashFolderPage.value - 1) * trashFolderPageSize.value;
    return trashFolders.value.slice(start, start + trashFolderPageSize.value);
  });
  const activeFilters = computed(() => {
    const filters: VideoFilter = {};
    if (fromDate.value.trim()) {
      const from = new Date(fromDate.value).getTime();
      if (!Number.isNaN(from)) filters.from = from;
    }

    if (toDate.value.trim()) {
      const to = new Date(toDate.value).getTime();
      if (!Number.isNaN(to)) filters.to = to;
    }

    return filters;
  });

  async function refreshFolders() {
    folders.value = (await fetchFolders()).map((folder) => ({
      ...folder,
      id: toNumericId(folder.id),
    }));
  }

  async function refreshTags() {
    const hidden = new Set(["uncategorized", "\u672A\u5206\u7C7B"]);
    tags.value = (await fetchTags())
      .filter((tag) => !hidden.has(tag.name))
      .map((tag) => ({
        ...tag,
        id: toNumericId(tag.id),
      }));
  }

  async function ensureBootstrapped() {
    if (bootstrapped.value) return;
    if (bootstrapPromise) {
      await bootstrapPromise;
      return;
    }

    bootstrapPromise = (async () => {
      await Promise.all([refreshFolders(), refreshTags()]);
      bootstrapped.value = true;
    })();

    try {
      await bootstrapPromise;
    } finally {
      bootstrapPromise = null;
    }
  }

  async function refreshVideos(params: {
    extracted: Partial<
      Record<"title" | "uploader" | "description" | "systemTag" | "customTag", string>
    >;
    globalKeyword: string;
  }) {
    loading.value = true;
    try {
      const filters: VideoFilter = { ...activeFilters.value };

      if (params.extracted.title) filters.title = params.extracted.title;
      if (params.extracted.uploader) filters.uploader = params.extracted.uploader;
      if (params.extracted.description)
        filters.description = params.extracted.description;
      if (params.extracted.systemTag) filters.systemTag = params.extracted.systemTag;
      if (params.extracted.customTag) filters.customTag = params.extracted.customTag;

      const query = {
        page: videoPage.value,
        pageSize: videoPageSize.value,
        folderId: selectedFolderId.value ?? undefined,
        filters,
      };

      const result = params.globalKeyword
        ? await searchVideos({ ...query, q: params.globalKeyword })
        : await fetchVideos(query);
      videos.value = result.items.map((video) => ({
        ...video,
        id: toNumericId(video.id),
      }));
      total.value = result.pagination.total;

      const maxPage = Math.max(
        1,
        Math.ceil(result.pagination.total / videoPageSize.value)
      );
      if (videoPage.value > maxPage) {
        videoPage.value = maxPage;
        await refreshVideos(params);
        return;
      }

      selectedVideoIds.value = selectedVideoIds.value.filter((id) =>
        videos.value.some((video) => video.id === id)
      );
    } finally {
      loading.value = false;
    }
  }

  async function refreshTrash() {
    loading.value = true;
    try {
      const [folderResult, videoResult] = await Promise.all([
        fetchTrashFolders(),
        fetchTrashVideos({
          page: trashVideoPage.value,
          pageSize: trashVideoPageSize.value,
        }),
      ]);

      trashFolders.value = folderResult.map((folder) => ({
        ...folder,
        id: toNumericId(folder.id),
      }));
      trashVideos.value = videoResult.items.map((video) => ({
        ...video,
        id: toNumericId(video.id),
      }));
      trashVideoTotal.value = videoResult.pagination.total;

      const maxTrashVideoPage = Math.max(
        1,
        Math.ceil(trashVideoTotal.value / trashVideoPageSize.value)
      );
      if (trashVideoPage.value > maxTrashVideoPage) {
        trashVideoPage.value = maxTrashVideoPage;
      }

      const maxTrashFolderPage = Math.max(
        1,
        Math.ceil(trashFolders.value.length / trashFolderPageSize.value)
      );
      if (trashFolderPage.value > maxTrashFolderPage) {
        trashFolderPage.value = maxTrashFolderPage;
      }

      selectedTrashFolderIds.value = selectedTrashFolderIds.value.filter((id) =>
        trashFolders.value.some((folder) => folder.id === id)
      );
      selectedTrashVideoIds.value = selectedTrashVideoIds.value.filter((id) =>
        trashVideos.value.some((video) => video.id === id)
      );
    } finally {
      loading.value = false;
    }
  }

  async function prefetchForRoute(view: "manager" | "trash") {
    await ensureBootstrapped();
    if (view === "trash") {
      if (trashFolders.value.length === 0 && trashVideos.value.length === 0) {
        await refreshTrash();
      }
      return;
    }

    if (videos.value.length === 0 && total.value === 0) {
      await refreshVideos({ extracted: {}, globalKeyword: "" });
    }
  }

  function setVideoSelection(id: number, checked: boolean) {
    const videoId = toNumericId(id);
    selectedVideoIds.value = checked
      ? [...new Set([...selectedVideoIds.value, videoId])]
      : selectedVideoIds.value.filter((item) => item !== videoId);
  }

  function clearVideoSelection() {
    selectedVideoIds.value = [];
  }

  function selectAllVisible() {
    selectedVideoIds.value = videos.value.map((video) => video.id);
  }

  function setTrashFolderSelection(id: number, checked: boolean) {
    const folderId = toNumericId(id);
    selectedTrashFolderIds.value = checked
      ? [...new Set([...selectedTrashFolderIds.value, folderId])]
      : selectedTrashFolderIds.value.filter((item) => item !== folderId);
  }

  function setTrashVideoSelection(id: number, checked: boolean) {
    const videoId = toNumericId(id);
    selectedTrashVideoIds.value = checked
      ? [...new Set([...selectedTrashVideoIds.value, videoId])]
      : selectedTrashVideoIds.value.filter((item) => item !== videoId);
  }

  function selectAllTrashFolders() {
    selectedTrashFolderIds.value = pagedTrashFolders.value.map((item) =>
      toNumericId(item.id)
    );
  }

  function clearTrashFolderSelection() {
    selectedTrashFolderIds.value = [];
  }

  function selectAllTrashVideos() {
    selectedTrashVideoIds.value = trashVideos.value.map((item) =>
      toNumericId(item.id)
    );
  }

  function clearTrashVideoSelection() {
    selectedTrashVideoIds.value = [];
  }

  function isTrashFolderSelected(id: number) {
    const folderId = toNumericId(id);
    return selectedTrashFolderIds.value.some(
      (item) => toNumericId(item) === folderId
    );
  }

  function isTrashVideoSelected(id: number) {
    const videoId = toNumericId(id);
    return selectedTrashVideoIds.value.some(
      (item) => toNumericId(item) === videoId
    );
  }

  function resetForViewSwitch() {
    batchPanelOpen.value = false;
    selectedVideoIds.value = [];
    selectedTrashFolderIds.value = [];
    selectedTrashVideoIds.value = [];
    videoPage.value = 1;
  }

  return {
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
    bootstrapped,
    customTags,
    manageCustomTagTotalPages,
    pagedManageCustomTags,
    hasSelection,
    canMoveFromCurrentFolder,
    videoTotalPages,
    trashVideoTotalPages,
    trashFolderTotalPages,
    pagedTrashFolders,
    refreshFolders,
    refreshTags,
    ensureBootstrapped,
    refreshVideos,
    refreshTrash,
    prefetchForRoute,
    setVideoSelection,
    clearVideoSelection,
    selectAllVisible,
    setTrashFolderSelection,
    setTrashVideoSelection,
    selectAllTrashFolders,
    clearTrashFolderSelection,
    selectAllTrashVideos,
    clearTrashVideoSelection,
    isTrashFolderSelected,
    isTrashVideoSelected,
    resetForViewSwitch,
  };
});
