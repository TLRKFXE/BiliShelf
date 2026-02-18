<script setup lang="ts">
import { Search } from "lucide-vue-next";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { Tag } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type FieldToken =
  | "title"
  | "uploader"
  | "description"
  | "systemTag"
  | "customTag";
type Locale = "zh-CN" | "en-US";

const FIELD_SNIPPET_ALIASES: Record<FieldToken, string[]> = {
  title: ["title:", "标题:"],
  uploader: ["uploader:", "up:", "up主:", "UP主:"],
  description: ["description:", "简介:"],
  systemTag: ["systemTag:", "bilibiliTag:", "b站tag:", "B站tag:"],
  customTag: ["customTag:", "custom:", "自定义tag:", "自定义标签:"],
};

const props = withDefaults(
  defineProps<{
    keyword: string;
    tags: Tag[];
    locale?: Locale;
  }>(),
  {
    locale: "zh-CN",
  }
);

const emit = defineEmits<{
  "update:keyword": [string];
  appendFieldToken: [FieldToken];
  search: [];
  clear: [];
}>();

const SEARCH_TEXT: Record<
  | "searchPlaceholder"
  | "search"
  | "reset"
  | "fieldTokens"
  | "customTags"
  | "emptyCustomTag"
  | "title"
  | "uploader"
  | "description"
  | "systemTag"
  | "customTag"
  | "page"
  | "prev"
  | "next",
  Record<Locale, string>
> = {
  searchPlaceholder: {
    "zh-CN": "例如：UP主:童子军大王 简介:好厉害 关键字",
    "en-US": "Example: uploader:CreatorName description:tips keyword",
  },
  search: { "zh-CN": "搜索", "en-US": "Search" },
  reset: { "zh-CN": "清空", "en-US": "Reset" },
  fieldTokens: { "zh-CN": "字段标签", "en-US": "Field Tokens" },
  customTags: { "zh-CN": "自定义标签", "en-US": "Custom Tags" },
  emptyCustomTag: { "zh-CN": "暂无自定义标签。", "en-US": "No custom tags yet." },
  title: { "zh-CN": "标题", "en-US": "Title" },
  uploader: { "zh-CN": "UP主", "en-US": "Uploader" },
  description: { "zh-CN": "简介", "en-US": "Description" },
  systemTag: { "zh-CN": "B站标签", "en-US": "Bilibili Tag" },
  customTag: { "zh-CN": "自定义标签", "en-US": "Custom Tag" },
  page: { "zh-CN": "页码", "en-US": "Page" },
  prev: { "zh-CN": "上一页", "en-US": "Prev" },
  next: { "zh-CN": "下一页", "en-US": "Next" },
};

function t(key: keyof typeof SEARCH_TEXT) {
  return SEARCH_TEXT[key][props.locale];
}

const fieldTokenDefs = computed<
  Array<{ key: FieldToken; label: string; snippet: string }>
>(() => [
  {
    key: "uploader",
    label: t("uploader"),
    snippet: props.locale === "zh-CN" ? "UP主:" : "uploader:",
  },
  {
    key: "description",
    label: t("description"),
    snippet: props.locale === "zh-CN" ? "简介:" : "description:",
  },
]);

const customTags = computed(() => props.tags.filter((tag) => tag.type === "custom"));
const customTagPage = ref(1);
const customTagViewportRef = ref<HTMLElement | null>(null);
const customTagViewportWidth = ref(0);
const tagMeasureCanvas = document.createElement("canvas");
const tagMeasureContext = tagMeasureCanvas.getContext("2d");
const tagGapPx = 8;
const tagExtraPx = 24;

function updateCustomTagViewportWidth() {
  const width = customTagViewportRef.value?.clientWidth ?? 0;
  customTagViewportWidth.value = Math.max(0, Math.floor(width));
}

function measureTagWidth(label: string) {
  if (!tagMeasureContext) return 60;
  tagMeasureContext.font =
    "600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  const textWidth = tagMeasureContext.measureText(label).width;
  return Math.ceil(textWidth + tagExtraPx);
}

const customTagPageStarts = computed(() => {
  const tags = customTags.value;
  if (tags.length === 0) return [0];

  const availableWidth = customTagViewportWidth.value;
  if (availableWidth <= 0) return [0];

  const starts: number[] = [0];
  let usedWidth = 0;

  for (let index = 0; index < tags.length; index += 1) {
    const nextTagWidth = measureTagWidth(tags[index].name);
    const appendWidth =
      usedWidth === 0 ? nextTagWidth : usedWidth + tagGapPx + nextTagWidth;

    if (appendWidth > availableWidth && usedWidth > 0) {
      starts.push(index);
      usedWidth = nextTagWidth;
      continue;
    }

    usedWidth = appendWidth;
  }

  return starts;
});

const customTagTotalPages = computed(() => customTagPageStarts.value.length);
const pagedCustomTags = computed(() => {
  const starts = customTagPageStarts.value;
  const pageIndex = Math.max(0, customTagPage.value - 1);
  const start = starts[pageIndex] ?? 0;
  const end = starts[pageIndex + 1] ?? customTags.value.length;
  return customTags.value.slice(start, end);
});

