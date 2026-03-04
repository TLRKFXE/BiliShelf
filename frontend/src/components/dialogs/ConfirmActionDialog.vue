<script setup lang="ts">
import { AlertTriangle, ShieldAlert } from "lucide-vue-next";
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
        <DialogTitle class="flex items-center gap-2">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg"
            :class="
              variant === 'destructive'
                ? 'bg-destructive/20 text-destructive'
                : 'bg-primary/15 text-primary'
            "
          >
            <ShieldAlert v-if="variant === 'destructive'" class="h-4.5 w-4.5" />
            <AlertTriangle v-else class="h-4.5 w-4.5" />
          </span>
          {{ title }}
        </DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
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
