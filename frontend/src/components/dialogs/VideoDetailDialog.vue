<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Video } from "@/types";

type DetailVideo = Video & { folders?: Array<{ id: number; name: string }> };
const BILI_ORIGIN = "https://www.bilibili.com";

type SavePayload = {
  title?: string;
  uploader?: string;
  uploaderSpaceUrl?: string | null;
  description?: string;
  publishAt?: number | null;
  bvidUrl?: string;
  customTags?: string[];
  systemTags?: string[];
};

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  saving?: boolean;
  detailVideo: DetailVideo | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [payload: { id: number; data: SavePayload }];
}>();

const editMode = ref(false);
const formTitle = ref("");
const formUploader = ref("");
const formUploaderSpaceUrl = ref("");
const formDescription = ref("");
const formPublishAt = ref("");
const formBvidUrl = ref("");
const formCustomTags = ref("");
const formSystemTags = ref("");

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

function resolveUploaderSpaceUrl(video: DetailVideo | null) {
  if (!video) return "";
  const raw = (video.uploaderSpaceUrl || "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return `${BILI_ORIGIN}/space/${raw}`;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (/^http:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, "https://");
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}

function formatDateTimeInput(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function parseDateTimeInput(value: string) {
  const text = value.trim();
  if (!text) return null;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function parseTagInput(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[,\n，]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function formatDateTimeDisplay(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function fillForm(video: DetailVideo | null) {
  formTitle.value = video?.title || "";
  formUploader.value = video?.uploader || "";
  formUploaderSpaceUrl.value = video?.uploaderSpaceUrl || "";
  formDescription.value = video?.description || "";
  formPublishAt.value = formatDateTimeInput(video?.publishAt);
  formBvidUrl.value = video?.bvidUrl || "";
  formCustomTags.value = (video?.customTags || []).join(", ");
  formSystemTags.value = (video?.systemTags || []).join(", ");
}

function enterEditMode() {
  fillForm(props.detailVideo);
  editMode.value = true;
}

function cancelEditMode() {
  fillForm(props.detailVideo);
  editMode.value = false;
}

const canSubmit = computed(() => {
  if (!props.detailVideo) return false;
  return formTitle.value.trim().length > 0 && formUploader.value.trim().length > 0;
});

function submitManualSave() {
  if (!props.detailVideo) return;
  if (!canSubmit.value) return;
  emit("save", {
    id: props.detailVideo.id,
    data: {
      title: formTitle.value.trim(),
      uploader: formUploader.value.trim(),
      uploaderSpaceUrl: formUploaderSpaceUrl.value.trim() || null,
      description: formDescription.value,
      publishAt: parseDateTimeInput(formPublishAt.value),
      bvidUrl: formBvidUrl.value.trim(),
      customTags: parseTagInput(formCustomTags.value),
      systemTags: parseTagInput(formSystemTags.value)
    }
  });
}

watch(
  () => props.detailVideo,
  (video) => {
    fillForm(video);
    if (video) {
      editMode.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => props.open,
  (open) => {
    if (!open) {
      editMode.value = false;
    }
  }
);
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

      <div v-else-if="detailVideo" class="space-y-3 text-sm">
        <div v-if="!editMode" class="space-y-2">
          <p>
            <span class="font-semibold">{{ t("detail.videoTitle") }}:</span>
            {{ detailVideo.title }}
          </p>
          <p><span class="font-semibold">{{ t("detail.bv") }}:</span> {{ detailVideo.bvid }}</p>
          <p>
            <span class="font-semibold">{{ t("detail.uploader") }}:</span>
            {{ detailVideo.uploader }}
            <a
              v-if="resolveUploaderSpaceUrl(detailVideo)"
              :href="resolveUploaderSpaceUrl(detailVideo)"
              target="_blank"
              rel="noreferrer"
              class="ml-2 text-primary underline"
            >
              {{ t("detail.openUploaderSpace") }}
            </a>
          </p>
          <p>
            <span class="font-semibold">{{ t("detail.publishAt") }}:</span>
            {{ formatDateTimeDisplay(detailVideo.publishAt) }}
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
          <div class="flex flex-wrap items-center gap-3">
            <a
              :href="resolveVideoUrl(detailVideo)"
              target="_blank"
              rel="noreferrer"
              class="text-primary underline"
            >
              {{ t("detail.openOnBilibili") }}
            </a>
            <Button variant="secondary" size="sm" @click="enterEditMode">
              {{ t("detail.manualComplete") }}
            </Button>
          </div>
        </div>

        <div v-else class="space-y-3">
          <p class="text-xs text-muted-foreground">{{ t("detail.manualEditHint") }}</p>
          <div class="space-y-1">
            <p class="font-semibold">{{ t("detail.videoTitle") }}</p>
            <Input v-model="formTitle" />
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-1">
              <p class="font-semibold">{{ t("detail.uploader") }}</p>
              <Input v-model="formUploader" />
            </div>
            <div class="space-y-1">
              <p class="font-semibold">{{ t("detail.uploaderSpace") }}</p>
              <Input v-model="formUploaderSpaceUrl" placeholder="https://space.bilibili.com/123456" />
            </div>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-1">
              <p class="font-semibold">{{ t("detail.publishAt") }}</p>
              <Input v-model="formPublishAt" type="datetime-local" />
            </div>
            <div class="space-y-1">
              <p class="font-semibold">{{ t("detail.openOnBilibili") }}</p>
              <Input v-model="formBvidUrl" />
            </div>
          </div>
          <div class="space-y-1">
            <p class="font-semibold">{{ t("detail.description") }}</p>
            <Textarea v-model="formDescription" rows="5" />
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-1">
              <p class="font-semibold">{{ t("detail.customTags") }}</p>
              <Input
                v-model="formCustomTags"
                :placeholder="t('detail.customTagsInputPlaceholder')"
              />
            </div>
            <div class="space-y-1">
              <p class="font-semibold">{{ t("detail.bilibiliTags") }}</p>
              <Input
                v-model="formSystemTags"
                :placeholder="t('detail.systemTagsInputPlaceholder')"
              />
            </div>
          </div>
          <div class="flex items-center justify-end gap-2">
            <Button variant="outline" :disabled="saving" @click="cancelEditMode">
              {{ t("common.cancel") }}
            </Button>
            <Button :disabled="saving || !canSubmit" @click="submitManualSave">
              {{ saving ? t("detail.saving") : t("detail.saveManual") }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
