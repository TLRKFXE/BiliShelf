<script setup lang="ts">
import { Check, FileText, Trash2 } from "lucide-vue-next";
import { reactive } from "vue";
import type { Video } from "../types";
import { Button } from "./ui/button";
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

function toggleSelection(id: number) {
  emit("setSelection", { id, checked: !props.selectedIds.includes(id) });
}

function fireQuickAction(id: number, action: QuickAction) {
  emit("quickAction", { id, action });
}

function isSelected(id: number) {
  return props.selectedIds.includes(id);
}

const cardTransforms = reactive<Record<number, string>>({});
const GRID_TEXT: Record<"empty", Record<Locale, string>> = {
  empty: {
    "zh-CN": "暂无匹配结果，试试换个关键词。",
    "en-US": "No result. Try another keyword."
  }
};

function t(key: keyof typeof GRID_TEXT) {
  return GRID_TEXT[key][props.locale];
}

function handleCardMouseEnter(id: number) {
  cardTransforms[id] =
    "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(-4px) scale(1.006)";
}

function handleCardMouseMove(event: MouseEvent, id: number) {
  const element = event.currentTarget as HTMLElement | null;
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const rotateY = (x - 0.5) * 14;
  const rotateX = (0.5 - y) * 12;
  cardTransforms[id] =
    `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px) scale(1.012)`;
}

function handleCardMouseLeave(id: number) {
  cardTransforms[id] =
    "perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)";
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
        class="group relative h-full transform-gpu rounded-xl shadow-[0_10px_26px_-18px_hsl(var(--foreground)/0.55)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_22px_46px_-24px_hsl(var(--foreground)/0.6)] will-change-transform [transform-style:preserve-3d]"
        :style="{ transform: cardTransforms[video.id] || 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)' }"
        @mouseenter="handleCardMouseEnter(video.id)"
        @mousemove="handleCardMouseMove($event, video.id)"
        @mouseleave="handleCardMouseLeave(video.id)"
      >
        <button
          v-if="props.batchMode"
          type="button"
          class="absolute inset-0 z-10 cursor-pointer rounded-xl bg-transparent"
          @click="toggleSelection(video.id)"
        />
        <div
          v-if="isSelected(video.id)"
          class="pointer-events-none absolute inset-0 z-[5] rounded-xl bg-black/15"
        />

        <div
          class="absolute left-3 top-3 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border shadow-sm backdrop-blur"
          :class="
            [
              isSelected(video.id)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-white/70 bg-black/45 text-white hover:bg-black/60',
              props.batchMode || isSelected(video.id)
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
            ]
          "
          @click.stop="toggleSelection(video.id)"
        >
          <Check class="h-4 w-4" :class="isSelected(video.id) ? 'opacity-100' : 'opacity-0'" />
        </div>

        <div
          class="absolute right-3 top-3 z-20 flex gap-1 rounded-md border bg-background/95 p-1 opacity-0 shadow-sm transition-all duration-200 group-hover:opacity-100 group-hover:pointer-events-auto"
          :class="isSelected(video.id) ? 'pointer-events-auto opacity-100' : 'pointer-events-none'"
        >
          <Button size="icon-sm" variant="outline" @click="fireQuickAction(video.id, 'detail')">
            <FileText class="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="destructive" @click="fireQuickAction(video.id, 'delete')">
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>

        <VideoCard :video="video" :locale="props.locale" />
      </div>
    </div>
  </section>
</template>
