<script setup lang="ts">
import { ref } from "vue";
import FolderSidebar from "@/components/FolderSidebar.vue";
import MobileManagerBar from "@/components/layout/MobileManagerBar.vue";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Folder } from "@/types";

type Locale = "zh-CN" | "en-US";

const props = defineProps<{
  t: (key: string, vars?: Record<string, string | number>) => string;
  folders: Folder[];
  activeFolder: Folder | null;
  activeFolderId: number | null;
  resultCount: number;
  collectionLabel?: string;
  folderHeading?: string;
  folderItemCountLabel?: string;
  showPlaybackActions: boolean;
  hasSelectedFolderAiRecord: boolean;
  canOpenSelectedFolderAiBrowser: boolean;
  aiRunningFolderId: number | null;
  showAiActions: boolean;
  locale: Locale;
}>();

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

const drawerOpen = ref(false);

function handleMobileSelect(folderId: number | null) {
  emit("select", folderId);
  drawerOpen.value = false;
}
</script>

<template>
  <div class="sticky top-2 z-40 min-h-0 lg:static lg:h-full lg:overflow-hidden lg:z-auto">
    <div class="hidden min-h-0 lg:block lg:h-full lg:overflow-hidden">
      <FolderSidebar
        :folders="props.folders"
        :active-folder="props.activeFolder"
        :active-folder-id="props.activeFolderId"
        :show-playback-actions="props.showPlaybackActions"
        :has-selected-folder-ai-record="props.hasSelectedFolderAiRecord"
        :can-open-selected-folder-ai-browser="props.canOpenSelectedFolderAiBrowser"
        :ai-running-folder-id="props.aiRunningFolderId"
        :show-ai-actions="props.showAiActions"
        :locale="props.locale"
        :collection-label="props.collectionLabel"
        :folder-heading="props.folderHeading"
        :folder-item-count-label="props.folderItemCountLabel"
        @select="emit('select', $event)"
        @create="emit('create', $event)"
        @update="emit('update', $event)"
        @remove="emit('remove', $event)"
        @reorder="emit('reorder', $event)"
        @start-playback="emit('startPlayback', $event)"
        @analyze="emit('analyze', $event)"
        @clear-ai="emit('clearAi', $event)"
        @open-ai-browser="emit('openAiBrowser')"
      />
    </div>

    <div class="lg:hidden">
      <MobileManagerBar
        :t="props.t"
        :active-folder-name="props.activeFolder?.name ?? null"
        :result-count="props.resultCount"
        :collection-label="props.collectionLabel"
        @open="drawerOpen = true"
      />
    </div>

    <Dialog :open="drawerOpen" @update:open="drawerOpen = $event">
      <DialogContent
        class="left-0 top-0 h-[100dvh] w-[min(92vw,390px)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-y-0 border-l-0 p-0 sm:rounded-none"
      >
        <DialogHeader class="sr-only">
          <DialogTitle>{{ props.t("mobile.folderDrawerTitle") }}</DialogTitle>
          <DialogDescription>{{
            props.t("mobile.folderDrawerDescription")
          }}</DialogDescription>
        </DialogHeader>
        <FolderSidebar
          :folders="props.folders"
          :active-folder="props.activeFolder"
          :active-folder-id="props.activeFolderId"
          :show-playback-actions="props.showPlaybackActions"
          :has-selected-folder-ai-record="props.hasSelectedFolderAiRecord"
          :can-open-selected-folder-ai-browser="props.canOpenSelectedFolderAiBrowser"
          :ai-running-folder-id="props.aiRunningFolderId"
          :show-ai-actions="props.showAiActions"
          :locale="props.locale"
          :collection-label="props.collectionLabel"
          :folder-heading="props.folderHeading"
          :folder-item-count-label="props.folderItemCountLabel"
          @select="handleMobileSelect"
          @create="emit('create', $event)"
          @update="emit('update', $event)"
          @remove="emit('remove', $event)"
          @reorder="emit('reorder', $event)"
          @start-playback="emit('startPlayback', $event)"
          @analyze="emit('analyze', $event)"
          @clear-ai="emit('clearAi', $event)"
          @open-ai-browser="emit('openAiBrowser')"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
