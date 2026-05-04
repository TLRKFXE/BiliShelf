<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCcw,
  Search,
  UserRoundPlus,
} from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_FOLLOWING_UP_PAGE_SIZE,
  FOLLOWING_UP_PAGE_SIZE_OPTIONS,
  normalizeFollowingUpPageSize,
  paginateFollowingUps,
} from "@/lib/following-up-pagination.js";
import type { FollowingUpImportStatus, FollowedUp } from "@/types";

const props = defineProps<{
  t: (key: string, vars?: Record<string, string | number>) => string;
  records: FollowedUp[];
  keyword: string;
  loading: boolean;
  status: FollowingUpImportStatus | null;
}>();

const emit = defineEmits<{
  "update:keyword": [value: string];
  import: [];
  refresh: [];
  "open-space": [record: FollowedUp];
}>();

const normalizedKeyword = computed(() => props.keyword.trim().toLocaleLowerCase());
const visibleRecords = computed(() => {
  if (!normalizedKeyword.value) return props.records;
  return props.records.filter((record) => {
    return (
      record.name.toLocaleLowerCase().includes(normalizedKeyword.value) ||
      String(record.uid).includes(normalizedKeyword.value)
    );
  });
});
const hasRecords = computed(() => props.records.length > 0);
const currentPage = ref(1);
const followingUpPageJump = ref("");
const pageSize = ref(DEFAULT_FOLLOWING_UP_PAGE_SIZE);
const pagination = computed(() =>
  paginateFollowingUps(visibleRecords.value, currentPage.value, pageSize.value)
);
const pagedRecords = computed(() => pagination.value.items);

watch(normalizedKeyword, () => {
  currentPage.value = 1;
});

watch(
  () => props.records.length,
  () => {
    currentPage.value = 1;
  }
);

watch(
  () => pagination.value.page,
  (page) => {
    if (page !== currentPage.value) {
      currentPage.value = page;
    }
    followingUpPageJump.value = String(page);
  },
  { immediate: true }
);

function handlePageSizeChange(value: string | number) {
  pageSize.value = normalizeFollowingUpPageSize(value);
  currentPage.value = 1;
}

function goPrevPage() {
  currentPage.value = Math.max(1, pagination.value.page - 1);
}

function goNextPage() {
  currentPage.value = Math.min(pagination.value.totalPages, pagination.value.page + 1);
}

function handleFollowingUpPageJumpInput(value: string | number) {
  followingUpPageJump.value = String(value ?? "");
}

function submitFollowingUpPageJump() {
  const parsed = Number.parseInt(followingUpPageJump.value.trim(), 10);
  if (!Number.isFinite(parsed)) {
    followingUpPageJump.value = String(pagination.value.page);
    return;
  }
  const target = Math.min(Math.max(1, parsed), pagination.value.totalPages);
  followingUpPageJump.value = String(target);
  currentPage.value = target;
}
</script>

<template>
  <section class="panel-surface space-y-5 p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <h2 class="text-lg font-semibold">{{ props.t("followingUps.title") }}</h2>
        <p class="text-sm text-muted-foreground">
          {{ props.t("followingUps.description") }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {{ props.t("followingUps.total", { count: props.records.length }) }}
        </Badge>
        <Button size="sm" variant="outline" :disabled="props.loading" @click="emit('refresh')">
          <RefreshCcw class="h-3.5 w-3.5" />
          {{ props.t("followingUps.refresh") }}
        </Button>
        <Button size="sm" :disabled="props.loading" @click="emit('import')">
          <UserRoundPlus class="h-3.5 w-3.5" />
          {{ props.t("followingUps.import") }}
        </Button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative w-full max-w-sm">
        <Search
          class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          :model-value="props.keyword"
          class="pl-9"
          :placeholder="props.t('followingUps.searchPlaceholder')"
          @update:model-value="emit('update:keyword', String($event))"
        />
      </div>
      <p v-if="props.status" class="text-xs text-muted-foreground">
        {{
          props.t("followingUps.statusSummary", {
            current: props.status.current,
            total: props.status.total,
          })
        }}
      </p>
    </div>

    <div
      v-if="!hasRecords"
      class="panel-surface-soft rounded-2xl border border-dashed p-8 text-center"
    >
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <UserRoundPlus class="h-5 w-5" />
      </div>
      <p class="font-semibold">{{ props.t("followingUps.empty") }}</p>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ props.t("followingUps.emptyHint") }}
      </p>
      <Button class="mt-4" :disabled="props.loading" @click="emit('import')">
        {{ props.t("followingUps.import") }}
      </Button>
    </div>

    <div
      v-else-if="visibleRecords.length === 0"
      class="rounded-xl border border-dashed p-6 text-sm text-muted-foreground"
    >
      {{ props.t("followingUps.searchEmpty") }}
    </div>

    <div v-else class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <button
          v-for="record in pagedRecords"
          :key="record.uid"
          type="button"
          class="panel-surface-soft interactive-lift flex items-center gap-3 rounded-2xl border p-4 text-left"
          @click="emit('open-space', record)"
        >
          <img
            v-if="record.avatarUrl"
            :src="record.avatarUrl"
            :alt="record.name"
            class="h-12 w-12 rounded-full object-cover"
          />
          <div
            v-else
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-bold text-primary"
          >
            UP
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ record.name }}</p>
            <p class="text-xs text-muted-foreground">UID {{ record.uid }}</p>
          </div>
          <span
            class="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
          >
            <ExternalLink class="h-3 w-3" />
            {{ props.t("followingUps.openSpace") }}
          </span>
        </button>
      </div>

      <section class="panel-surface-soft rounded-2xl border p-4">
        <div class="flex flex-wrap items-center justify-between gap-3.5">
          <p class="text-sm text-muted-foreground">
            {{
              props.t("common.page", {
                page: pagination.page,
                totalPage: pagination.totalPages,
                total: pagination.total,
              })
            }}
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs text-muted-foreground">{{ props.t("common.perPage") }}</span>
            <Select
              :model-value="String(pageSize)"
              @update:model-value="handlePageSizeChange(String($event))"
            >
              <SelectTrigger class="h-9 w-[96px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="size in FOLLOWING_UP_PAGE_SIZE_OPTIONS"
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
              :disabled="pagination.page <= 1 || props.loading"
              @click="goPrevPage"
            >
              <ChevronLeft class="h-3.5 w-3.5" />
              {{ props.t("common.prev") }}
            </Button>
            <Button
              size="sm"
              variant="outline"
              :disabled="pagination.page >= pagination.totalPages || props.loading"
              @click="goNextPage"
            >
              {{ props.t("common.next") }}
              <ChevronRight class="h-3.5 w-3.5" />
            </Button>
            <Input
              :model-value="followingUpPageJump"
              type="text"
              inputmode="numeric"
              :placeholder="props.t('common.pageJumpPlaceholder')"
              class="h-9 w-[90px]"
              @update:model-value="handleFollowingUpPageJumpInput(String($event))"
              @keydown.enter.prevent="submitFollowingUpPageJump"
            />
            <Button
              size="sm"
              variant="outline"
              :disabled="props.loading || pagination.totalPages <= 1"
              @click="submitFollowingUpPageJump"
            >
              {{ props.t("common.jump") }}
            </Button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
