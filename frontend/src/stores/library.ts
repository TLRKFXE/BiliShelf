import { defineStore } from "pinia";
import { computed, ref } from "vue";
import {
  fetchFolders,
  fetchTags,
  fetchTrashArticles,
  fetchTrashComments,
  fetchTrashFolders,
  fetchTrashVideos,
  fetchVideos,
  searchVideos,
} from "@/lib/api";
import type {
  FavoriteArticle,
  FavoriteComment,
  Folder,
  Tag,
  Video,
  VideoFilter,
} from "@/types";

export const PAGE_SIZE_OPTIONS = [12, 24, 30, 48, 60];
export const TRASH_VIDEO_PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
export const TRASH_FOLDER_PAGE_SIZE_OPTIONS = [5, 10, 20, 30];
export const TRASH_CONTENT_PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
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
  const trashComments = ref<FavoriteComment[]>([]);
  const trashArticles = ref<FavoriteArticle[]>([]);

  const keyword = ref("");
  const selectedFolderId = ref<number | null>(null);
  const selectedVideoIds = ref<number[]>([]);
  const selectedTrashFolderIds = ref<number[]>([]);
  const selectedTrashVideoIds = ref<number[]>([]);
  const selectedTrashCommentIds = ref<number[]>([]);
  const selectedTrashArticleIds = ref<number[]>([]);
  const batchTargetFolderId = ref<number | null>(null);
  const batchPanelOpen = ref(false);
  const fromDate = ref("");
  const toDate = ref("");
  const newCustomTagName = ref("");
  const manageCustomTagSearch = ref("");
  const manageCustomTagSort = ref<
    "name-asc" | "name-desc" | "usage-asc" | "usage-desc" | "created-asc" | "created-desc"
  >("created-desc");
  const manageCustomTagPage = ref(1);
  const videoPage = ref(1);
  const videoPageSize = ref(30);
  const trashFolderPage = ref(1);
  const trashFolderPageSize = ref(10);
  const trashVideoPage = ref(1);
  const trashVideoPageSize = ref(20);
  const trashCommentPage = ref(1);
  const trashCommentPageSize = ref(20);
  const trashArticlePage = ref(1);
  const trashArticlePageSize = ref(20);

  const loading = ref(false);
  const total = ref(0);
  const trashVideoTotal = ref(0);
  const trashCommentTotal = ref(0);
  const trashArticleTotal = ref(0);
  const bootstrapped = ref(false);
  let bootstrapPromise: Promise<void> | null = null;
  let refreshVideosRunId = 0;
  let refreshVideosLoadingRunId = 0;

  const customTags = computed(() =>
    tags.value.filter((tag) => tag.type === "custom")
  );
  const filteredManageCustomTags = computed(() => {
    const keyword = manageCustomTagSearch.value.trim().toLocaleLowerCase();
    const rows = customTags.value.filter((tag) =>
      keyword ? tag.name.toLocaleLowerCase().includes(keyword) : true,
    );
    const [field, direction] = manageCustomTagSort.value.split("-");
    const factor = direction === "asc" ? 1 : -1;
    return rows.slice().sort((left, right) => {
      if (field === "name") return factor * left.name.localeCompare(right.name);
      if (field === "usage") {
        return factor * (left.usageCount - right.usageCount) || left.name.localeCompare(right.name);
      }
      return factor * (left.createdAt - right.createdAt) || left.name.localeCompare(right.name);
    });
  });
  const manageCustomTagTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(filteredManageCustomTags.value.length / MANAGE_CUSTOM_TAG_PAGE_SIZE)
    )
  );
  const manageCustomTagFilteredTotal = computed(() => filteredManageCustomTags.value.length);
  const pagedManageCustomTags = computed(() => {
    const start = (manageCustomTagPage.value - 1) * MANAGE_CUSTOM_TAG_PAGE_SIZE;
    return filteredManageCustomTags.value.slice(start, start + MANAGE_CUSTOM_TAG_PAGE_SIZE);
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
  const trashCommentTotalPages = computed(() =>
    Math.max(1, Math.ceil(trashCommentTotal.value / trashCommentPageSize.value))
  );
  const trashArticleTotalPages = computed(() =>
    Math.max(1, Math.ceil(trashArticleTotal.value / trashArticlePageSize.value))
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
    silent?: boolean;
  }) {
    const runId = ++refreshVideosRunId;
    const showLoading = params.silent !== true;
    if (showLoading) {
      refreshVideosLoadingRunId = runId;
      loading.value = true;
    }
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
      if (runId !== refreshVideosRunId) return;

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
      if (showLoading && runId === refreshVideosLoadingRunId) {
        loading.value = false;
      }
    }
  }

  async function refreshTrash() {
    loading.value = true;
    try {
      let [folderResult, videoResult, commentResult, articleResult] = await Promise.all([
        fetchTrashFolders(),
        fetchTrashVideos({
          page: trashVideoPage.value,
          pageSize: trashVideoPageSize.value,
        }),
        fetchTrashComments({
          page: trashCommentPage.value,
          pageSize: trashCommentPageSize.value,
        }),
        fetchTrashArticles({
          page: trashArticlePage.value,
          pageSize: trashArticlePageSize.value,
        }),
      ]);

      const maxTrashVideoPage = Math.max(
        1,
        Math.ceil(videoResult.pagination.total / trashVideoPageSize.value)
      );
      if (trashVideoPage.value > maxTrashVideoPage) {
        trashVideoPage.value = maxTrashVideoPage;
        videoResult = await fetchTrashVideos({
          page: trashVideoPage.value,
          pageSize: trashVideoPageSize.value,
        });
      }

      const maxTrashFolderPage = Math.max(
        1,
        Math.ceil(trashFolders.value.length / trashFolderPageSize.value)
      );
      if (trashFolderPage.value > maxTrashFolderPage) {
        trashFolderPage.value = maxTrashFolderPage;
      }

      const maxTrashCommentPage = Math.max(
        1,
        Math.ceil(commentResult.pagination.total / trashCommentPageSize.value),
      );
      if (trashCommentPage.value > maxTrashCommentPage) {
        trashCommentPage.value = maxTrashCommentPage;
        commentResult = await fetchTrashComments({
          page: trashCommentPage.value,
          pageSize: trashCommentPageSize.value,
        });
      }

      const maxTrashArticlePage = Math.max(
        1,
        Math.ceil(articleResult.pagination.total / trashArticlePageSize.value),
      );
      if (trashArticlePage.value > maxTrashArticlePage) {
        trashArticlePage.value = maxTrashArticlePage;
        articleResult = await fetchTrashArticles({
          page: trashArticlePage.value,
          pageSize: trashArticlePageSize.value,
        });
      }

      trashFolders.value = folderResult.map((folder) => ({
        ...folder,
        id: toNumericId(folder.id),
      }));
      trashVideos.value = videoResult.items.map((video) => ({
        ...video,
        id: toNumericId(video.id),
      }));
      trashVideoTotal.value = videoResult.pagination.total;
      trashComments.value = commentResult.items.map((comment) => ({
        ...comment,
        id: toNumericId(comment.id),
      }));
      trashCommentTotal.value = commentResult.pagination.total;
      trashArticles.value = articleResult.items.map((article) => ({
        ...article,
        id: toNumericId(article.id),
      }));
      trashArticleTotal.value = articleResult.pagination.total;

      selectedTrashFolderIds.value = selectedTrashFolderIds.value.filter((id) =>
        trashFolders.value.some((folder) => folder.id === id)
      );
      selectedTrashVideoIds.value = selectedTrashVideoIds.value.filter((id) =>
        trashVideos.value.some((video) => video.id === id)
      );
      selectedTrashCommentIds.value = selectedTrashCommentIds.value.filter((id) =>
        trashComments.value.some((comment) => comment.id === id),
      );
      selectedTrashArticleIds.value = selectedTrashArticleIds.value.filter((id) =>
        trashArticles.value.some((article) => article.id === id),
      );
    } finally {
      loading.value = false;
    }
  }

  async function prefetchForRoute(
    view: "manager" | "trash" | "following-ups" | "comments" | "articles"
  ) {
    await ensureBootstrapped();
    if (view === "following-ups" || view === "comments" || view === "articles") {
      return;
    }
    if (view === "trash") {
      if (
        trashFolders.value.length === 0 &&
        trashVideos.value.length === 0 &&
        trashComments.value.length === 0 &&
        trashArticles.value.length === 0
      ) {
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

  function setTrashCommentSelection(id: number, checked: boolean) {
    const commentId = toNumericId(id);
    selectedTrashCommentIds.value = checked
      ? [...new Set([...selectedTrashCommentIds.value, commentId])]
      : selectedTrashCommentIds.value.filter((item) => item !== commentId);
  }

  function setTrashArticleSelection(id: number, checked: boolean) {
    const articleId = toNumericId(id);
    selectedTrashArticleIds.value = checked
      ? [...new Set([...selectedTrashArticleIds.value, articleId])]
      : selectedTrashArticleIds.value.filter((item) => item !== articleId);
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

  function selectAllTrashComments() {
    selectedTrashCommentIds.value = trashComments.value.map((item) => toNumericId(item.id));
  }

  function clearTrashCommentSelection() {
    selectedTrashCommentIds.value = [];
  }

  function selectAllTrashArticles() {
    selectedTrashArticleIds.value = trashArticles.value.map((item) => toNumericId(item.id));
  }

  function clearTrashArticleSelection() {
    selectedTrashArticleIds.value = [];
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

  function isTrashCommentSelected(id: number) {
    const commentId = toNumericId(id);
    return selectedTrashCommentIds.value.some((item) => toNumericId(item) === commentId);
  }

  function isTrashArticleSelected(id: number) {
    const articleId = toNumericId(id);
    return selectedTrashArticleIds.value.some((item) => toNumericId(item) === articleId);
  }

  function resetForViewSwitch() {
    batchPanelOpen.value = false;
    selectedVideoIds.value = [];
    selectedTrashFolderIds.value = [];
    selectedTrashVideoIds.value = [];
    selectedTrashCommentIds.value = [];
    selectedTrashArticleIds.value = [];
    videoPage.value = 1;
  }

  return {
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
    bootstrapped,
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
    setTrashCommentSelection,
    setTrashArticleSelection,
    selectAllTrashFolders,
    clearTrashFolderSelection,
    selectAllTrashVideos,
    clearTrashVideoSelection,
    selectAllTrashComments,
    clearTrashCommentSelection,
    selectAllTrashArticles,
    clearTrashArticleSelection,
    isTrashFolderSelected,
    isTrashVideoSelected,
    isTrashCommentSelected,
    isTrashArticleSelected,
    resetForViewSwitch,
  };
});
