<script setup lang="ts">
import {
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  FolderArchive,
  ListChecks,
  Trash2,
  Video,
} from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Folder, Video as VideoItem } from "@/types";

const props = defineProps<{
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  trashFolders: Folder[];
  pagedTrashFolders: Folder[];
  trashVideos: VideoItem[];
  trashVideoTotal: number;
  selectedTrashFolderIds: number[];
  selectedTrashVideoIds: number[];
  trashFolderPage: number;
  trashFolderTotalPages: number;
  trashFolderPageSize: number;
  trashFolderPageSizeOptions: number[];
  trashVideoPage: number;
  trashVideoTotalPages: number;
  trashVideoPageSize: number;
  trashVideoPageSizeOptions: number[];
  isTrashFolderSelected: (id: number) => boolean;
  isTrashVideoSelected: (id: number) => boolean;
}>();

const emit = defineEmits<{
  selectAllTrashFolders: [];
  clearTrashFolderSelection: [];
  batchRestoreTrashFolders: [];
  batchPurgeTrashFolders: [];
  setTrashFolderSelection: [{ id: number; checked: boolean }];
  prevTrashFolderPage: [];
  nextTrashFolderPage: [];
  trashFolderPageSizeChange: [value: string];
  restoreFolderFromTrash: [id: number];
  purgeFolderFromTrash: [id: number];
  selectAllTrashVideos: [];
  clearTrashVideoSelection: [];
  batchRestoreTrashVideos: [];
  batchPurgeTrashVideos: [];
  setTrashVideoSelection: [{ id: number; checked: boolean }];
  prevTrashVideoPage: [];
  nextTrashVideoPage: [];
  trashVideoPageSizeChange: [value: string];
  restoreVideoFromTrash: [id: number];
  purgeVideoFromTrash: [id: number];
}>();
</script>

