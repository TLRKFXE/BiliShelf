<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { InvalidVideoRecoveryStatus } from "@/lib/api";

const props = defineProps<{
  open: boolean;
  candidateCount: number;
  status: InvalidVideoRecoveryStatus | null;
  loading: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}>();
const emit = defineEmits<{
  "update:open": [value: boolean];
  start: [];
}>();

const running = computed(() => props.status?.running ?? false);
const total = computed(() => props.status?.total ?? props.candidateCount);
const progressPercent = computed(() =>
  total.value > 0
    ? Math.min(100, Math.round(((props.status?.current ?? 0) / total.value) * 100))
    : 0
);
const canStart = computed(
  () => !running.value && !props.loading && props.candidateCount > 0
);

function handleOpenChange(nextOpen: boolean) {
  emit("update:open", nextOpen);
}

function startRecovery() {
  emit("start");
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-sm space-y-4 p-5">
      <DialogHeader>
        <DialogTitle>
          {{ t("invalidVideoRecovery.dialogTitle") }}
        </DialogTitle>
        <DialogDescription>
          {{
            t("invalidVideoRecovery.dialogDescription", {
              count: candidateCount,
            })
          }}
        </DialogDescription>
      </DialogHeader>

      <div>
        <p class="text-xs text-muted-foreground">
          {{
            t("invalidVideoRecovery.promptHint", {
              count: candidateCount,
            })
          }}
        </p>
        <div class="mt-3 space-y-1 text-sm">
          <div class="flex justify-between">
            <span>{{ t("invalidVideoRecovery.recovered") }}</span>
            <span>{{ status?.recovered ?? 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t("invalidVideoRecovery.notFound") }}</span>
            <span>{{ status?.notFound ?? 0 }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ t("invalidVideoRecovery.failed") }}</span>
            <span>{{ status?.failed ?? 0 }}</span>
          </div>
        </div>
        <Progress
          v-if="status"
          class="mt-3"
          :model-value="progressPercent"
          :max="100"
        />
        <p v-if="status" class="mt-1 text-xs text-muted-foreground">
          {{
            t("invalidVideoRecovery.progress", {
              current: status.current,
              total: status.total,
            })
          }}
        </p>
      </div>

      <DialogFooter class="flex flex-wrap gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          :disabled="loading"
          @click="handleOpenChange(false)"
        >
          {{ t("invalidVideoRecovery.later") }}
        </Button>
        <Button
          :loading="loading"
          :disabled="!canStart"
          size="sm"
          @click="startRecovery"
        >
          <span v-if="running">
            {{ t("invalidVideoRecovery.running") }}
          </span>
          <span v-else>
            {{ t("invalidVideoRecovery.start") }}
          </span>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
