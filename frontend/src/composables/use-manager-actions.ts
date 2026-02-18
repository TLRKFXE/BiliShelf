import type { Ref } from "vue";
import {
  batchDeleteVideos,
  batchMoveOrCopyVideos,
  createFolder,
  createTag,
  deleteFolder,
  deleteTag,
  purgeTrashFolder,
  purgeTrashVideo,
  reorderFolders,
  restoreTrashFolder,
  restoreTrashVideo,
  updateFolder,
  updateTag,
} from "@/lib/api";
import type { Tag } from "@/types";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;
type NotifySuccessFn = (title: string, description?: string) => void;
type NotifyErrorFn = (title: string, error?: unknown, fallback?: string) => void;
type OpenConfirmDialogFn = (options: {
  title?: string;
  description?: string;
  confirmText?: string;
  variant?: "default" | "destructive";
}) => Promise<boolean>;

type UseManagerActionsParams = {
  t: TranslateFn;
  notifySuccess: NotifySuccessFn;
  notifyError: NotifyErrorFn;
  openConfirmDialog: OpenConfirmDialogFn;
  selectedFolderId: Ref<number | null>;
  selectedVideoIds: Ref<number[]>;
  selectedTrashFolderIds: Ref<number[]>;
  selectedTrashVideoIds: Ref<number[]>;
  batchTargetFolderId: Ref<number | null>;
  batchPanelOpen: Ref<boolean>;
  hasSelection: Ref<boolean>;
  newCustomTagName: Ref<string>;
  renameTagTarget: Ref<Tag | null>;
  renameTagValue: Ref<string>;
  setRenameDialogOpen: (open: boolean) => void;
  refreshFolders: () => Promise<void>;
  refreshTagsAndVideos: () => Promise<void>;
  refreshFoldersAndVideos: () => Promise<void>;
  refreshFoldersVideosAndTags: () => Promise<void>;
  refreshTrash: () => Promise<void>;
  refreshTrashAndVideos: () => Promise<void>;
  refreshTrashFoldersAndVideos: () => Promise<void>;
  openVideoDetail: (id: number) => Promise<void>;
};

type QuickAction = "detail" | "delete";