<template>
  <section class="space-y-5">
    <section class="panel-surface p-5">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2.5">
          <span
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary"
          >
            <FolderArchive class="h-4.5 w-4.5" />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold">{{ t("trash.foldersTitle") }}</p>
            <p class="text-xs text-muted-foreground">
              {{
                t("common.selected", { count: selectedTrashFolderIds.length })
              }}
            </p>
          </div>
          <Badge variant="secondary">{{ trashFolders.length }}</Badge>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="trashFolders.length === 0"
            @click="emit('selectAllTrashFolders')"
          >
            <ListChecks class="h-3.5 w-3.5" />
            {{ t("common.selectAll") }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="selectedTrashFolderIds.length === 0"
            @click="emit('clearTrashFolderSelection')"
          >
            {{ t("common.clear") }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="selectedTrashFolderIds.length === 0"
            @click="emit('batchRestoreTrashFolders')"
          >
            <ArchiveRestore class="h-3.5 w-3.5" />
            {{ t("trash.restoreSelected") }}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            :disabled="selectedTrashFolderIds.length === 0"
            @click="emit('batchPurgeTrashFolders')"
          >
            <Trash2 class="h-3.5 w-3.5" />
            {{ t("common.deleteSelected") }}
          </Button>
        </div>
      </div>

      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-muted-foreground">
          {{
            t("common.page", {
              page: trashFolderPage,
              totalPage: trashFolderTotalPages,
              total: trashFolders.length,
            })
          }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted-foreground">{{
            t("common.perPage")
          }}</span>
          <Select
            :model-value="String(trashFolderPageSize)"
            @update:model-value="
              emit('trashFolderPageSizeChange', String($event))
            "
          >
            <SelectTrigger class="h-8 w-[92px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="size in trashFolderPageSizeOptions"
                :key="size"
                :value="String(size)"
              >
                {{ size }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            :disabled="trashFolderPage <= 1"
            @click="emit('prevTrashFolderPage')"
          >
            <ChevronLeft class="h-3.5 w-3.5" />
            {{ t("common.prev") }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="trashFolderPage >= trashFolderTotalPages"
            @click="emit('nextTrashFolderPage')"
          >
            {{ t("common.next") }}
            <ChevronRight class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        v-if="trashFolders.length === 0"
        class="panel-surface-soft rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
      >
        {{ t("trash.emptyFolders") }}
      </div>

      <div v-else class="space-y-2.5">
        <div
          v-for="folder in pagedTrashFolders"
          :key="folder.id"
          class="panel-surface-soft flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/55 p-3.5"
        >
          <div class="flex min-w-0 items-start gap-2.5">
            <Checkbox
              :model-value="isTrashFolderSelected(folder.id)"
              class="mt-1"
              @update:model-value="
                emit('setTrashFolderSelection', {
                  id: folder.id,
                  checked: $event === true,
                })
              "
            />
            <div class="min-w-0">
              <p class="line-clamp-1 text-sm font-semibold">
                {{ folder.name }}
              </p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {{ t("common.videosCount", { count: folder.itemCount ?? 0 }) }}
              </p>
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              @click="emit('restoreFolderFromTrash', folder.id)"
            >
              <ArchiveRestore class="h-3.5 w-3.5" />
              {{ t("common.restore") }}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              @click="emit('purgeFolderFromTrash', folder.id)"
            >
              <Trash2 class="h-3.5 w-3.5" />
              {{ t("common.deleteForever") }}
            </Button>
          </div>
        </div>
      </div>
    </section>

    <section class="panel-surface p-5">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2.5">
          <span
            class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary"
          >
            <Video class="h-4.5 w-4.5" />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold">{{ t("trash.videosTitle") }}</p>
            <p class="text-xs text-muted-foreground">
              {{
                t("common.selected", { count: selectedTrashVideoIds.length })
              }}
            </p>
          </div>
          <Badge variant="secondary">{{ trashVideoTotal }}</Badge>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="trashVideos.length === 0"
            @click="emit('selectAllTrashVideos')"
          >
            <ListChecks class="h-3.5 w-3.5" />
            {{ t("common.selectAll") }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="selectedTrashVideoIds.length === 0"
            @click="emit('clearTrashVideoSelection')"
          >
            {{ t("common.clear") }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="selectedTrashVideoIds.length === 0"
            @click="emit('batchRestoreTrashVideos')"
          >
            <ArchiveRestore class="h-3.5 w-3.5" />
            {{ t("trash.restoreSelected") }}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            :disabled="selectedTrashVideoIds.length === 0"
            @click="emit('batchPurgeTrashVideos')"
          >
            <Trash2 class="h-3.5 w-3.5" />
            {{ t("common.deleteSelected") }}
          </Button>
        </div>
      </div>

      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-muted-foreground">
          {{
            t("common.page", {
              page: trashVideoPage,
              totalPage: trashVideoTotalPages,
              total: trashVideoTotal,
            })
          }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted-foreground">{{
            t("common.perPage")
          }}</span>
          <Select
            :model-value="String(trashVideoPageSize)"
            @update:model-value="
              emit('trashVideoPageSizeChange', String($event))
            "
          >
            <SelectTrigger class="h-8 w-[92px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="size in trashVideoPageSizeOptions"
                :key="size"
                :value="String(size)"
              >
                {{ size }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            :disabled="trashVideoPage <= 1 || loading"
            @click="emit('prevTrashVideoPage')"
          >
            <ChevronLeft class="h-3.5 w-3.5" />
            {{ t("common.prev") }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="trashVideoPage >= trashVideoTotalPages || loading"
            @click="emit('nextTrashVideoPage')"
          >
            {{ t("common.next") }}
            <ChevronRight class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div
        v-if="trashVideos.length === 0"
        class="panel-surface-soft rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
      >
        {{ t("trash.emptyVideos") }}
      </div>

      <div v-else class="space-y-2.5">
        <div
          v-for="video in trashVideos"
          :key="video.id"
          class="panel-surface-soft flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/55 p-3.5"
        >
          <div class="flex min-w-0 items-start gap-2.5">
            <Checkbox
              :model-value="isTrashVideoSelected(video.id)"
              class="mt-1"
              @update:model-value="
                emit('setTrashVideoSelection', {
                  id: video.id,
                  checked: $event === true,
                })
              "
            />
            <div class="min-w-0">
              <p class="line-clamp-1 text-sm font-semibold">
                {{ video.title }}
              </p>
              <p class="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {{ video.uploader }}
              </p>
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              @click="emit('restoreVideoFromTrash', video.id)"
            >
              <ArchiveRestore class="h-3.5 w-3.5" />
              {{ t("common.restore") }}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              @click="emit('purgeVideoFromTrash', video.id)"
            >
              <Trash2 class="h-3.5 w-3.5" />
              {{ t("common.deleteForever") }}
            </Button>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
