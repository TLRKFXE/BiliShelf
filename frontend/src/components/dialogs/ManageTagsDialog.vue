<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Tag } from "@/types";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  customTags: Tag[];
  pagedCustomTags: Tag[];
  page: number;
  totalPages: number;
  newTagName: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "update:newTagName": [value: string];
  createTag: [];
  renameTag: [tag: Tag];
  deleteTag: [tag: Tag];
  prevPage: [];
  nextPage: [];
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[85vh] max-w-3xl overflow-auto">
      <DialogHeader>
        <DialogTitle>{{ t("tools.manageTagsTitle") }}</DialogTitle>
        <DialogDescription>{{ t("tools.manageTagsDesc") }}</DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <section class="panel-surface p-4">
          <p class="mb-3 text-sm font-semibold">{{ t("tools.manageTagsTitle") }}</p>
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <Input
              :model-value="newTagName"
              :placeholder="t('tools.newTagPlaceholder')"
              class="max-w-xs"
              @update:model-value="emit('update:newTagName', String($event))"
            />
            <Button size="sm" @click="emit('createTag')">{{ t("common.create") }}</Button>
          </div>
          <div
            v-if="customTags.length === 0"
            class="text-sm text-muted-foreground"
          >
            {{ t("tools.noCustomTag") }}
          </div>
          <div v-else class="space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-xs text-muted-foreground">
                {{ t("common.page", { page, totalPage: totalPages, total: customTags.length }) }}
              </p>
              <div
                v-if="totalPages > 1"
                class="flex items-center gap-2"
              >
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="page <= 1"
                  @click="emit('prevPage')"
                >
                  {{ t("common.prev") }}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="page >= totalPages"
                  @click="emit('nextPage')"
                >
                  {{ t("common.next") }}
                </Button>
              </div>
            </div>

            <div class="flex flex-wrap gap-2.5">
              <div
                v-for="tag in pagedCustomTags"
                :key="tag.id"
                class="panel-surface-soft flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs"
              >
                <span>{{ tag.name }}</span>
                <span class="text-muted-foreground"
                  >({{ tag.usageCount }})</span
                >
                <Button
                  size="sm"
                  variant="ghost"
                  @click="emit('renameTag', tag)"
                  >{{ t("common.rename") }}</Button
                >
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-red-600"
                  @click="emit('deleteTag', tag)"
                  >{{ t("common.delete") }}</Button
                >
              </div>
            </div>
          </div>
        </section>
      </div>
    </DialogContent>
  </Dialog>
</template>