watch(
  () => [customTags.value.length, customTagViewportWidth.value],
  () => {
    if (customTagPage.value > customTagTotalPages.value) {
      customTagPage.value = customTagTotalPages.value;
    }
    if (customTagPage.value < 1) customTagPage.value = 1;
  },
  { immediate: true }
);

let customTagResizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  await nextTick();
  updateCustomTagViewportWidth();

  if (typeof ResizeObserver !== "undefined" && customTagViewportRef.value) {
    customTagResizeObserver = new ResizeObserver(() => {
      updateCustomTagViewportWidth();
    });
    customTagResizeObserver.observe(customTagViewportRef.value);
  }
});

onUnmounted(() => {
  customTagResizeObserver?.disconnect();
  customTagResizeObserver = null;
});

function prevCustomTagPage() {
  if (customTagPage.value <= 1) return;
  customTagPage.value -= 1;
}

function nextCustomTagPage() {
  if (customTagPage.value >= customTagTotalPages.value) return;
  customTagPage.value += 1;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCustomTagTokenRegex(name: string) {
  const escapedName = escapeRegExp(name.trim());
  const aliases = FIELD_SNIPPET_ALIASES.customTag
    .map((snippet) => escapeRegExp(snippet))
    .join("|");
  return new RegExp(`(?:^|\\s)(?:${aliases})\\s*${escapedName}(?=\\s|$)`, "giu");
}

function toggleCustomTag(name: string) {
  const token = name.trim();
  if (!token) return;
  const source = props.keyword.trim();
  const tokenRegex = buildCustomTagTokenRegex(token);

  if (tokenRegex.test(source)) {
    const next = source.replace(tokenRegex, " ").replace(/\s+/g, " ").trim();
    emit("update:keyword", next);
    return;
  }

  const snippet = props.locale === "zh-CN" ? "自定义tag:" : "customTag:";
  const nextToken = `${snippet}${token}`;
  emit("update:keyword", source ? `${source} ${nextToken}` : nextToken);
}

function hasFieldToken(field: FieldToken) {
  const source = props.keyword.trim().toLowerCase();
  if (!source) return false;
  return FIELD_SNIPPET_ALIASES[field].some((snippet) =>
    source.includes(snippet.toLowerCase())
  );
}

function hasCustomTagToken(name: string) {
  if (!name.trim()) return false;
  return buildCustomTagTokenRegex(name).test(props.keyword.trim());
}
</script>

<template>
  <section class="panel-surface p-5">
    <div class="flex flex-col gap-3.5 lg:flex-row lg:items-center">
      <Input
        :model-value="keyword"
        :placeholder="t('searchPlaceholder')"
        class="h-11"
        @update:model-value="emit('update:keyword', String($event))"
        @keyup.enter="emit('search')"
      />
      <div class="flex items-center gap-2.5">
        <Button class="h-11" @click="emit('search')">
          <Search class="h-4 w-4" />
          {{ t("search") }}
        </Button>
        <Button class="h-11" variant="outline" @click="emit('clear')">
          {{ t("reset") }}
        </Button>
      </div>
    </div>

    <div class="mt-5 space-y-2.5">
      <p class="text-xs font-medium text-muted-foreground">{{ t("fieldTokens") }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="field in fieldTokenDefs"
          :key="field.key"
          type="button"
          @click="emit('appendFieldToken', field.key)"
        >
          <Badge :variant="hasFieldToken(field.key) ? 'default' : 'secondary'">
            {{ field.label }}
          </Badge>
        </button>
      </div>
    </div>

    <div class="mt-5 space-y-2.5">
      <p class="text-xs font-medium text-muted-foreground">{{ t("customTags") }}</p>
      <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div ref="customTagViewportRef" class="min-w-0 flex-1 overflow-hidden">
          <div class="flex flex-nowrap items-center gap-2">
            <button
              v-for="tag in pagedCustomTags"
              :key="tag.id"
              type="button"
              class="shrink-0"
              @click="toggleCustomTag(tag.name)"
            >
              <Badge :variant="hasCustomTagToken(tag.name) ? 'default' : 'secondary'">
                {{ tag.name }}
              </Badge>
            </button>
            <span v-if="customTags.length === 0" class="text-xs text-muted-foreground">{{
              t("emptyCustomTag")
            }}</span>
          </div>
        </div>

        <div
          v-if="customTagTotalPages > 1"
          class="flex shrink-0 items-center justify-end gap-2 lg:min-w-[210px] lg:pt-0"
        >
          <Button
            size="sm"
            variant="outline"
            :disabled="customTagPage === 1"
            @click="prevCustomTagPage"
          >
            {{ t("prev") }}
          </Button>
          <span class="text-xs text-muted-foreground"
            >{{ t("page") }} {{ customTagPage }} / {{ customTagTotalPages }}</span
          >
          <Button
            size="sm"
            variant="outline"
            :disabled="customTagPage >= customTagTotalPages"
            @click="nextCustomTagPage"
          >
            {{ t("next") }}
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
