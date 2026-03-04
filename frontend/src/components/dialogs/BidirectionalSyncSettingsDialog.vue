<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { BellRing, RefreshCcw, ShieldCheck, Waypoints } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BidirectionalSyncSettings } from "@/lib/api";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  settings: BidirectionalSyncSettings | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [payload: { biliToLocalEnabled: boolean }];
  reload: [];
}>();

const localBiliToLocalEnabled = ref(false);

watch(
  () => [props.open, props.settings] as const,
  () => {
    localBiliToLocalEnabled.value = Boolean(props.settings?.biliToLocalEnabled);
  },
  { immediate: true }
);

const canSubmit = computed(() => !props.loading);

function handleSubmit() {
  if (!canSubmit.value) return;
  emit("save", {
    biliToLocalEnabled: localBiliToLocalEnabled.value,
  });
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Waypoints class="h-4.5 w-4.5" />
          </span>
          {{ t("sync.settings.title") }}
        </DialogTitle>
        <DialogDescription>{{ t("sync.settings.desc") }}</DialogDescription>
      </DialogHeader>

      <section class="space-y-3">
        <label class="panel-surface flex items-start gap-3 rounded-lg border p-3.5">
          <Checkbox
            :model-value="localBiliToLocalEnabled"
            :disabled="loading"
            class="mt-0.5"
            @update:model-value="localBiliToLocalEnabled = $event === true"
          />
          <div class="min-w-0">
            <p class="flex items-center gap-1.5 text-sm font-medium">
              <BellRing class="h-3.5 w-3.5 text-primary" />
              {{ t("sync.settings.biliToLocalTitle") }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ t("sync.settings.biliToLocalDesc") }}
            </p>
          </div>
        </label>
        <div
          class="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground"
        >
          <p class="flex items-start gap-1.5">
            <ShieldCheck class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{{ t("sync.settings.desc") }}</span>
          </p>
        </div>
      </section>

      <DialogFooter class="flex flex-wrap justify-end gap-2">
        <Button variant="outline" :disabled="loading" @click="emit('reload')">
          <RefreshCcw class="h-3.5 w-3.5" />
          {{ t("sync.settings.reload") }}
        </Button>
        <Button variant="outline" :disabled="loading" @click="emit('update:open', false)">
          {{ t("common.cancel") }}
        </Button>
        <Button :disabled="!canSubmit" @click="handleSubmit">
          {{ t("common.confirm") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
