<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, PencilLine, Plus, Search, Tag, Trash2 } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Tag as TagItem } from "@/types";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  customTags: TagItem[];
  pagedCustomTags: TagItem[];
  page: number;
  totalPages: number;
  newTagName: string;
  search: string;
  sort: "name-asc" | "name-desc" | "usage-asc" | "usage-desc" | "created-asc" | "created-desc";
  filteredTotal: number;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "update:newTagName": [value: string];
  "update:search": [value: string];
  "update:sort": [value: "name-asc" | "name-desc" | "usage-asc" | "usage-desc" | "created-asc" | "created-desc"];
  createTag: [];
  renameTag: [tag: TagItem];
  deleteTag: [tag: TagItem];
  prevPage: [];
  nextPage: [];
}>();

function toggleSort(field: "name" | "usage" | "created") {
  const currentField = props.sort.split("-")[0];
  const nextDirection = field === currentField && props.sort.endsWith("-desc") ? "asc" : "desc";
  emit("update:sort", `${field}-${nextDirection}` as typeof props.sort);
}

function sortTitle(field: "name" | "usage" | "created", labelKey: string) {
  const direction = props.sort === `${field}-asc` ? "tools.sortAscending" : "tools.sortDescending";
  return `${props.t(labelKey)} · ${props.t(direction)}`;
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] max-w-3xl overflow-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Tag class="h-4.5 w-4.5" />
          </span>
          {{ t("tools.manageTagsTitle") }}
        </DialogTitle>
        <DialogDescription>{{ t("tools.manageTagsDesc") }}</DialogDescription>
      </DialogHeader>

      <section class="panel-surface space-y-4 p-4">
        <div class="flex flex-wrap items-center gap-2">
          <Input
            :model-value="newTagName"
            :placeholder="t('tools.newTagPlaceholder')"
            class="max-w-sm"
            @update:model-value="emit('update:newTagName', String($event))"
          />
          <Button size="sm" @click="emit('createTag')">
            <Plus class="h-3.5 w-3.5" />
            {{ t("common.create") }}
          </Button>
          <Badge variant="outline">
            {{ t("tools.totalTags", { count: customTags.length }) }}
          </Badge>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative min-w-[220px] flex-1">
            <Search class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              :model-value="search"
              :placeholder="t('tools.searchTagsPlaceholder')"
              class="pl-9"
              @update:model-value="emit('update:search', String($event))"
            />
          </div>
          <div class="flex flex-wrap items-center gap-1">
            <Button size="sm" :variant="sort.startsWith('name-') ? 'secondary' : 'outline'" :title="sortTitle('name', 'tools.sortTagsName')" @click="toggleSort('name')">
              <component :is="sort === 'name-asc' ? ArrowUp : ArrowDown" class="h-3.5 w-3.5" />
              {{ t("tools.sortTagsName") }}
            </Button>
            <Button size="sm" :variant="sort.startsWith('usage-') ? 'secondary' : 'outline'" :title="sortTitle('usage', 'tools.sortTagsUsage')" @click="toggleSort('usage')">
              <component :is="sort === 'usage-asc' ? ArrowUp : ArrowDown" class="h-3.5 w-3.5" />
              {{ t("tools.sortTagsUsage") }}
            </Button>
            <Button size="sm" :variant="sort.startsWith('created-') ? 'secondary' : 'outline'" :title="sortTitle('created', 'tools.sortTagsCreated')" @click="toggleSort('created')">
              <component :is="sort === 'created-asc' ? ArrowUp : ArrowDown" class="h-3.5 w-3.5" />
              {{ t("tools.sortTagsCreated") }}
            </Button>
          </div>
        </div>

        <div
          v-if="customTags.length === 0 || pagedCustomTags.length === 0"
          class="panel-surface-soft rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        >
          {{ customTags.length === 0 ? t("tools.noCustomTag") : t("tools.noMatchingTag") }}
        </div>

        <template v-else>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-muted-foreground">
              {{ t("common.page", { page, totalPage: totalPages, total: filteredTotal }) }}
            </p>
            <div v-if="totalPages > 1" class="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                :disabled="page <= 1"
                @click="emit('prevPage')"
              >
                <ChevronLeft class="h-3.5 w-3.5" />
                {{ t("common.prev") }}
              </Button>
              <Button
                size="sm"
                variant="outline"
                :disabled="page >= totalPages"
                @click="emit('nextPage')"
              >
                {{ t("common.next") }}
                <ChevronRight class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="tag in pagedCustomTags"
              :key="tag.id"
              class="panel-surface-soft flex items-center justify-between gap-2 rounded-md border px-2.5 py-2"
            >
              <div class="min-w-0">
                <p class="line-clamp-1 text-sm font-medium">{{ tag.name }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ t("tools.tagUsage", { count: tag.usageCount }) }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  @click="emit('renameTag', tag)"
                >
                  <PencilLine class="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  class="text-red-600 hover:text-red-600"
                  @click="emit('deleteTag', tag)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </template>
      </section>
    </DialogContent>
  </Dialog>
</template>
