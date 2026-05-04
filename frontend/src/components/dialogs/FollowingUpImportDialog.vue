<script setup lang="ts">
import { computed } from "vue";
import { UserRoundCheck } from "lucide-vue-next";
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
import type { FollowingUpImportStatus } from "@/types";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  status: FollowingUpImportStatus | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
}>();

const running = computed(() => props.status?.running ?? false);
const total = computed(() => props.status?.total ?? 0);
const current = computed(() => props.status?.current ?? 0);
const progressPercent = computed(() =>
  total.value > 0 ? Math.min(100, Math.round((current.value / total.value) * 100)) : 0
);

function handleOpenChange(nextOpen: boolean) {
  emit("update:open", nextOpen);
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <UserRoundCheck class="h-4.5 w-4.5" />
          </span>
          {{ props.t("followingUps.dialogTitle") }}
        </DialogTitle>
        <DialogDescription>{{ props.t("followingUps.dialogDesc") }}</DialogDescription>
      </DialogHeader>

      <section v-if="status" class="space-y-2 rounded-2xl border p-4">
        <div class="flex items-center justify-between text-sm">
          <span>{{ props.t("followingUps.progress") }}</span>
          <span>{{ current }} / {{ total }}</span>
        </div>
        <Progress :model-value="progressPercent" />
        <p class="text-xs text-muted-foreground">
          {{
            props.t("followingUps.importResult", {
              created: status.created,
              updated: status.updated,
              failed: status.failed,
            })
          }}
        </p>
        <p
          v-if="status.lastError"
          class="whitespace-pre-wrap text-xs text-amber-600 dark:text-amber-400"
        >
          {{ status.lastError }}
        </p>
      </section>

      <DialogFooter class="flex flex-wrap justify-end gap-2">
        <Button variant="outline" :disabled="loading" @click="handleOpenChange(false)">
          {{ props.t("common.cancel") }}
        </Button>
        <Button :disabled="loading || running" @click="emit('confirm')">
          {{ running ? props.t("followingUps.importing") : props.t("followingUps.startImport") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
