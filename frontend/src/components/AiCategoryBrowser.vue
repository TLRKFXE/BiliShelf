<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowLeft, FolderOpen, Sparkles } from "lucide-vue-next";
import type { AiCategoryKey, Folder, FolderAiCategories, Video } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import VideoCard from "./VideoCard.vue";

type Locale = "zh-CN" | "en-US";

const FALLBACK_COVER = "https://i0.hdslb.com/bfs/archive/placeholder.jpg";
const CATEGORY_KEYS: AiCategoryKey[] = [
  "animation",
  "music",
  "dance",
  "game",
  "knowledge",
  "tech",
  "sports",
  "car",
  "life",
  "food",
  "animal",
  "fashion",
  "ent",
  "cinephile",
  "news",
  "other",
];

const props = withDefaults(
  defineProps<{
    t: (key: string, vars?: Record<string, string | number>) => string;
    locale?: Locale;
    folder: Folder | null;
    result: FolderAiCategories | null;
    videos?: Video[];
    videosLoading?: boolean;
    initialCategory?: AiCategoryKey | null;
  }>(),
  {
    locale: "zh-CN",
    videos: () => [],
    videosLoading: false,
    initialCategory: null,
  }
);

const emit = defineEmits<{
  back: [];
  openCategory: [AiCategoryKey];
}>();

const currentCategory = ref<AiCategoryKey | null>(null);

type CategoryGroup = {
  key: AiCategoryKey;
  label: string;
  count: number;
  videos: Video[];
  covers: string[];
};

const folderName = computed(
  () => props.folder?.name ?? props.t("ai.browser.unknownFolder")
);
const analyzedVideoCount = computed(() => props.result?.videos.length ?? 0);
const videoById = computed(() => {
  const map = new Map<number, Video>();
  for (const video of props.videos) {
    map.set(video.id, video);
  }
  return map;
});

function toCategoryLabel(category: AiCategoryKey) {
  return props.t(`ai.category.${category}`);
}

function sanitizeCoverUrl(url: string | undefined) {
  if (!url) return FALLBACK_COVER;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" && /(^|\.)hdslb\.com$/i.test(parsed.hostname)) {
      parsed.protocol = "https:";
    }
    return parsed.toString();
  } catch {
    return FALLBACK_COVER;
  }
}

