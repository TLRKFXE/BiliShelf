<script setup lang="ts">
import { Calendar, CircleAlert, UserRound } from "lucide-vue-next";
import type { Video } from "../types";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

const FALLBACK_COVER = "https://i0.hdslb.com/bfs/archive/placeholder.jpg";
const BILI_ORIGIN = "https://www.bilibili.com";

type Locale = "zh-CN" | "en-US";

const props = withDefaults(
  defineProps<{
  video: Video;
    locale?: Locale;
  }>(),
  {
    locale: "zh-CN"
  }
);

const CARD_TEXT: Record<
  "noDescription" | "invalid" | "collectedAt" | "unknown",
  Record<Locale, string>
> = {
  noDescription: { "zh-CN": "暂无简介", "en-US": "No description" },
  invalid: { "zh-CN": "已失效", "en-US": "Invalid" },
  collectedAt: { "zh-CN": "收藏时间", "en-US": "Collected" },
  unknown: { "zh-CN": "未知", "en-US": "Unknown" }
};

function t(key: keyof typeof CARD_TEXT) {
  return CARD_TEXT[key][props.locale];
}

function formatDate(timestamp: number | null | undefined) {
  if (!timestamp) return t("unknown");
  return new Date(timestamp).toLocaleString(props.locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function getCollectedTime(video: Video) {
  return video.addedAt ?? video.publishAt ?? null;
}

function sanitizeCoverUrl(url: string) {
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

function handleImageError(event: Event) {
  const element = event.target as HTMLImageElement;
  if (element.src !== FALLBACK_COVER) element.src = FALLBACK_COVER;
}

function resolveVideoUrl(video: Video) {
  const raw = (video.bvidUrl || "").trim();
  const fallbackBvid = (video.bvid || "").trim();
  const fallback = fallbackBvid ? `${BILI_ORIGIN}/video/${fallbackBvid}/` : "";

  if (!raw) return fallback;

  const appSchemeMatch = raw.match(/^bilibili:\/\/video\/([^/?#]+)/i);
  if (appSchemeMatch) {
    const token = (appSchemeMatch[1] || "").trim();
    if (/^BV[0-9A-Za-z]+$/i.test(token)) return `${BILI_ORIGIN}/video/${token}/`;
    if (fallback) return fallback;
    if (/^\d+$/.test(token)) return `${BILI_ORIGIN}/video/av${token}/`;
    return `${BILI_ORIGIN}/video/${token}/`;
  }

  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/video/")) return `${BILI_ORIGIN}${raw}`;
  if (/^video\//i.test(raw)) return `${BILI_ORIGIN}/${raw}`;
  if (/^BV[0-9A-Za-z]+$/i.test(raw)) return `${BILI_ORIGIN}/video/${raw}/`;
  if (/^av\d+$/i.test(raw)) return `${BILI_ORIGIN}/video/${raw}/`;
  if (/^\d+$/.test(raw)) return fallback || `${BILI_ORIGIN}/video/av${raw}/`;
  if (/^http:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, "https://");
  if (/^https?:\/\//i.test(raw)) return raw;

  return fallback;
}
</script>

<template>
  <Card class="flex h-full flex-col overflow-hidden border bg-card shadow-sm transition-all duration-200 ease-out hover:shadow-lg">
    <a :href="resolveVideoUrl(video)" target="_blank" rel="noreferrer" class="block aspect-video w-full overflow-hidden bg-muted">
      <img
        :src="sanitizeCoverUrl(video.coverUrl)"
        :alt="video.title"
        referrerpolicy="no-referrer"
        class="h-full w-full object-cover"
        @error="handleImageError"
      />
    </a>

    <div class="flex h-[156px] flex-1 flex-col gap-2 p-3.5">
      <div class="space-y-1.5">
        <h3 class="line-clamp-2 text-sm font-semibold leading-5">{{ video.title }}</h3>
        <p class="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{{ video.description || t("noDescription") }}</p>
      </div>

      <div class="flex max-h-12 flex-wrap gap-1.5 overflow-hidden">
        <Badge v-if="video.isInvalid" variant="outline" class="border-red-300 text-red-600">
          <CircleAlert class="h-3.5 w-3.5" />
          {{ t("invalid") }}
        </Badge>
        <Badge v-for="tag in video.tags || []" :key="tag" variant="secondary">{{ tag }}</Badge>
      </div>

      <div class="mt-auto flex w-full items-end justify-between gap-2 text-xs text-muted-foreground">
        <p class="flex min-w-0 items-start gap-1 text-left">
          <UserRound class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span class="line-clamp-1">{{ video.uploader }}</span>
        </p>
        <p class="flex shrink-0 items-start gap-1 text-right">
          <Calendar class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{{ t("collectedAt") }}: {{ formatDate(getCollectedTime(video)) }}</span>
        </p>
      </div>
    </div>
  </Card>
</template>
