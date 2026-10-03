<script setup lang="ts">
import {
  ArrowDownAZ,
  Bot,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderPlus,
  GripVertical,
  LibraryBig,
  ListOrdered,
  Pencil,
  Play,
  Search,
  Sparkles,
  Trash2,
  Video,
} from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import type { Folder } from "../types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

type Locale = "zh-CN" | "en-US";

const props = withDefaults(
  defineProps<{
    folders: Folder[];
    activeFolder: Folder | null;
    activeFolderId: number | null;
    showPlaybackActions?: boolean;
    hasSelectedFolderAiRecord?: boolean;
    canOpenSelectedFolderAiBrowser?: boolean;
    aiRunningFolderId: number | null;
    showAiActions?: boolean;
    locale?: Locale;
  collectionLabel?: string;
  folderHeading?: string;
  folderItemCountLabel?: string;
  }>(),
  {
    locale: "zh-CN",
    showPlaybackActions: false,
    showAiActions: false,
    hasSelectedFolderAiRecord: false,
    canOpenSelectedFolderAiBrowser: false,
  }
);

const emit = defineEmits<{
  select: [number | null];
  create: [{ name: string; description?: string; groupName?: string | null }];
  update: [{ id: number; name?: string; description?: string | null; groupName?: string | null }];
  remove: [number];
  reorder: [number[]];
  startPlayback: [number];
  analyze: [number];
  clearAi: [number];
  openAiBrowser: [];
}>();

const folderName = ref("");
const folderDescription = ref("");
const folderGroupName = ref("");
const createDialogOpen = ref(false);
const searchKeyword = ref("");
const sortBy = ref<"manual" | "updatedAt" | "name" | "count">("manual");
const editingId = ref<number | null>(null);
const editingName = ref("");
const editingDescription = ref("");
const draggingFolderId = ref<number | null>(null);
const dragOverFolderId = ref<number | null>(null);
const collapsedGroups = ref<Set<string>>(new Set());

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
  | "editFolder"
  | "deleteFolder"
  | "noDescription"
  | "videosCount"
  | "newFolderTitle"
  | "name"
  | "description"
  | "namePlaceholder"
  | "descriptionPlaceholder"
  | "group"
  | "groupPlaceholder"
  | "expandGroup"
  | "collapseGroup"
  | "create"
  | "playbackTitle"
  | "playbackNoFolder"
  | "playbackTarget"
  | "playbackStart"
  | "aiTitle"
  | "aiNoFolder"
  | "aiTarget"
  | "aiAnalyze"
  | "aiAnalyzing"
  | "aiOpen"
  | "aiClear",
  Record<Locale, string>
