<script setup lang="ts">
import { ref } from "vue";
import {
  CirclePlay,
  Download,
  Moon,
  RefreshCcw,
  Sun,
  Upload,
} from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
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

const props = defineProps<{
  t: (key: string, vars?: Record<string, string | number>) => string;
  trashMode: boolean;
  currentViewLabel: string;
  currentScopeLabel: string;
  localeToggleText: string;
  isDark: boolean;
  progressValue: number;
  syncing: boolean;
  exporting: boolean;
  importing: boolean;
}>();

const emit = defineEmits<{
  "open-tags": [];
  "toggle-trash": [];
  "toggle-locale": [];
  "toggle-theme": [];
  "sync-import": [];
  "import-file": [];
  "export-json": [];
  "export-csv": [];
}>();

const exportDialogOpen = ref(false);

function openExportDialog() {
  exportDialogOpen.value = true;
}

function submitExport(format: "json" | "csv") {
  exportDialogOpen.value = false;
  if (format === "json") {
    emit("export-json");
    return;
  }
  emit("export-csv");
}
</script>

<template>
  <header class="panel-surface p-5">
    <div class="flex flex-wrap items-start justify-between gap-3.5">
      <div>
        <h1 class="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"
          >
            <CirclePlay class="h-5 w-5" />
          </span>
          {{ props.t("header.title") }}
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ props.t("header.subtitle") }}
        </p>
        <p class="mt-1 text-xs text-muted-foreground/80">
          {{ props.t("header.credit") }}
        </p>
      </div>
      <div class="ml-auto flex flex-wrap items-start justify-end gap-2">
        <Badge variant="secondary">{{ props.currentViewLabel }}</Badge>
        <Badge
          v-if="!props.trashMode"
          variant="outline"
          class="max-w-[260px] truncate"
        >
          {{ props.currentScopeLabel }}
        </Badge>
        <Button size="sm" variant="outline" @click="emit('toggle-locale')">
          {{ props.localeToggleText }}
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          class="relative overflow-hidden"
          :aria-label="
            props.isDark
              ? props.t('theme.switchToLight')
              : props.t('theme.switchToDark')
          "
          @click="emit('toggle-theme')"
        >
          <Transition name="theme-icon" mode="out-in">
            <Sun v-if="props.isDark" key="sun" class="h-4 w-4" />
            <Moon v-else key="moon" class="h-4 w-4" />
          </Transition>
        </Button>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-end gap-2">
      <Button
        v-if="!props.trashMode"
        size="sm"
        variant="outline"
        @click="emit('open-tags')"
      >
        {{ props.t("header.manageTags") }}
      </Button>
      <Button
        size="sm"
        :variant="props.trashMode ? 'default' : 'outline'"
        @click="emit('toggle-trash')"
      >
        {{
          props.trashMode
            ? props.t("header.backManager")
            : props.t("header.openTrash")
        }}
      </Button>
      <Button
        v-if="!props.trashMode"
        size="sm"
        variant="outline"
        :disabled="props.syncing || props.exporting || props.importing"
        @click="emit('sync-import')"
      >
        <RefreshCcw class="mr-1.5 h-3.5 w-3.5" />
        {{
          props.syncing
            ? props.t("header.syncing")
            : props.t("header.syncImport")
        }}
      </Button>
      <Button
        v-if="!props.trashMode"
        size="sm"
        variant="outline"
        :disabled="props.syncing || props.exporting || props.importing"
        @click="openExportDialog"
      >
        <Download class="mr-1.5 h-3.5 w-3.5" />
        {{ props.t("header.exportBackup") }}
      </Button>
      <Button
        v-if="!props.trashMode"
        size="sm"
        variant="outline"
        :disabled="props.syncing || props.exporting || props.importing"
        @click="emit('import-file')"
      >
        <Upload class="mr-1.5 h-3.5 w-3.5" />
        {{ props.t("header.importData") }}
      </Button>
    </div>
    <div v-if="props.progressValue > 0" class="mt-3">
      <Progress :model-value="props.progressValue" />
    </div>
    <Dialog :open="exportDialogOpen" @update:open="exportDialogOpen = $event">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ props.t("header.exportDialogTitle") }}</DialogTitle>
          <DialogDescription>{{
            props.t("header.exportDialogDesc")
          }}</DialogDescription>
        </DialogHeader>
        <DialogFooter class="flex flex-wrap justify-end gap-2">
          <Button variant="outline" @click="exportDialogOpen = false">
            {{ props.t("common.cancel") }}
          </Button>
          <Button
            variant="outline"
            :disabled="props.syncing || props.exporting || props.importing"
            @click="submitExport('json')"
          >
            {{ props.t("header.exportJson") }}
          </Button>
          <Button
            variant="outline"
            :disabled="props.syncing || props.exporting || props.importing"
            @click="submitExport('csv')"
          >
            {{ props.t("header.exportCsv") }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </header>
</template>

<style scoped>
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-70deg) scale(0.6);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(70deg) scale(0.6);
}
</style>
