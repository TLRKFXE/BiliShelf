<script setup lang="ts">
import { FolderOpen, FolderPlus, GripVertical, LibraryBig, Pencil, Trash2 } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import type { Folder } from "../types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";

type Locale = "zh-CN" | "en-US";

const props = withDefaults(
  defineProps<{
    folders: Folder[];
    activeFolderId: number | null;
    locale?: Locale;
  }>(),
  {
    locale: "zh-CN"
  }
);

const emit = defineEmits<{
  select: [number | null];
  create: [{ name: string; description?: string }];
  update: [{ id: number; name?: string; description?: string | null }];
  remove: [number];
  reorder: [number[]];
}>();

const folderName = ref("");
const folderDescription = ref("");
const createDialogOpen = ref(false);
const searchKeyword = ref("");
const sortBy = ref<"manual" | "updatedAt" | "name" | "count">("manual");
const editingId = ref<number | null>(null);
const editingName = ref("");
const editingDescription = ref("");
const draggingFolderId = ref<number | null>(null);
const dragOverFolderId = ref<number | null>(null);
const SIDEBAR_TEXT: Record<
  | "folders"
  | "searchPlaceholder"
  | "sortPlaceholder"
  | "sortManual"
  | "sortUpdatedAt"
  | "sortName"
  | "sortCount"
  | "dragHint"
  | "createFolder"
  | "allVideos"
  | "folderName"
  | "folderDescription"
  | "cancel"
  | "save"
  | "noDescription"
  | "videosCount"
  | "newFolderTitle"
  | "name"
  | "description"
  | "namePlaceholder"
  | "descriptionPlaceholder"
  | "create",
  Record<Locale, string>
> = {
  folders: { "zh-CN": "收藏夹", "en-US": "Folders" },
  searchPlaceholder: {
    "zh-CN": "搜索收藏夹名称/简介",
    "en-US": "Search folder name/description"
  },
  sortPlaceholder: { "zh-CN": "收藏夹排序", "en-US": "Sort folders" },
  sortManual: { "zh-CN": "手动排序（拖拽）", "en-US": "Manual (Drag)" },
  sortUpdatedAt: { "zh-CN": "最近更新", "en-US": "Recently Updated" },
  sortName: { "zh-CN": "名称", "en-US": "Name" },
  sortCount: { "zh-CN": "视频数量", "en-US": "Video Count" },
  dragHint: {
    "zh-CN": "仅在手动模式且搜索为空时可拖拽排序。",
    "en-US": "Drag sorting is available only in Manual mode with empty search."
  },
  createFolder: { "zh-CN": "新建收藏夹", "en-US": "New Folder" },
  allVideos: { "zh-CN": "全部视频", "en-US": "All Videos" },
  folderName: { "zh-CN": "收藏夹名称", "en-US": "Folder name" },
  folderDescription: { "zh-CN": "收藏夹简介", "en-US": "Folder description" },
  cancel: { "zh-CN": "取消", "en-US": "Cancel" },
  save: { "zh-CN": "保存", "en-US": "Save" },
  noDescription: { "zh-CN": "暂无简介", "en-US": "No description" },
  videosCount: { "zh-CN": "{count} 个视频", "en-US": "{count} videos" },
  newFolderTitle: { "zh-CN": "新建收藏夹", "en-US": "Create Folder" },
  name: { "zh-CN": "名称", "en-US": "Name" },
  description: { "zh-CN": "简介", "en-US": "Description" },
  namePlaceholder: {
    "zh-CN": "快来给你的收藏夹命名吧",
    "en-US": "Name your folder"
  },
  descriptionPlaceholder: {
    "zh-CN": "可以简单描述下你的收藏夹",
    "en-US": "Describe this folder"
  },
  create: { "zh-CN": "创建", "en-US": "Create" }
};