> = {
  folders: { "zh-CN": "收藏夹", "en-US": "Folders" },
  searchPlaceholder: {
    "zh-CN": "搜索收藏夹名称或简介",
    "en-US": "Search folder name or description",
  },
  sortPlaceholder: { "zh-CN": "排序方式", "en-US": "Sort by" },
  sortManual: { "zh-CN": "手动排序（拖拽）", "en-US": "Manual (Drag)" },
  sortUpdatedAt: { "zh-CN": "最近更新", "en-US": "Recently Updated" },
  sortName: { "zh-CN": "按名称", "en-US": "By Name" },
  sortCount: { "zh-CN": "按视频数", "en-US": "By Video Count" },
  dragHint: {
    "zh-CN": "仅在“手动排序”且搜索为空时支持拖拽调整顺序。",
    "en-US": "Drag sorting works only in Manual mode with empty search.",
  },
  createFolder: { "zh-CN": "新建收藏夹", "en-US": "New Folder" },
  allVideos: { "zh-CN": "全部视频", "en-US": "All Videos" },
  folderName: { "zh-CN": "收藏夹名称", "en-US": "Folder Name" },
  folderDescription: { "zh-CN": "收藏夹简介", "en-US": "Folder Description" },
  cancel: { "zh-CN": "取消", "en-US": "Cancel" },
  save: { "zh-CN": "保存", "en-US": "Save" },
  editFolder: { "zh-CN": "编辑收藏夹", "en-US": "Edit folder" },
  deleteFolder: { "zh-CN": "删除收藏夹", "en-US": "Delete folder" },
  noDescription: { "zh-CN": "暂无简介", "en-US": "No description" },
  videosCount: { "zh-CN": "{count} 个视频", "en-US": "{count} videos" },
  newFolderTitle: { "zh-CN": "创建收藏夹", "en-US": "Create Folder" },
  name: { "zh-CN": "名称", "en-US": "Name" },
  description: { "zh-CN": "简介", "en-US": "Description" },
  namePlaceholder: { "zh-CN": "请输入收藏夹名称", "en-US": "Enter folder name" },
  descriptionPlaceholder: {
    "zh-CN": "可填写该收藏夹的用途说明",
    "en-US": "Describe this folder",
  },
  group: { "zh-CN": "分组", "en-US": "Group" },
  groupPlaceholder: { "zh-CN": "例如：学习、娱乐（可选）", "en-US": "e.g. Learning, Entertainment (optional)" },
  expandGroup: { "zh-CN": "展开分组", "en-US": "Expand group" },
  collapseGroup: { "zh-CN": "收起分组", "en-US": "Collapse group" },
  create: { "zh-CN": "创建", "en-US": "Create" },
  playbackTitle: { "zh-CN": "连续播放", "en-US": "Playback" },
  playbackNoFolder: {
    "zh-CN": "请先选择一个收藏夹再开始连续播放。",
    "en-US": "Select a folder first to start playback.",
  },
  playbackTarget: {
    "zh-CN": "当前收藏夹：{name}",
    "en-US": "Current folder: {name}",
  },
  playbackStart: { "zh-CN": "开始播放", "en-US": "Start Playback" },
  aiTitle: { "zh-CN": "AI 分类", "en-US": "AI Category" },
  aiNoFolder: {
    "zh-CN": "请先选择一个收藏夹再运行 AI 分类。",
    "en-US": "Select a folder first to run AI categorization.",
  },
  aiTarget: { "zh-CN": "当前收藏夹：{name}", "en-US": "Current folder: {name}" },
  aiAnalyze: { "zh-CN": "AI 分类", "en-US": "Run AI Category" },
  aiAnalyzing: { "zh-CN": "分类中...", "en-US": "Categorizing..." },
  aiOpen: { "zh-CN": "打开分类页", "en-US": "Open Category Page" },
  aiClear: { "zh-CN": "清除分类", "en-US": "Clear Categories" },
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
    return (
      folder.name.toLowerCase().includes(keyword) ||
      (folder.description ?? "").toLowerCase().includes(keyword)
    );
  });

  if (sortBy.value === "manual") return rows;

  rows = rows.slice().sort((a, b) => {
    if (sortBy.value === "name") return a.name.localeCompare(b.name, props.locale);
    if (sortBy.value === "count") return (b.itemCount ?? 0) - (a.itemCount ?? 0);
    return b.updatedAt - a.updatedAt;
  });

  return rows;
});

const displayedFolderGroups = computed(() => {
  const groups = new Map<string, Folder[]>();
  for (const folder of displayedFolders.value) {
    const key = folder.groupName?.trim() || "";
    const rows = groups.get(key) ?? [];
    rows.push(folder);
    groups.set(key, rows);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => {
      if (!left) return 1;
      if (!right) return -1;
      return left.localeCompare(right, props.locale);
    })
    .map(([name, folders]) => ({ name, folders }));
});

function groupLabel(name: string) {
  return name || (props.locale === "zh-CN" ? "未分组" : "Ungrouped");
}

function toggleGroup(name: string) {
  const next = new Set(collapsedGroups.value);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  collapsedGroups.value = next;
}

