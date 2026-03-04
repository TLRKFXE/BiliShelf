<script setup lang="ts">
import { computed } from "vue";
import { FolderSync, RefreshCcw, ShieldAlert, Sparkles } from "lucide-vue-next";
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

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  fetchingFolders: boolean;
  folders: SyncRemoteFolder[];
  selectedFolderIds: number[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "toggle-folder": [remoteId: number, checked: boolean];
  reload: [];
  start: [];
}>();

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
          {{ t("autoInit.dialogTitle") }}
        </DialogTitle>
        <DialogDescription>{{ t("autoInit.dialogDesc") }}</DialogDescription>
      </DialogHeader>

      <section class="panel-surface space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {{
                t("autoInit.folderCount", {
                  selected: selectedFolderIds.length,
                  total: folders.length,
                })
              }}
            </Badge>
            <Badge variant="outline">
              {{ t("common.videosCount", { count: selectedVideoCount }) }}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            :disabled="fetchingFolders || loading"
            @click="emit('reload')"
          >
            <RefreshCcw class="h-3.5 w-3.5" />
            {{ t("autoInit.reloadFolders") }}
          </Button>
        </div>

        <div class="rounded-lg border border-amber-300/45 bg-amber-50/65 p-3 text-xs text-amber-700 dark:border-amber-500/35 dark:bg-amber-950/25 dark:text-amber-200">
          <p class="flex items-start gap-2">
            <ShieldAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{{ t("autoInit.warning") }}</span>
          </p>
        </div>

        <div
          class="panel-surface-soft max-h-[380px] space-y-2 overflow-auto rounded-lg border p-3"
        >
          <div v-if="fetchingFolders" class="text-sm text-muted-foreground">
            {{ t("autoInit.loadingFolders") }}
          </div>
          <div v-else-if="folders.length === 0" class="text-sm text-muted-foreground">
            {{ t("autoInit.emptyFolders") }}
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
                  {{ t("autoInit.remoteVideoCount", { count: folder.mediaCount }) }}
                </p>
              </div>
            </div>

            <Sparkles
              class="h-4 w-4 shrink-0 text-muted-foreground"
              :class="selectedFolderIds.includes(folder.remoteId) ? 'text-primary' : ''"
            />
          </label>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            :disabled="loading"
            @click="emit('update:open', false)"
          >
            {{ t("autoInit.later") }}
          </Button>
          <Button
            :disabled="
              loading ||
              fetchingFolders ||
              selectedFolderIds.length === 0
            "
            @click="emit('start')"
          >
            <FolderSync class="h-3.5 w-3.5" />
            {{ t("autoInit.start") }}
          </Button>
        </div>
      </section>
    </DialogContent>
  </Dialog>
</template>