function t(
  key: keyof typeof SIDEBAR_TEXT,
  vars: Record<string, string | number> = {}
) {
  const template = SIDEBAR_TEXT[key][props.locale];
  return template.replace(/\{(\w+)\}/g, (_, token: string) =>
    String(vars[token] ?? "")
  );
}

const displayedFolders = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase();
  let rows = props.folders.filter((folder) => {
    if (!keyword) return true;
    return folder.name.toLowerCase().includes(keyword) || (folder.description ?? "").toLowerCase().includes(keyword);
  });

  if (sortBy.value === "manual") return rows;

  rows = rows.slice().sort((a, b) => {
    if (sortBy.value === "name") return a.name.localeCompare(b.name, props.locale);
    if (sortBy.value === "count") return (b.itemCount ?? 0) - (a.itemCount ?? 0);
    return b.updatedAt - a.updatedAt;
  });

  return rows;
});

const canDragSort = computed(() => sortBy.value === "manual" && !searchKeyword.value.trim());
const folderNameLength = computed(() => folderName.value.trim().length);
const folderDescriptionLength = computed(() => folderDescription.value.length);

watch(
  () => props.folders,
  () => {
    if (editingId.value !== null && !props.folders.some((folder) => folder.id === editingId.value)) {
      editingId.value = null;
      editingName.value = "";
      editingDescription.value = "";
    }
  }
);

function handleCreate() {
  const name = folderName.value.trim();
  if (!name) return;
  emit("create", {
    name,
    description: folderDescription.value.trim() || undefined
  });
  folderName.value = "";
  folderDescription.value = "";
  createDialogOpen.value = false;
}

function startEdit(folder: Folder) {
  editingId.value = folder.id;
  editingName.value = folder.name;
  editingDescription.value = folder.description ?? "";
}

function cancelEdit() {
  editingId.value = null;
  editingName.value = "";
  editingDescription.value = "";
}

function submitEdit() {
  if (!editingId.value) return;
  const name = editingName.value.trim();
  if (!name) return;
  emit("update", {
    id: editingId.value,
    name,
    description: editingDescription.value.trim() || null
  });
  cancelEdit();
}

function handleDelete(id: number) {
  emit("remove", id);
}

function handleDragStart(folderId: number) {
  draggingFolderId.value = folderId;
}

function handleDragOver(folderId: number) {
  dragOverFolderId.value = folderId;
}

function handleDrop(targetFolderId: number) {
  if (!canDragSort.value) return;

  const sourceFolderId = draggingFolderId.value;
  draggingFolderId.value = null;
  dragOverFolderId.value = null;
  if (!sourceFolderId || sourceFolderId === targetFolderId) return;

  const currentIds = displayedFolders.value.map((folder) => folder.id);
  const sourceIndex = currentIds.indexOf(sourceFolderId);
  const targetIndex = currentIds.indexOf(targetFolderId);
  if (sourceIndex < 0 || targetIndex < 0) return;

  const reordered = currentIds.slice();
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  emit("reorder", reordered);
}

function handleDragEnd() {
  draggingFolderId.value = null;
  dragOverFolderId.value = null;
}
</script>