const canDragSort = computed(
  () => sortBy.value === "manual" && !searchKeyword.value.trim()
);
const folderNameLength = computed(() => folderName.value.trim().length);
const folderDescriptionLength = computed(() => folderDescription.value.length);
const canStartActiveFolderPlayback = computed(
  () => props.showPlaybackActions && hasActiveFolder.value
);
const hasAiTaskRunning = computed(() => props.aiRunningFolderId !== null);
const hasActiveFolder = computed(() => props.activeFolderId !== null);
const canAnalyzeActiveFolder = computed(
  () => props.showAiActions && hasActiveFolder.value && !hasAiTaskRunning.value
);
const canClearActiveFolderAi = computed(
  () =>
    props.showAiActions &&
    hasActiveFolder.value &&
    !hasAiTaskRunning.value &&
    props.hasSelectedFolderAiRecord
);
const canOpenActiveFolderAiBrowser = computed(
  () =>
    props.showAiActions &&
    hasActiveFolder.value &&
    !hasAiTaskRunning.value &&
    props.canOpenSelectedFolderAiBrowser
);
const activeFolderName = computed(
  () => props.activeFolder?.name || (props.locale === "zh-CN" ? "未选择" : "None")
);

watch(
  () => props.folders,
  () => {
    if (
      editingId.value !== null &&
      !props.folders.some((folder) => folder.id === editingId.value)
    ) {
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
    description: folderDescription.value.trim() || undefined,
    groupName: folderGroupName.value.trim() || null,
  });
  folderName.value = "";
  folderDescription.value = "";
  folderGroupName.value = "";
  createDialogOpen.value = false;
}

function startEdit(folder: Folder) {
  editingId.value = folder.id;
  editingName.value = folder.name;
  editingDescription.value = folder.description ?? "";
  folderGroupName.value = folder.groupName ?? "";
}

function cancelEdit() {
  editingId.value = null;
  editingName.value = "";
  editingDescription.value = "";
  folderGroupName.value = "";
}

