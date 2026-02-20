<script setup lang="ts">
import SearchBar from "@/components/SearchBar.vue";
import VideoGrid from "@/components/VideoGrid.vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Locale } from "@/stores/app-ui";
import type { Folder, Tag, Video } from "@/types";
import { CalendarDays } from "lucide-vue-next";
import { ref } from "vue";

type SearchFieldToken =
  | "title"
  | "uploader"
  | "description"
  | "systemTag"
  | "customTag";
type QuickAction = "detail" | "delete";
type DateField = "from" | "to";

const props = defineProps<{
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: Locale;
  keyword: string;
  tags: Tag[];
  fromDate: string;
  toDate: string;
  videos: Video[];
  loading: boolean;
  selectedVideoIds: number[];
  batchPanelOpen: boolean;
  folders: Folder[];
  batchTargetFolderId: number | null;
  canMoveFromCurrentFolder: boolean;
  batchPanelClasses: string;
  batchOutlineButtonClasses: string;
  batchSecondaryButtonClasses: string;
  batchSelectTriggerClasses: string;
  batchSelectedTextClasses: string;
  videoPage: number;
  videoTotalPages: number;
  total: number;
  videoPageSize: number;
  pageSizeOptions: number[];
}>();

const emit = defineEmits<{
  "update:keyword": [value: string];
  "update:fromDate": [value: string];
  "update:toDate": [value: string];
  "update:batchTargetFolderId": [value: number | null];
  appendFieldToken: [field: SearchFieldToken];
  search: [];
  clearSearch: [];
  applyDateFilter: [];
  clearDateFilter: [];
  toggleBatchPanel: [];
  setSelection: [{ id: number; checked: boolean }];
  selectAllVisible: [];
  clearVideoSelection: [];
  quickAction: [{ id: number; action: QuickAction }];
  detail: [id: number];
  prevVideoPage: [];
  nextVideoPage: [];
  videoPageSizeChange: [value: string];
  batchCopy: [];
  batchMove: [];
  batchDelete: [];
}>();

const fromDatePickerRef = ref<HTMLInputElement | null>(null);
const toDatePickerRef = ref<HTMLInputElement | null>(null);

function formatDateForDisplay(value: string) {
  return value ? value.replace(/-/g, "/") : "";
}

