<script setup lang="ts">
import { computed } from "vue";
import {
  CirclePause,
  FolderSync,
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
import type { SyncRemoteFolder } from "@/lib/api";
import { estimateSelectedVideoCount } from "@/lib/sync-folder-selection.js";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  fetchingFolders: boolean;
  folders: SyncRemoteFolder[];
  selectedFolderIds: number[];
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
  "refresh-tag-enrichment": [];
  "pause-tag-enrichment": [];
  "resume-tag-enrichment": [];
  "run-tag-enrichment": [];
  "select-all": [];
  "clear-selection": [];
  reload: [];
  submit: [];
}>();

const selectedVideoCount = computed(() =>
  estimateSelectedVideoCount(props.selectedFolderIds, props.folders)
);

const allFoldersSelected = computed(
  () =>
    props.folders.length > 0 &&
    props.folders.every((folder) =>
      props.selectedFolderIds.includes(folder.remoteId)
    )
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

        <div class="space-y-2 rounded-lg border bg-muted/20 p-3">
          <div class="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              :disabled="
                loading ||
                fetchingFolders ||
                folders.length === 0 ||
                allFoldersSelected
              "
              @click="emit('select-all')"
            >
              {{ t("common.selectAll") }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="loading || selectedFolderIds.length === 0"
              @click="emit('clear-selection')"
            >
              {{ t("common.clear") }}
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">{{ t("sync.queueHint") }}</p>
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
