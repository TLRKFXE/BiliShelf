<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Video } from "@/types";

type DetailVideo = Video & { folders?: Array<{ id: number; name: string }> };
const BILI_ORIGIN = "https://www.bilibili.com";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  detailVideo: DetailVideo | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

function resolveVideoUrl(video: DetailVideo | null) {
  if (!video) return "";
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
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] max-w-2xl overflow-auto">
      <DialogHeader>
        <DialogTitle>{{ t("detail.title") }}</DialogTitle>
      </DialogHeader>

      <div v-if="loading" class="space-y-2">
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-[80%]" />
        <Skeleton class="h-20 w-full" />
      </div>

      <div v-else-if="detailVideo" class="space-y-2 text-sm">
        <p>
          <span class="font-semibold">{{ t("detail.videoTitle") }}:</span>
          {{ detailVideo.title }}
        </p>
        <p><span class="font-semibold">{{ t("detail.bv") }}:</span> {{ detailVideo.bvid }}</p>
        <p>
          <span class="font-semibold">{{ t("detail.uploader") }}:</span>
          {{ detailVideo.uploader }}
        </p>
        <p class="whitespace-pre-wrap">
          <span class="font-semibold">{{ t("detail.description") }}:</span>
          {{ detailVideo.description || "-" }}
        </p>
        <p>
          <span class="font-semibold">{{ t("detail.customTags") }}:</span>
          {{ (detailVideo.customTags || []).join(", ") || "-" }}
        </p>
        <p>
          <span class="font-semibold">{{ t("detail.bilibiliTags") }}:</span>
          {{ (detailVideo.systemTags || []).join(", ") || "-" }}
        </p>
        <p>
          <span class="font-semibold">{{ t("detail.folders") }}:</span>
          {{ (detailVideo.folders || []).map((f) => f.name).join(", ") || "-" }}
        </p>
        <p>
          <a
            :href="resolveVideoUrl(detailVideo)"
            target="_blank"
            rel="noreferrer"
            class="text-primary underline"
            >{{ t("detail.openOnBilibili") }}</a
          >
        </p>
      </div>
    </DialogContent>
  </Dialog>
</template>
