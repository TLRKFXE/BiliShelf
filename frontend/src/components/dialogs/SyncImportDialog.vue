<script setup lang="ts">
import { computed } from "vue";
import {
  CirclePause,
  FolderSync,
  Gauge,
  Play,
  RefreshCcw,
  ShieldCheck,
  WandSparkles,
} from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SyncRemoteFolder } from "@/lib/api";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  fetchingFolders: boolean;
  folders: SyncRemoteFolder[];
  selectedFolderIds: number[];
  chunkSize: number;
  includeTagEnrichment: boolean;
  resumePage: number;
  tagEnrichmentStatus?: {
    paused: boolean;
    running: boolean;
    totalMissing: number;
    lastBatchProcessed: number;
    lastBatchBound: number;
    lastError: string | null;
  } | null;
  tagEnrichmentLoading: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "toggle-folder": [remoteId: number, checked: boolean];
  "update:chunk-size": [value: number];
  "update:include-tag-enrichment": [value: boolean];
  "refresh-tag-enrichment": [];
  "pause-tag-enrichment": [];
  "resume-tag-enrichment": [];
  "run-tag-enrichment": [];
  reload: [];
  submit: [];
}>();

const chunkSizeOptions = [10, 20, 30, 40, 60, 80];

const selectedVideoCount = computed(() =>
  props.folders
    .filter((folder) => props.selectedFolderIds.includes(folder.remoteId))
    .reduce((sum, folder) => sum + Math.max(0, Number(folder.mediaCount) || 0), 0)
);
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[88vh] max-w-3xl overflow-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <FolderSync class="h-4.5 w-4.5" />
          </span>
          {{ t("sync.dialogTitle") }}
        </DialogTitle>
        <DialogDescription>{{ t("sync.dialogDesc") }}</DialogDescription>
      </DialogHeader>

      <section class="panel-surface space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {{
                t("sync.folderCount", {
                  selected: selectedFolderIds.length,
                  total: folders.length,
                })
              }}
            </Badge>
            <Badge variant="outline">
              {{ t("common.videosCount", { count: selectedVideoCount }) }}
            </Badge>
            <Badge v-if="resumePage > 1" variant="outline">
              {{ t("sync.resumeHint", { page: resumePage }) }}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            :disabled="fetchingFolders || loading"
            @click="emit('reload')"
          >
            <RefreshCcw class="h-3.5 w-3.5" />
            {{ t("sync.reloadFolders") }}
          </Button>
        </div>

        <div class="space-y-1.5">
          <label class="space-y-1.5">
            <span class="flex items-center gap-1 text-xs text-muted-foreground">
              <Gauge class="h-3.5 w-3.5" />
              {{ t("sync.chunkSizeTitle") }}
            </span>
            <Select
              :model-value="String(chunkSize)"
              :disabled="loading"
              @update:model-value="emit('update:chunk-size', Number($event))"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="size in chunkSizeOptions"
                  :key="size"
                  :value="String(size)"
                >
                  {{ t("sync.chunkSizeOption", { count: size }) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>
          <p class="text-xs text-muted-foreground">{{ t("sync.autoChunkHint") }}</p>
          <p class="text-xs text-muted-foreground">{{ t("sync.tagEnrichDisabledHint") }}</p>
        </div>

        <div
          class="panel-surface-soft max-h-[300px] space-y-2 overflow-auto rounded-lg border p-3"
        >
          <div
            v-if="fetchingFolders"
            class="text-sm text-muted-foreground"
          >
            {{ t("sync.loadingFolders") }}
          </div>
          <div
            v-else-if="folders.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ t("sync.emptyFolders") }}
          </div>
          <label
            v-for="folder in folders"
            :key="folder.remoteId"
            class="panel-surface interactive-lift flex cursor-pointer items-center justify-between rounded-md border p-3"
          >
            <div class="flex min-w-0 items-start gap-2.5">
              <Checkbox
                :model-value="selectedFolderIds.includes(folder.remoteId)"
                :disabled="loading"
                class="mt-0.5"
                @update:model-value="
                  emit('toggle-folder', folder.remoteId, $event === true)
                "
              />
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ folder.title }}</p>
                <p class="text-xs text-muted-foreground">
                  {{
                    t("sync.remoteVideoCount", {
                      count: folder.mediaCount,
                    })
                  }}
                </p>
              </div>
            </div>
            <ShieldCheck
              class="h-4 w-4 shrink-0 text-muted-foreground"
              :class="selectedFolderIds.includes(folder.remoteId) ? 'text-primary' : ''"
            />
          </label>
        </div>

        <section class="rounded-lg border bg-muted/20 p-3">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-medium">{{ t("sync.tagEnrichTitle") }}</p>
            <Button
              size="sm"
              variant="outline"
              :disabled="tagEnrichmentLoading"
              @click="emit('refresh-tag-enrichment')"
            >
              <RefreshCcw class="h-3.5 w-3.5" />
              {{ t("sync.reloadTagEnrich") }}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            {{
              t("sync.tagEnrichStatus", {
                missing: tagEnrichmentStatus?.totalMissing ?? 0,
                processed: tagEnrichmentStatus?.lastBatchProcessed ?? 0,
                bound: tagEnrichmentStatus?.lastBatchBound ?? 0,
              })
            }}
          </p>
          <p
            v-if="tagEnrichmentStatus?.lastError"
            class="mt-1 text-xs text-amber-600 dark:text-amber-400"
          >
            {{ tagEnrichmentStatus.lastError }}
          </p>
          <div class="mt-3 flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              :disabled="tagEnrichmentLoading || (tagEnrichmentStatus?.paused ?? true)"
              @click="emit('pause-tag-enrichment')"
            >
              <CirclePause class="h-3.5 w-3.5" />
              {{ t("sync.pauseTagEnrich") }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="tagEnrichmentLoading || !(tagEnrichmentStatus?.paused ?? false)"
              @click="emit('resume-tag-enrichment')"
            >
              <Play class="h-3.5 w-3.5" />
              {{ t("sync.resumeTagEnrich") }}
            </Button>
            <Button
              size="sm"
              :disabled="tagEnrichmentLoading || (tagEnrichmentStatus?.paused ?? false)"
              @click="emit('run-tag-enrichment')"
            >
              <WandSparkles class="h-3.5 w-3.5" />
              {{ t("sync.runTagEnrichNow") }}
            </Button>
          </div>
        </section>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            :disabled="loading"
            @click="emit('update:open', false)"
          >
            {{ t("common.cancel") }}
          </Button>
          <Button
            :disabled="
              loading ||
              fetchingFolders ||
              selectedFolderIds.length === 0
            "
            @click="emit('submit')"
          >
            <FolderSync class="h-3.5 w-3.5" />
            {{ t("sync.startImport") }}
          </Button>
        </div>
      </section>
    </DialogContent>
  </Dialog>
</template>