const categoryGroups = computed<CategoryGroup[]>(() => {
  if (!props.result) return [];

  const grouped = new Map<AiCategoryKey, number[]>();
  for (const key of CATEGORY_KEYS) {
    grouped.set(key, []);
  }

  for (const item of props.result.videos) {
    const list = grouped.get(item.category) ?? [];
    list.push(item.videoId);
    grouped.set(item.category, list);
  }

  return CATEGORY_KEYS.map((key) => {
    const ids = grouped.get(key) ?? [];
    const videos = ids
      .map((id) => videoById.value.get(id))
      .filter((video): video is Video => Boolean(video));
    const covers = videos.slice(0, 4).map((video) => sanitizeCoverUrl(video.coverUrl));
    return {
      key,
      label: toCategoryLabel(key),
      count: ids.length,
      videos,
      covers,
    };
  })
    .filter((group) => group.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
});

const currentGroup = computed(
  () => categoryGroups.value.find((group) => group.key === currentCategory.value) ?? null
);

watch(
  () => props.initialCategory,
  (next) => {
    currentCategory.value = next ?? null;
  },
  { immediate: true }
);

watch(
  () => props.folder?.id,
  () => {
    currentCategory.value = props.initialCategory ?? null;
  }
);

watch(categoryGroups, (groups) => {
  if (!currentCategory.value) return;
  if (!groups.some((group) => group.key === currentCategory.value)) {
    currentCategory.value = null;
  }
});

function handleOpenCategory(category: AiCategoryKey) {
  currentCategory.value = category;
  emit("openCategory", category);
}
</script>

<template>
  <section class="panel-surface rounded-lg border p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-muted-foreground">
          {{ t("ai.browser.title") }}
        </p>
        <h2 class="text-base font-semibold leading-tight sm:text-lg">
          {{ folderName }}
        </h2>
        <p class="text-xs text-muted-foreground">
          {{
            t("ai.browser.videoCount", {
              count: analyzedVideoCount,
            })
          }}
          |
          {{
            t("ai.browser.categoryCount", {
              count: categoryGroups.length,
            })
          }}
        </p>
      </div>

      <Button variant="outline" size="sm" @click="emit('back')">
        <ArrowLeft class="h-4 w-4" />
        {{ t("ai.browser.backToManager") }}
      </Button>
    </div>

    <Card
      v-if="!result"
      class="mt-4 border-dashed p-8 text-center text-sm text-muted-foreground"
    >
      {{ t("ai.browser.emptyResult") }}
    </Card>

    <template v-else-if="!currentGroup">
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="group in categoryGroups"
          :key="group.key"
          type="button"
          class="interactive-lift overflow-hidden rounded-xl border border-border/75 bg-card/90 text-left transition hover:border-primary/40 hover:bg-accent/30"
          @click="handleOpenCategory(group.key)"
        >
          <div class="grid aspect-video grid-cols-2 grid-rows-2 gap-1 bg-muted/55 p-1.5">
            <div
              v-for="index in 4"
              :key="`${group.key}-${index}`"
              class="overflow-hidden rounded-md bg-muted"
            >
              <img
                v-if="group.covers[index - 1]"
                :src="group.covers[index - 1]"
                :alt="group.label"
                referrerpolicy="no-referrer"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-muted-foreground"
              >
                <FolderOpen class="h-4 w-4" />
              </div>
            </div>
          </div>
          <div class="space-y-1 px-3 py-3">
            <p class="line-clamp-1 text-sm font-semibold">
              {{ group.label }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ t("ai.browser.videoCount", { count: group.count }) }}
            </p>
          </div>
        </button>
      </div>

      <Card
        v-if="categoryGroups.length === 0"
        class="mt-4 border-dashed p-8 text-center text-sm text-muted-foreground"
      >
        {{ t("ai.browser.emptyOverview") }}
      </Card>
    </template>

    <template v-else>
      <div
        class="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card/70 p-3"
      >
        <Button variant="ghost" size="sm" class="gap-1" @click="currentCategory = null">
          <ArrowLeft class="h-4 w-4" />
          {{ t("ai.browser.backToOverview") }}
        </Button>
        <div class="text-right">
          <p class="text-sm font-semibold">{{ currentGroup.label }}</p>
          <p class="text-xs text-muted-foreground">
            {{ t("ai.browser.videoCount", { count: currentGroup.count }) }}
          </p>
        </div>
      </div>

      <div v-if="videosLoading" class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Card v-for="index in 6" :key="index" class="overflow-hidden p-0">
          <Skeleton class="aspect-video w-full rounded-none" />
          <div class="space-y-2 p-4">
            <Skeleton class="h-4 w-[75%]" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-[55%]" />
          </div>
        </Card>
      </div>

      <Card
        v-else-if="currentGroup.videos.length === 0"
        class="mt-4 border-dashed p-8 text-center text-sm text-muted-foreground"
      >
        {{ t("ai.browser.emptyCategory") }}
      </Card>

      <div
        v-else
        class="mt-4 grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        <div
          v-for="video in currentGroup.videos"
          :key="video.id"
          class="h-full rounded-xl shadow-[0_12px_30px_-18px_hsl(var(--surface-shadow)/0.6)] transition-[transform,box-shadow] duration-200 hover:-translate-y-[2px] hover:shadow-[0_24px_46px_-24px_hsl(var(--surface-shadow)/0.65)]"
        >
          <VideoCard :video="video" :locale="locale" />
        </div>
      </div>
    </template>

    <div class="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
      <Sparkles class="h-3.5 w-3.5" />
      <span>{{ t("ai.browser.footerHint") }}</span>
    </div>
  </section>
</template>
