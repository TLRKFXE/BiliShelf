<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmVariant = "default" | "destructive";

const props = defineProps<{
  open: boolean;
  cancelText: string;
  title: string;
  description: string;
  confirmText: string;
  variant: ConfirmVariant;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  cancel: [];
  confirm: [];
}>();
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="mt-4 flex justify-end gap-2">
        <Button variant="outline" @click="emit('cancel')">
          {{ cancelText }}
        </Button>
        <Button
          :variant="variant === 'destructive' ? 'destructive' : 'default'"
          @click="emit('confirm')"
        >
          {{ confirmText }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