function normalizeDateFromInput(raw: string) {
  const value = String(raw ?? "")
    .trim()
    .replace(/\./g, "/")
    .replace(/-/g, "/")
    .replace(/\s+/g, "");
  if (!value) return "";
  return value.replace(/\//g, "-");
}

function handleFromDateInput(value: string | number) {
  emit("update:fromDate", normalizeDateFromInput(String(value ?? "")));
}

function handleToDateInput(value: string | number) {
  emit("update:toDate", normalizeDateFromInput(String(value ?? "")));
}

function openDatePicker(field: DateField) {
  const picker = field === "from" ? fromDatePickerRef.value : toDatePickerRef.value;
  if (!picker) return;
  if (typeof picker.showPicker === "function") {
    picker.showPicker();
    return;
  }
  picker.focus();
  picker.click();
}

function handleNativeDateChange(field: DateField, event: Event) {
  const target = event.target as HTMLInputElement | null;
  const value = target?.value ?? "";
  if (field === "from") {
    emit("update:fromDate", value);
    return;
  }
  emit("update:toDate", value);
}
</script>

<template>
  <SearchBar
    :keyword="keyword"
    :tags="tags"
    :locale="locale"
    @update:keyword="emit('update:keyword', String($event))"
    @append-field-token="emit('appendFieldToken', $event)"
    @search="emit('search')"
    @clear="emit('clearSearch')"
  />

  <section class="panel-surface p-4">
    <div class="flex items-center justify-between gap-3.5">
      <div class="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        <div class="relative min-w-[190px]">
          <Input
            :model-value="formatDateForDisplay(fromDate)"
            type="text"
            inputmode="numeric"
            placeholder="yyyy/mm/dd"
            class="date-input h-10 min-w-[190px] rounded-lg border-muted-foreground/20 bg-muted/40 pr-10 focus-visible:border-primary/55 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none"
            @update:model-value="handleFromDateInput(String($event))"
          />
          <input
            ref="fromDatePickerRef"
            :value="fromDate"
            type="date"
            tabindex="-1"
            class="pointer-events-none absolute h-0 w-0 opacity-0"
            @change="handleNativeDateChange('from', $event)"
          />
          <button
            type="button"
            class="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            @click="openDatePicker('from')"
          >
            <CalendarDays class="h-4 w-4" />
          </button>
        </div>
        <span class="px-1 text-sm text-muted-foreground">{{ t("search.to") }}</span>
        <div class="relative min-w-[190px]">
          <Input
            :model-value="formatDateForDisplay(toDate)"
            type="text"
            inputmode="numeric"
            placeholder="yyyy/mm/dd"
            class="date-input h-10 min-w-[190px] rounded-lg border-muted-foreground/20 bg-muted/40 pr-10 focus-visible:border-primary/55 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none"
            @update:model-value="handleToDateInput(String($event))"
          />
          <input
            ref="toDatePickerRef"
            :value="toDate"
            type="date"
            tabindex="-1"
            class="pointer-events-none absolute h-0 w-0 opacity-0"
            @change="handleNativeDateChange('to', $event)"
          />
          <button
            type="button"
            class="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            @click="openDatePicker('to')"
          >
            <CalendarDays class="h-4 w-4" />
          </button>
        </div>
        <Button size="sm" @click="emit('applyDateFilter')"
          >{{ t("search.applyDateFilter") }}</Button
        >
        <Button size="sm" variant="outline" @click="emit('clearDateFilter')"
          >{{ t("common.clear") }}</Button
        >
      </div>
      <Button
        size="sm"
        variant="default"
        class="ml-auto min-w-[136px] font-semibold"
        @click="emit('toggleBatchPanel')"
      >
        {{ batchPanelOpen ? t("batch.close") : t("batch.open") }}
      </Button>
    </div>
  </section>

  <VideoGrid
    :videos="videos"
    :loading="loading"
    :selected-ids="selectedVideoIds"
    :batch-mode="batchPanelOpen"
    :locale="locale"
    @set-selection="emit('setSelection', $event)"
    @select-all="emit('selectAllVisible')"
    @clear-selection="emit('clearVideoSelection')"
    @quick-action="emit('quickAction', $event)"
    @detail="emit('detail', $event)"
  />

  <section class="panel-surface p-4">
    <div class="flex flex-wrap items-center justify-between gap-3.5">
      <p class="text-sm text-muted-foreground">
        {{ t("common.page", { page: videoPage, totalPage: videoTotalPages, total }) }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-muted-foreground">{{ t("common.perPage") }}</span>
        <Select
          :model-value="String(videoPageSize)"
          @update:model-value="emit('videoPageSizeChange', String($event))"
        >
          <SelectTrigger class="h-9 w-[96px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="size in pageSizeOptions"
              :key="size"
              :value="String(size)"
            >
              {{ size }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          :disabled="videoPage <= 1 || loading"
          @click="emit('prevVideoPage')"
        >
          {{ t("common.prev") }}
        </Button>
        <Button
          size="sm"
          variant="outline"
          :disabled="videoPage >= videoTotalPages || loading"
          @click="emit('nextVideoPage')"
        >
          {{ t("common.next") }}
        </Button>
      </div>
    </div>
  </section>

  <Transition name="batch-panel">
    <section
      v-if="batchPanelOpen"
      :class="batchPanelClasses"
    >
      <div class="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          :class="batchOutlineButtonClasses"
          :disabled="videos.length === 0"
          @click="emit('selectAllVisible')"
        >
          {{ t("batch.selectPage") }}
        </Button>
        <Button
          size="sm"
          variant="outline"
          :class="batchOutlineButtonClasses"
          :disabled="selectedVideoIds.length === 0"
          @click="emit('clearVideoSelection')"
        >
          {{ t("batch.clear") }}
        </Button>
        <span :class="batchSelectedTextClasses">{{ t("batch.selected", { count: selectedVideoIds.length }) }}</span>

        <div class="ml-auto flex flex-wrap items-center gap-2">
          <Select
            :model-value="
              batchTargetFolderId ? String(batchTargetFolderId) : ''
            "
            @update:model-value="
              emit('update:batchTargetFolderId', $event ? Number($event) : null)
            "
          >
            <SelectTrigger
              :class="batchSelectTriggerClasses"
            >
              <SelectValue :placeholder="t('batch.targetFolder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="folder in folders"
                :key="folder.id"
                :value="String(folder.id)"
              >
                {{ folder.name }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="secondary"
            :class="batchSecondaryButtonClasses"
            @click="emit('batchCopy')"
          >
            {{ t("batch.copyTo") }}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            :class="batchSecondaryButtonClasses"
            @click="emit('batchMove')"
            :disabled="!canMoveFromCurrentFolder"
          >
            {{ t("batch.moveTo") }}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            @click="emit('batchDelete')"
          >
            {{ t("batch.deleteTrash") }}
          </Button>
        </div>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.batch-panel-enter-active,
.batch-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.batch-panel-enter-from,
.batch-panel-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}

.batch-panel-light .text-zinc-300 {
  color: rgb(71 85 105);
}
</style>
