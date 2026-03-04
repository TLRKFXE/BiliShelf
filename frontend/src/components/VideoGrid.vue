<script setup lang="ts">
import { Check, FileText, Trash2 } from "lucide-vue-next";
import { ref } from "vue";
import type { Video } from "../types";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import VideoCard from "./VideoCard.vue";

type QuickAction = "detail" | "delete";
type Locale = "zh-CN" | "en-US";

const props = withDefaults(
  defineProps<{
    videos: Video[];
    loading?: boolean;
    selectedIds: number[];
    batchMode?: boolean;
    locale?: Locale;
  }>(),
  {
    locale: "zh-CN"
  }
);

const emit = defineEmits<{
  setSelection: [{ id: number; checked: boolean }];
  detail: [number];
  quickAction: [{ id: number; action: QuickAction }];
  selectAll: [];
  clearSelection: [];
}>();

const hoveredVideoId = ref<number | null>(null);

function toggleSelection(id: number) {
  emit("setSelection", { id, checked: !props.selectedIds.includes(id) });
}

function fireQuickAction(id: number, action: QuickAction) {
  emit("quickAction", { id, action });
}

function handleDetailClick(event: MouseEvent, id: number) {
  event.preventDefault();
  event.stopPropagation();
  emit("detail", id);
}

function handleDeleteClick(event: MouseEvent, id: number) {
  event.preventDefault();
  event.stopPropagation();
  fireQuickAction(id, "delete");
}

function isSelected(id: number) {
  return props.selectedIds.includes(id);
}

function handleCardPointerEnter(id: number) {
  hoveredVideoId.value = id;
}

function handleCardPointerLeave(id: number) {
  if (hoveredVideoId.value === id) {
    hoveredVideoId.value = null;
  }
}

function canShowCardActions(id: number) {
  return props.batchMode || isSelected(id) || hoveredVideoId.value === id;
}

const GRID_TEXT: Record<"empty", Record<Locale, string>> = {
  empty: {
    "zh-CN": "未找到匹配结果，请尝试调整关键词或筛选条件。",
    "en-US": "No results found. Try another keyword or filter."
  }
};

function t(key: keyof typeof GRID_TEXT) {
  return GRID_TEXT[key][props.locale];
}
</script>

<template>
  <section>
    <div v-if="loading" class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <Card v-for="index in 6" :key="index" class="overflow-hidden p-0">
        <Skeleton class="aspect-video w-full rounded-none" />
        <div class="space-y-2 p-4">
          <Skeleton class="h-4 w-[75%]" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-[55%]" />
        </div>
      </Card>
    </div>

    <Card v-else-if="videos.length === 0" class="border-dashed p-10 text-center text-sm text-muted-foreground">
      {{ t("empty") }}
    </Card>

    <div v-else class="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="video in videos"
        :key="video.id"
        class="group relative h-full rounded-xl shadow-[0_12px_30px_-18px_hsl(var(--surface-shadow)/0.6)] transition-[transform,box-shadow] duration-200 hover:-translate-y-[2px] hover:shadow-[0_24px_46px_-24px_hsl(var(--surface-shadow)/0.65)]"
        @pointerenter="handleCardPointerEnter(video.id)"
        @pointerleave="handleCardPointerLeave(video.id)"
      >
        <button
          v-if="props.batchMode"
          type="button"
          class="absolute inset-0 z-10 cursor-pointer rounded-xl bg-transparent"
          @click="toggleSelection(video.id)"
        />
        <div
          v-if="isSelected(video.id)"
          class="pointer-events-none absolute inset-0 z-[5] rounded-xl bg-primary/15"
        />

        <div
          class="absolute left-3 top-3 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border/85 bg-background/[0.96] text-foreground shadow-sm backdrop-blur-[1px] transition-all"
          :class="[
            isSelected(video.id)
              ? 'border-primary bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.9)]'
              : '',
            canShowCardActions(video.id)
              ? 'visible opacity-100 pointer-events-auto'
              : 'invisible opacity-0 pointer-events-none'
          ]"
          @pointerdown.stop
          @mousedown.stop
          @click.stop="toggleSelection(video.id)"
        >
          <Check class="h-4 w-4" :class="isSelected(video.id) ? 'opacity-100' : 'opacity-0'" />
        </div>

        <div
          class="absolute right-3 top-3 z-30 flex gap-1 rounded-xl border border-border/85 bg-background/[0.98] p-1.5 shadow-md backdrop-blur-[1px] transition-all duration-200"
          :class="
            canShowCardActions(video.id)
              ? 'visible opacity-100 pointer-events-auto'
              : 'invisible opacity-0 pointer-events-none'
          "
          @pointerdown.stop
          @mousedown.stop
        >
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/90 bg-background text-foreground transition-colors hover:bg-accent/75 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            @pointerdown.stop
            @mousedown.stop
            @click="handleDetailClick($event, video.id)"
          >
            <FileText class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/65 bg-red-500 text-white transition-colors hover:bg-red-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            @pointerdown.stop
            @mousedown.stop
            @click="handleDeleteClick($event, video.id)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>

        <VideoCard :video="video" :locale="props.locale" />
      </div>
    </div>
  </section>
</template>