<template>
  <aside class="panel-surface h-full p-5">
    <div class="mb-5 flex items-center gap-2">
      <LibraryBig class="h-4 w-4 text-primary" />
      <h2 class="text-sm font-semibold">{{ t("folders") }}</h2>
    </div>

    <div class="space-y-2">
      <Input v-model="searchKeyword" :placeholder="t('searchPlaceholder')" />
      <Select :key="`folder-sort-${props.locale}`" v-model="sortBy">
        <SelectTrigger class="w-full">
          <SelectValue :placeholder="t('sortPlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">{{ t("sortManual") }}</SelectItem>
          <SelectItem value="updatedAt">{{ t("sortUpdatedAt") }}</SelectItem>
          <SelectItem value="name">{{ t("sortName") }}</SelectItem>
          <SelectItem value="count">{{ t("sortCount") }}</SelectItem>
        </SelectContent>
      </Select>
      <p v-if="!canDragSort" class="text-[11px] text-muted-foreground">
        {{ t("dragHint") }}
      </p>
    </div>

    <div class="mt-4 space-y-2.5">
      <button
        type="button"
        class="interactive-lift flex w-full items-center gap-2 rounded-md border border-transparent px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-accent"
        @click="createDialogOpen = true"
      >
        <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-primary">
          <FolderPlus class="h-3.5 w-3.5" />
        </span>
        <span>{{ t("createFolder") }}</span>
      </button>

      <button
        type="button"
        class="interactive-lift w-full rounded-md border px-3 py-2.5 text-left text-sm transition"
        :class="props.activeFolderId === null ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'"
        @click="emit('select', null)"
      >
        {{ t("allVideos") }}
      </button>

      <div
        v-for="folder in displayedFolders"
        :key="folder.id"
        class="interactive-lift rounded-lg border p-2.5"
        :class="[
          props.activeFolderId === folder.id ? 'border-primary/40 bg-primary/5' : 'border-border bg-background',
          dragOverFolderId === folder.id ? 'ring-2 ring-primary/40' : ''
        ]"
        :draggable="canDragSort"
        @dragstart="handleDragStart(folder.id)"
        @dragover.prevent="handleDragOver(folder.id)"
        @drop.prevent="handleDrop(folder.id)"
        @dragend="handleDragEnd"
      >
        <template v-if="editingId === folder.id">
          <div class="space-y-2">
            <Input v-model="editingName" :placeholder="t('folderName')" />
            <Textarea v-model="editingDescription" :rows="2" :placeholder="t('folderDescription')" class="text-xs" />
            <div class="flex justify-end gap-2">
              <Button size="sm" variant="ghost" @click="cancelEdit">{{ t("cancel") }}</Button>
              <Button size="sm" @click="submitEdit">{{ t("save") }}</Button>
            </div>
          </div>
        </template>

        <template v-else>
          <button type="button" class="w-full text-left" @click="emit('select', folder.id)">
            <div class="flex items-start justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <FolderOpen class="h-4 w-4 shrink-0 text-muted-foreground" />
                <p class="line-clamp-1 text-sm font-medium">{{ folder.name }}</p>
              </div>
              <GripVertical v-if="canDragSort" class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ folder.description || t("noDescription") }}</p>
            <p class="mt-1 text-[11px] text-muted-foreground">{{ t("videosCount", { count: folder.itemCount ?? 0 }) }}</p>
          </button>
          <div class="mt-2 flex justify-end gap-1">
            <Button size="icon" variant="ghost" class="h-8 w-8" @click="startEdit(folder)">
              <Pencil class="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" class="h-8 w-8 text-red-500" @click="handleDelete(folder.id)">
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        </template>
      </div>
    </div>

    <Dialog v-model:open="createDialogOpen">
      <DialogContent class="max-w-lg border-border/80 p-0">
        <div class="rounded-lg bg-card p-6">
          <DialogHeader class="mb-5">
            <DialogTitle class="text-xl font-semibold">{{ t("newFolderTitle") }}</DialogTitle>
          </DialogHeader>

          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium">{{ t("name") }} <span class="text-red-500">*</span></span>
                <span class="text-xs text-muted-foreground">{{ folderNameLength }}/20</span>
              </div>
              <Input
                v-model="folderName"
                maxlength="20"
                :placeholder="t('namePlaceholder')"
                @keyup.enter="handleCreate"
              />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium">{{ t("description") }}</span>
                <span class="text-xs text-muted-foreground">{{ folderDescriptionLength }}/200</span>
              </div>
              <Textarea
                v-model="folderDescription"
                :rows="5"
                maxlength="200"
                :placeholder="t('descriptionPlaceholder')"
                class="resize-none"
              />
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" @click="createDialogOpen = false">{{ t("cancel") }}</Button>
              <Button :disabled="folderNameLength === 0" @click="handleCreate">{{ t("create") }}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </aside>
</template>
