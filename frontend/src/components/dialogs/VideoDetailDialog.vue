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

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  detailVideo: DetailVideo | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();
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
            :href="detailVideo.bvidUrl"
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
