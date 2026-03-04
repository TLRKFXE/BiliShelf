<script setup lang="ts">
import { ChevronLeft, ChevronRight, PencilLine, Plus, Tag, Trash2 } from "lucide-vue-next";
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
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "update:newTagName": [value: string];
  createTag: [];
  renameTag: [tag: TagItem];
  deleteTag: [tag: TagItem];
  prevPage: [];
  nextPage: [];
}>();
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

        <div
          v-if="customTags.length === 0"
          class="panel-surface-soft rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
        >
          {{ t("tools.noCustomTag") }}
        </div>

        <template v-else>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-muted-foreground">
              {{ t("common.page", { page, totalPage: totalPages, total: customTags.length }) }}
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
