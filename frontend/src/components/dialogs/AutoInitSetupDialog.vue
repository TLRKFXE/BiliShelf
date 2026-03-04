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
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "toggle-folder": [remoteId: number, checked: boolean];
  reload: [];
  start: [];
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] max-w-3xl overflow-auto">
      <DialogHeader>
        <DialogTitle>{{ t("autoInit.dialogTitle") }}</DialogTitle>
        <DialogDescription>{{ t("autoInit.dialogDesc") }}</DialogDescription>
      </DialogHeader>

      <section class="panel-surface space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm text-muted-foreground">
            {{
              t("autoInit.folderCount", {
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
            {{ t("autoInit.reloadFolders") }}
          </Button>
        </div>

        <p class="text-xs text-amber-600 dark:text-amber-400 whitespace-pre-wrap">
          {{ t("autoInit.warning") }}
        </p>

        <div
          class="panel-surface-soft max-h-[360px] space-y-2 overflow-auto rounded-lg border p-3"
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
                  {{ t("autoInit.remoteVideoCount", { count: folder.mediaCount }) }}
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
            {{ t("autoInit.start") }}
          </Button>
        </div>
      </section>
    </DialogContent>
  </Dialog>
</template>
