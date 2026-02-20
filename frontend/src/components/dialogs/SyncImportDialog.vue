<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "toggle-folder": [remoteId: number, checked: boolean];
  "update:chunk-size": [value: number];
  "update:include-tag-enrichment": [value: boolean];
  reload: [];
  submit: [];
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] max-w-3xl overflow-auto">
      <DialogHeader>
        <DialogTitle>{{ t("sync.dialogTitle") }}</DialogTitle>
        <DialogDescription>{{ t("sync.dialogDesc") }}</DialogDescription>
      </DialogHeader>

      <section class="panel-surface space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm text-muted-foreground">
            {{
              t("sync.folderCount", {
                selected: selectedFolderIds.length,
                total: folders.length,
              })
            }}
          </p>
          <Button
            size="sm"
            variant="outline"
            :disabled="fetchingFolders || loading"
            @click="emit('reload')"
          >
            {{ t("sync.reloadFolders") }}
          </Button>
        </div>

        <div class="space-y-2">
          <p class="text-xs text-muted-foreground">
            {{ t("sync.chunkSizeTitle") }}
          </p>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              :class="chunkSize === 10 ? 'border-primary text-primary' : ''"
              :disabled="loading"
              @click="emit('update:chunk-size', 10)"
            >
              {{ t("sync.chunkSizeOption", { count: 10 }) }}
            </Button>
            <Button
              variant="outline"
              :class="chunkSize === 20 ? 'border-primary text-primary' : ''"
              :disabled="loading"
              @click="emit('update:chunk-size', 20)"
            >
              {{ t("sync.chunkSizeOption", { count: 20 }) }}
            </Button>
            <Button
              variant="outline"
              :class="chunkSize === 30 ? 'border-primary text-primary' : ''"
              :disabled="loading"
              @click="emit('update:chunk-size', 30)"
            >
              {{ t("sync.chunkSizeOption", { count: 30 }) }}
            </Button>
          </div>
        </div>

        <p class="text-xs text-amber-600 dark:text-amber-400 whitespace-pre-wrap">
          {{ t("sync.autoChunkHint") }}
        </p>
        <label
          class="panel-surface-soft flex items-start gap-2 rounded-md border p-2.5 text-xs text-muted-foreground"
        >
          <Checkbox
            :model-value="includeTagEnrichment"
            :disabled="loading"
            class="mt-0.5"
            @update:model-value="emit('update:include-tag-enrichment', $event === true)"
          />
          <span>{{ t("sync.includeTagEnrichmentHint") }}</span>
        </label>
        <p
          v-if="selectedFolderIds.length === 1 && resumePage > 1"
          class="text-xs text-blue-600 dark:text-blue-400"
        >
          {{ t("sync.resumeHint", { page: resumePage }) }}
        </p>

        <div
          class="panel-surface-soft max-h-[320px] space-y-2 overflow-auto rounded-lg border p-3"
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
            class="panel-surface flex cursor-pointer items-center justify-between rounded-md border p-2.5"
          >
            <div class="flex min-w-0 items-start gap-2">
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
          </label>
        </div>

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
              selectedFolderIds.length !== 1
            "
            @click="emit('submit')"
          >
            {{ t("sync.startImport") }}
          </Button>
        </div>
      </section>
    </DialogContent>
  </Dialog>
</template>