export function useManagerActions(params: UseManagerActionsParams) {
  const {
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
  } = params;

  async function handleCreateFolder(payload: {
    name: string;
    description?: string;
  }) {
    try {
      await createFolder(payload);
      await refreshFolders();
      notifySuccess(t("toast.folderCreated"));
    } catch (error) {
      notifyError(t("toast.folderCreateFail"), error);
    }
  }

  async function handleUpdateFolder(payload: {
    id: number;
    name?: string;
    description?: string | null;
  }) {
    try {
      await updateFolder(payload.id, payload);
      await refreshFolders();
      notifySuccess(t("toast.folderUpdated"));
    } catch (error) {
      notifyError(t("toast.folderUpdateFail"), error);
    }
  }

  async function handleRemoveFolder(id: number) {
    const confirmed = await openConfirmDialog({
      title: t("confirm.deleteFolder.title"),
      description: t("confirm.deleteFolder.desc"),
      confirmText: t("common.delete"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await deleteFolder(id);
      if (selectedFolderId.value === id) selectedFolderId.value = null;
      await refreshFoldersAndVideos();
      notifySuccess(t("toast.folderDeleted"));
    } catch (error) {
      notifyError(t("toast.folderDeleteFail"), error);
    }
  }

  async function handleReorderFolders(folderIds: number[]) {
    if (folderIds.length === 0) return;
    try {
      await reorderFolders(folderIds);
      await refreshFolders();
      notifySuccess(t("toast.folderReordered"));
    } catch (error) {
      notifyError(t("toast.folderReorderFail"), error);
    }
  }

  async function handleCreateCustomTag(rawName?: string) {
    const name = (rawName ?? newCustomTagName.value).trim();
    if (!name) return notifyError(t("toast.tagNameRequired"));

    try {
      await createTag({ name, type: "custom" });
      newCustomTagName.value = "";
      await refreshTagsAndVideos();
      notifySuccess(t("toast.tagCreated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Tag name already exists")) {
        await refreshTagsAndVideos();
        notifySuccess(t("toast.tagRefreshed"));
        return;
      }
      notifyError(t("toast.tagCreateFail"), error);
    }
  }

  async function submitRenameCustomTag() {
    const tag = renameTagTarget.value;
    if (!tag) return;
    const nextName = renameTagValue.value.trim();
    if (!nextName || nextName === tag.name) {
      setRenameDialogOpen(false);
      return;
    }

    try {
      await updateTag(tag.id, { name: nextName });
      await refreshTagsAndVideos();
      notifySuccess(t("toast.tagRenamed"));
      setRenameDialogOpen(false);
    } catch (error) {
      notifyError(t("toast.tagRenameFail"), error);
    }
  }

  async function handleDeleteCustomTag(tag: Tag) {
    const confirmed = await openConfirmDialog({
      title: t("confirm.deleteTag.title"),
      description: t("confirm.deleteTag.desc", { name: tag.name }),
      confirmText: t("common.delete"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await deleteTag(tag.id);
      await refreshTagsAndVideos();
      notifySuccess(t("toast.tagDeleted"));
    } catch (error) {
      notifyError(t("toast.tagDeleteFail"), error);
    }
  }

  async function handleBatchMoveOrCopy(mode: "move" | "copy") {
    if (!hasSelection.value) return notifyError(t("toast.selectVideosFirst"));
    if (!batchTargetFolderId.value)
      return notifyError(t("toast.chooseTargetFolder"));
    if (mode === "move" && selectedFolderId.value === null) {
      return notifyError(t("toast.moveNeedFolderContext"));
    }

    try {
      await batchMoveOrCopyVideos({
        videoIds: selectedVideoIds.value,
        folderId: batchTargetFolderId.value,
        sourceFolderId:
          mode === "move" ? selectedFolderId.value ?? undefined : undefined,
        mode,
      });
      selectedVideoIds.value = [];
      await refreshFoldersAndVideos();
      batchPanelOpen.value = false;
      notifySuccess(mode === "move" ? t("toast.batchMoved") : t("toast.batchCopied"));
    } catch (error) {
      notifyError(t("toast.batchMoveCopyFail"), error);
    }
  }

  async function handleBatchDelete(mode: "folderOnly" | "global") {
    if (!hasSelection.value) return notifyError(t("toast.selectVideosFirst"));
    if (mode === "folderOnly" && selectedFolderId.value === null) {
      return notifyError(t("toast.openSpecificFolder"));
    }

    const confirmed = await openConfirmDialog({
      title:
        mode === "global"
          ? t("confirm.batchDeleteGlobal.title")
          : t("confirm.batchDeleteFolderOnly.title"),
      description:
        mode === "global"
          ? t("confirm.batchDeleteGlobal.desc")
          : t("confirm.batchDeleteFolderOnly.desc"),
      confirmText: t("common.delete"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await batchDeleteVideos({
        videoIds: selectedVideoIds.value,
        mode,
        folderId:
          mode === "folderOnly" ? selectedFolderId.value ?? undefined : undefined,
      });
      selectedVideoIds.value = [];
      await refreshFoldersVideosAndTags();
      batchPanelOpen.value = false;
      notifySuccess(t("toast.batchDeleteDone"));
    } catch (error) {
      notifyError(t("toast.batchDeleteFail"), error);
    }
  }

  async function handleQuickAction(payload: { id: number; action: QuickAction }) {
    if (payload.action === "detail") {
      await openVideoDetail(payload.id);
      return;
    }

    const removeFromCurrentFolder = selectedFolderId.value !== null;
    const deleteMode: "folderOnly" | "global" = removeFromCurrentFolder
      ? "folderOnly"
      : "global";

    const confirmed = await openConfirmDialog({
      title: removeFromCurrentFolder
        ? t("confirm.deleteVideoFolderOnly.title")
        : t("confirm.deleteVideoGlobal.title"),
      description: removeFromCurrentFolder
        ? t("confirm.deleteVideoFolderOnly.desc")
        : t("confirm.deleteVideoGlobal.desc"),
      confirmText: t("common.delete"),
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await batchDeleteVideos({
        videoIds: [payload.id],
        mode: deleteMode,
        folderId:
          deleteMode === "folderOnly" ? selectedFolderId.value ?? undefined : undefined,
      });
      await refreshFoldersVideosAndTags();
      notifySuccess(
        deleteMode === "folderOnly"
          ? t("toast.videoRemovedFromFolder")
          : t("toast.videoDeleted")
      );
    } catch (error) {
      notifyError(t("toast.videoDeleteFail"), error);
    }
  }

  async function batchRestoreTrashFolders() {
    if (selectedTrashFolderIds.value.length === 0)
      return notifyError(t("toast.selectFoldersFirst"));

    try {
      await Promise.all(
        selectedTrashFolderIds.value.map((id) => restoreTrashFolder(id, true))
      );
      await refreshTrashFoldersAndVideos();
      selectedTrashFolderIds.value = [];
      notifySuccess(t("toast.foldersRestored"));
    } catch (error) {
      notifyError(t("toast.restoreFolderFail"), error);
    }
  }

  async function batchPurgeTrashFolders() {
    if (selectedTrashFolderIds.value.length === 0)
      return notifyError(t("toast.selectFoldersFirst"));
    const confirmed = await openConfirmDialog({
      title: t("confirm.purgeFolders.title"),
      description: t("confirm.purgeFolders.desc"),
      confirmText: t("common.delete"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedTrashFolderIds.value.map((id) => purgeTrashFolder(id)));
      selectedTrashFolderIds.value = [];
      await refreshTrash();
      notifySuccess(t("toast.foldersPurged"));
    } catch (error) {
      notifyError(t("toast.purgeFolderFail"), error);
    }
  }

  async function batchRestoreTrashVideos() {
    if (selectedTrashVideoIds.value.length === 0)
      return notifyError(t("toast.selectTrashVideosFirst"));

    try {
      await Promise.all(selectedTrashVideoIds.value.map((id) => restoreTrashVideo(id)));
      selectedTrashVideoIds.value = [];
      await refreshTrashAndVideos();
      notifySuccess(t("toast.videosRestored"));
    } catch (error) {
      notifyError(t("toast.restoreVideoFail"), error);
    }
  }

  async function batchPurgeTrashVideos() {
    if (selectedTrashVideoIds.value.length === 0)
      return notifyError(t("toast.selectTrashVideosFirst"));
    const confirmed = await openConfirmDialog({
      title: t("confirm.purgeVideos.title"),
      description: t("confirm.purgeVideos.desc"),
      confirmText: t("common.delete"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await Promise.all(selectedTrashVideoIds.value.map((id) => purgeTrashVideo(id)));
      selectedTrashVideoIds.value = [];
      await refreshTrash();
      notifySuccess(t("toast.videosPurged"));
    } catch (error) {
      notifyError(t("toast.purgeVideoFail"), error);
    }
  }

  async function handleRestoreFolderFromTrash(id: number) {
    try {
      await restoreTrashFolder(id, true);
      await refreshTrashFoldersAndVideos();
      notifySuccess(t("toast.folderRestored"));
    } catch (error) {
      notifyError(t("toast.restoreFolderFail"), error);
    }
  }

  async function handlePurgeFolderFromTrash(id: number) {
    const confirmed = await openConfirmDialog({
      title: t("confirm.purgeFolderSingle.title"),
      description: t("confirm.purgeFolderSingle.desc"),
      confirmText: t("common.delete"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await purgeTrashFolder(id);
      await refreshTrash();
      notifySuccess(t("toast.folderPurged"));
    } catch (error) {
      notifyError(t("toast.purgeFolderFail"), error);
    }
  }

  async function handleRestoreVideoFromTrash(id: number) {
    try {
      await restoreTrashVideo(id);
      await refreshTrashAndVideos();
      notifySuccess(t("toast.videoRestored"));
    } catch (error) {
      notifyError(t("toast.restoreVideoFail"), error);
    }
  }

  async function handlePurgeVideoFromTrash(id: number) {
    const confirmed = await openConfirmDialog({
      title: t("confirm.purgeVideoSingle.title"),
      description: t("confirm.purgeVideoSingle.desc"),
      confirmText: t("common.delete"),
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await purgeTrashVideo(id);
      await refreshTrash();
      notifySuccess(t("toast.videoPurged"));
    } catch (error) {
      notifyError(t("toast.purgeVideoFail"), error);
    }
  }

  return {
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
  };
}
