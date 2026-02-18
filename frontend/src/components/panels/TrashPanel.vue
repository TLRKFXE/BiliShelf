<script setup lang="ts">
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
import type { Folder, Video } from "@/types";

const props = defineProps<{
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  trashFolders: Folder[];
  pagedTrashFolders: Folder[];
  trashVideos: Video[];
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
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold">{{ t("trash.foldersTitle") }}</h3>
          <Badge variant="secondary">{{ trashFolders.length }}</Badge>
          <span class="text-xs text-muted-foreground"
            >{{ t("common.selected", { count: selectedTrashFolderIds.length }) }}</span
          >
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="trashFolders.length === 0"
            @click="emit('selectAllTrashFolders')"
            >{{ t("common.selectAll") }}</Button
          >
          <Button
            size="sm"
            variant="outline"
            :disabled="selectedTrashFolderIds.length === 0"
            @click="emit('clearTrashFolderSelection')"
            >{{ t("common.clear") }}</Button
          >
          <Button
            size="sm"
            variant="outline"
            :disabled="selectedTrashFolderIds.length === 0"
            @click="emit('batchRestoreTrashFolders')"
            >{{ t("trash.restoreSelected") }}</Button
          >
          <Button
            size="sm"
            variant="destructive"
            :disabled="selectedTrashFolderIds.length === 0"
            @click="emit('batchPurgeTrashFolders')"
            >{{ t("common.deleteSelected") }}</Button
          >
        </div>
      </div>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-muted-foreground">
          {{ t("common.page", { page: trashFolderPage, totalPage: trashFolderTotalPages, total: trashFolders.length }) }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted-foreground">{{ t("common.perPage") }}</span>
          <Select
            :model-value="String(trashFolderPageSize)"
            @update:model-value="emit('trashFolderPageSizeChange', String($event))"
          >
            <SelectTrigger class="h-8 w-[88px]">
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
            {{ t("common.prev") }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="trashFolderPage >= trashFolderTotalPages"
            @click="emit('nextTrashFolderPage')"
          >
            {{ t("common.next") }}
          </Button>
        </div>
      </div>

      <div
        v-if="trashFolders.length === 0"
        class="panel-surface-soft rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
      >
        {{ t("trash.emptyFolders") }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="folder in pagedTrashFolders"
          :key="folder.id"
          class="panel-surface-soft flex items-center justify-between rounded-lg border bg-background/50 p-3.5"
        >
          <div class="flex items-start gap-2">
            <Checkbox
              :model-value="isTrashFolderSelected(folder.id)"
              class="mt-1"
              @update:model-value="
                emit('setTrashFolderSelection', { id: folder.id, checked: $event === true })
              "
            />
            <div>
              <p class="text-sm font-medium">{{ folder.name }}</p>
              <p class="text-xs text-muted-foreground">
                {{ t("common.videosCount", { count: folder.itemCount ?? 0 }) }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              @click="emit('restoreFolderFromTrash', folder.id)"
              >{{ t("common.restore") }}</Button
            >
            <Button
              size="sm"
              variant="destructive"
              @click="emit('purgeFolderFromTrash', folder.id)"
              >{{ t("common.deleteForever") }}</Button
            >
          </div>
        </div>
      </div>
    </section>

    <section class="panel-surface p-5">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold">{{ t("trash.videosTitle") }}</h3>
          <Badge variant="secondary">{{ trashVideoTotal }}</Badge>
          <span class="text-xs text-muted-foreground"
            >{{ t("common.selected", { count: selectedTrashVideoIds.length }) }}</span
          >
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="trashVideos.length === 0"
            @click="emit('selectAllTrashVideos')"
            >{{ t("common.selectAll") }}</Button
          >
          <Button
            size="sm"
            variant="outline"
            :disabled="selectedTrashVideoIds.length === 0"
            @click="emit('clearTrashVideoSelection')"
            >{{ t("common.clear") }}</Button
          >
          <Button
            size="sm"
            variant="outline"
            :disabled="selectedTrashVideoIds.length === 0"
            @click="emit('batchRestoreTrashVideos')"
            >{{ t("trash.restoreSelected") }}</Button
          >
          <Button
            size="sm"
            variant="destructive"
            :disabled="selectedTrashVideoIds.length === 0"
            @click="emit('batchPurgeTrashVideos')"
            >{{ t("common.deleteSelected") }}</Button
          >
        </div>
      </div>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-muted-foreground">
          {{ t("common.page", { page: trashVideoPage, totalPage: trashVideoTotalPages, total: trashVideoTotal }) }}
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted-foreground">{{ t("common.perPage") }}</span>
          <Select
            :model-value="String(trashVideoPageSize)"
            @update:model-value="emit('trashVideoPageSizeChange', String($event))"
          >
            <SelectTrigger class="h-8 w-[88px]">
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
            {{ t("common.prev") }}
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="trashVideoPage >= trashVideoTotalPages || loading"
            @click="emit('nextTrashVideoPage')"
          >
            {{ t("common.next") }}
          </Button>
        </div>
      </div>

      <div
        v-if="trashVideos.length === 0"
        class="panel-surface-soft rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
      >
        {{ t("trash.emptyVideos") }}
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="video in trashVideos"
          :key="video.id"
          class="panel-surface-soft flex items-center justify-between rounded-lg border bg-background/50 p-3.5"
        >
          <div class="flex items-start gap-2">
            <Checkbox
              :model-value="isTrashVideoSelected(video.id)"
              class="mt-1"
              @update:model-value="
                emit('setTrashVideoSelection', { id: video.id, checked: $event === true })
              "
            />
            <div>
              <p class="line-clamp-1 text-sm font-medium">
                {{ video.title }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ video.uploader }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              @click="emit('restoreVideoFromTrash', video.id)"
              >{{ t("common.restore") }}</Button
            >
            <Button
              size="sm"
              variant="destructive"
              @click="emit('purgeVideoFromTrash', video.id)"
              >{{ t("common.deleteForever") }}</Button
            >
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
