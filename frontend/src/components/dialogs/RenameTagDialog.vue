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

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  value: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "update:value": [value: string];
  submit: [];
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ t("dialog.renameTag.title") }}</DialogTitle>
        <DialogDescription>{{ t("dialog.renameTag.description") }}</DialogDescription>
      </DialogHeader>
      <div class="mt-2 space-y-3">
        <Input
          :model-value="value"
          :placeholder="t('dialog.renameTag.placeholder')"
          @update:model-value="emit('update:value', String($event))"
          @keyup.enter="emit('submit')"
        />
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="emit('update:open', false)">
            {{ t("common.cancel") }}
          </Button>
          <Button @click="emit('submit')">{{ t("dialog.renameTag.save") }}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