function submitEdit() {
  if (!editingId.value) return;
  const name = editingName.value.trim();
  if (!name) return;
  emit("update", {
    id: editingId.value,
    name,
    description: editingDescription.value.trim() || null,
    groupName: folderGroupName.value.trim() || null,
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

function triggerPlayback() {
  if (props.activeFolderId === null) return;
  emit("startPlayback", props.activeFolderId);
}

function triggerAnalyze() {
  if (props.activeFolderId === null) return;
  emit("analyze", props.activeFolderId);
}

function triggerClear() {
  if (props.activeFolderId === null) return;
  emit("clearAi", props.activeFolderId);
}
</script>

<template>
  <aside class="panel-surface flex h-full min-h-0 flex-col p-4">
    <div class="mb-3 flex items-center gap-2">
      <span
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-primary"
      >
        <LibraryBig class="h-4 w-4" />
      </span>
      <h2 class="text-sm font-semibold tracking-wide">
        {{ props.folderHeading || t("folders") }}
      </h2>
    </div>

    <div class="space-y-2">
      <div class="relative">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="searchKeyword"
          :placeholder="t('searchPlaceholder')"
          class="h-9 pl-9"
        />
      </div>
      <Select :key="`folder-sort-${props.locale}`" v-model="sortBy">
        <SelectTrigger class="h-9 w-full">
          <SelectValue :placeholder="t('sortPlaceholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">
            <div class="flex items-center gap-2">
              <ListOrdered class="h-3.5 w-3.5" />
              {{ t("sortManual") }}
            </div>
          </SelectItem>
          <SelectItem value="updatedAt">
            <div class="flex items-center gap-2">
              <CalendarClock class="h-3.5 w-3.5" />
              {{ t("sortUpdatedAt") }}
            </div>
          </SelectItem>
          <SelectItem value="name">
            <div class="flex items-center gap-2">
              <ArrowDownAZ class="h-3.5 w-3.5" />
              {{ t("sortName") }}
            </div>
          </SelectItem>
          <SelectItem value="count">
            <div class="flex items-center gap-2">
              <Video class="h-3.5 w-3.5" />
              {{ t("sortCount") }}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="!canDragSort" class="text-[11px] text-muted-foreground">
        {{ t("dragHint") }}
      </p>
    </div>

    <section
      v-if="props.showPlaybackActions"
      class="mt-3 flex items-center gap-2 rounded-lg border border-border/80 bg-card/70 p-2"
    >
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <Play class="h-3.5 w-3.5" />
        <div class="min-w-0">
          <p class="text-xs font-semibold text-foreground">{{ t("playbackTitle") }}</p>
          <p class="truncate text-[11px] text-muted-foreground">
            {{
              hasActiveFolder
                ? t("playbackTarget", { name: activeFolderName })
                : t("playbackNoFolder")
            }}
          </p>
        </div>
      </div>
      <Button
        size="icon"
        class="h-8 w-8 shrink-0"
        :title="t('playbackStart')"
        :aria-label="t('playbackStart')"
        :disabled="!canStartActiveFolderPlayback"
        @click="triggerPlayback"
      >
        <Play class="h-3.5 w-3.5" />
      </Button>
    </section>

    <section
      v-if="props.showAiActions"
      class="mt-4 space-y-3 rounded-xl border border-border/80 bg-card/70 p-3"
    >
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Bot class="h-3.5 w-3.5" />
        <span>{{ t("aiTitle") }}</span>
      </div>

      <p v-if="hasActiveFolder" class="text-xs text-muted-foreground">
        {{ t("aiTarget", { name: activeFolderName }) }}
      </p>
      <p v-else class="text-xs text-muted-foreground">
        {{ t("aiNoFolder") }}
      </p>

      <div class="flex flex-wrap gap-2">
        <Button
          size="sm"
          class="gap-1"
          :disabled="!canAnalyzeActiveFolder"
          @click="triggerAnalyze"
        >
          <Sparkles class="h-3.5 w-3.5" />
          {{ hasAiTaskRunning ? t("aiAnalyzing") : t("aiAnalyze") }}
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="!canOpenActiveFolderAiBrowser"
          @click="emit('openAiBrowser')"
        >
          {{ t("aiOpen") }}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          :disabled="!canClearActiveFolderAi"
          @click="triggerClear"
        >
          {{ t("aiClear") }}
        </Button>
      </div>
    </section>

    <div class="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
      <div class="space-y-0.5">
        <button
          type="button"
          class="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent/55"
          @click="createDialogOpen = true"
        >
          <FolderPlus class="h-4 w-4 shrink-0 text-primary" />
          <span>{{ t("createFolder") }}</span>
        </button>

        <button
          type="button"
          class="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium transition-colors"
          :class="
            props.activeFolderId === null
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent/55'
          "
          @click="emit('select', null)"
        >
          <LibraryBig class="h-4 w-4 shrink-0" />
          <span class="truncate">{{ props.collectionLabel || t("allVideos") }}</span>
        </button>

        <div v-for="group in displayedFolderGroups" :key="group.name || 'ungrouped'" class="mb-3">
          <div class="flex items-center justify-between px-2 pb-1">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {{ groupLabel(group.name) }}
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              class="h-6 w-6"
              :aria-label="collapsedGroups.has(group.name) ? t('expandGroup') : t('collapseGroup')"
              :title="collapsedGroups.has(group.name) ? t('expandGroup') : t('collapseGroup')"
              @click="toggleGroup(group.name)"
            >
              <ChevronRight v-if="collapsedGroups.has(group.name)" class="h-3.5 w-3.5" />
              <ChevronDown v-else class="h-3.5 w-3.5" />
            </Button>
          </div>
          <template v-if="!collapsedGroups.has(group.name)">
          <div
            v-for="folder in group.folders"
            :key="folder.id"
            class="rounded-md"
            :draggable="canDragSort"
            @dragstart="handleDragStart(folder.id)"
            @dragover.prevent="handleDragOver(folder.id)"
            @drop.prevent="handleDrop(folder.id)"
            @dragend="handleDragEnd"
          >
          <template v-if="editingId === folder.id">
            <div class="space-y-2 rounded-md border border-primary/35 bg-primary/5 p-2">
              <Input v-model="editingName" :placeholder="t('folderName')" />
              <Textarea
                v-model="editingDescription"
                :rows="2"
                :placeholder="t('folderDescription')"
                class="text-xs"
              />
              <Input v-model="folderGroupName" :placeholder="t('groupPlaceholder')" />
              <div class="flex justify-end gap-2">
                <Button size="sm" variant="ghost" @click="cancelEdit">
                  {{ t("cancel") }}
                </Button>
                <Button size="sm" @click="submitEdit">{{ t("save") }}</Button>
              </div>
            </div>
          </template>

          <template v-else>
            <div
              class="group flex min-h-9 items-center gap-1 rounded-md px-1 transition-colors"
              :class="[
                props.activeFolderId === folder.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-accent/55',
                dragOverFolderId === folder.id ? 'ring-2 ring-primary/45' : '',
              ]"
            >
              <button
                type="button"
                class="flex h-9 min-w-0 flex-1 items-center gap-1.5 px-1 text-left"
                :title="folder.description || folder.name"
                @click="emit('select', folder.id)"
              >
                <GripVertical
                  v-if="canDragSort"
                  class="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground"
                />
                <FolderOpen class="h-4 w-4 shrink-0 text-muted-foreground" />
                <span class="truncate text-sm font-medium">{{ folder.name }}</span>
                <span
                  class="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground"
                  :title="
                    props.folderItemCountLabel
                      ? props.folderItemCountLabel.replace('{count}', String(folder.itemCount ?? 0))
                      : t('videosCount', { count: folder.itemCount ?? 0 })
                  "
                >
                  {{ folder.itemCount ?? 0 }}
                </span>
              </button>
              <Button
                size="icon"
                variant="ghost"
                class="h-7 w-7 shrink-0"
                :aria-label="t('editFolder')"
                :title="t('editFolder')"
                @click="startEdit(folder)"
              >
                <Pencil class="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                class="h-7 w-7 shrink-0 text-red-500"
                :aria-label="t('deleteFolder')"
                :title="t('deleteFolder')"
                @click="handleDelete(folder.id)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </template>
          </div>
          </template>
        </div>
      </div>
    </div>

    <Dialog v-model:open="createDialogOpen">
      <DialogContent class="max-w-lg border-border/80 p-0">
        <div class="rounded-lg bg-card p-6">
          <DialogHeader class="mb-5">
            <DialogTitle class="text-xl font-semibold">
              {{ t("newFolderTitle") }}
            </DialogTitle>
          </DialogHeader>

          <div class="space-y-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium">
                  {{ t("name") }} <span class="text-red-500">*</span>
                </span>
                <span class="text-xs text-muted-foreground">
                  {{ folderNameLength }}/20
                </span>
              </div>
              <Input
                v-model="folderName"
                maxlength="20"
                :placeholder="t('namePlaceholder')"
                @keyup.enter="handleCreate"
              />
            </div>

            <div class="space-y-2">
              <span class="text-sm font-medium">{{ t("group") }}</span>
              <Input v-model="folderGroupName" :placeholder="t('groupPlaceholder')" maxlength="40" />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium">{{ t("description") }}</span>
                <span class="text-xs text-muted-foreground">
                  {{ folderDescriptionLength }}/200
                </span>
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
              <Button variant="outline" @click="createDialogOpen = false">
                {{ t("cancel") }}
              </Button>
              <Button :disabled="folderNameLength === 0" @click="handleCreate">
                {{ t("create") }}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </aside>
</template>
