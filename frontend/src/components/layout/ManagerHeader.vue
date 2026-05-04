<script setup lang="ts">
import { ref } from "vue";
import {
  Bot,
  DatabaseBackup,
  Download,
  Languages,
  Moon,
  RefreshCcw,
  Sun,
  Tags,
  Trash2,
  Upload,
  UserRoundCheck,
  Waypoints,
} from "lucide-vue-next";
import BiliShelfMark from "@/components/icons/BiliShelfMark.vue";
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
  followingUpsMode: boolean;
  showAiSettings: boolean;
  showSyncSettings: boolean;
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
  "open-ai-settings": [];
  "open-following-ups": [];
  "open-sync-settings": [];
  "open-webdav-settings": [];
  "toggle-trash": [];
  "toggle-locale": [];
  "toggle-theme": [];
  "sync-import": [];
  "import-file": [];
  "export-json": [];
  "export-csv": [];
}>();

const exportDialogOpen = ref(false);
const topActionButtonClass = "h-12 w-full justify-start rounded-2xl border border-border/80 bg-card/80 px-4 shadow-sm shadow-black/5";
const secondaryActionButtonClass = "h-12 w-full justify-start rounded-2xl border border-border/80 bg-card/80 px-4 shadow-sm shadow-black/5";
const activeViewButtonClass = "border-primary/35 bg-primary/12 text-primary shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.6)] hover:bg-primary/16 hover:text-primary dark:border-primary/30 dark:bg-primary/16";
const trashActionIconClass = "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-colors";
const trashActionIconIdleClass = "border-border/80 bg-muted/70 text-foreground dark:border-white/10 dark:bg-white/10 dark:text-white";
const trashActionIconActiveClass = "border-primary/30 bg-primary/15 text-primary dark:border-primary/30 dark:bg-primary/18 dark:text-primary";

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
  <header class="hero-surface p-5 md:p-6">
    <div class="grid gap-4 xl:grid-cols-[1fr_auto]">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2.5">
          <div class="inline-flex h-10 w-10 items-center justify-center">
            <BiliShelfMark class="h-10 w-10" />
          </div>
          <div class="min-w-0">
            <h1
              class="line-clamp-1 text-xl font-extrabold tracking-tight md:text-2xl"
            >
              {{ props.t("header.title") }}
            </h1>
            <p class="line-clamp-1 text-sm text-muted-foreground">
              {{ props.t("header.subtitle") }}
            </p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{{ props.currentViewLabel }}</Badge>
          <Badge
            v-if="!props.trashMode"
            variant="outline"
            class="max-w-[420px] truncate border-border/80 bg-card/75"
          >
            {{ props.currentScopeLabel }}
          </Badge>
          <span class="action-chip">
            <Waypoints class="h-3.5 w-3.5" />
            {{ props.t("header.credit") }}
          </span>
        </div>
      </div>

      <div
        class="flex flex-wrap items-start justify-start gap-2 xl:justify-end"
      >
        <Button size="sm" variant="outline" @click="emit('toggle-locale')">
          <Languages class="h-3.5 w-3.5" />
          {{ props.localeToggleText }}
        </Button>
        <Button
          size="icon"
          variant="outline"
          :title="
            props.isDark
              ? props.t('theme.switchToLight')
              : props.t('theme.switchToDark')
          "
          :aria-label="
            props.isDark
              ? props.t('theme.switchToLight')
              : props.t('theme.switchToDark')
          "
          @click="emit('toggle-theme')"
        >
          <Sun v-if="props.isDark" class="h-3.5 w-3.5" />
          <Moon v-else class="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>

    <div v-if="!props.trashMode && !props.followingUpsMode" class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Button
        size="sm"
        variant="outline"
        :class="topActionButtonClass"
        @click="emit('open-tags')"
      >
        <Tags class="h-3.5 w-3.5" />
        {{ props.t("header.manageTags") }}
      </Button>
      <Button
        v-if="props.showAiSettings"
        size="sm"
        variant="outline"
        :class="topActionButtonClass"
        @click="emit('open-ai-settings')"
      >
        <Bot class="h-3.5 w-3.5" />
        {{ props.t("header.aiSettings") }}
      </Button>
      <Button
        v-if="props.showSyncSettings"
        size="sm"
        variant="outline"
        :class="topActionButtonClass"
        @click="emit('open-sync-settings')"
      >
        <RefreshCcw class="h-3.5 w-3.5" />
        {{ props.t("header.syncSettings") }}
      </Button>
      <Button
        size="sm"
        variant="outline"
        :class="topActionButtonClass"
        @click="emit('open-following-ups')"
      >
        <UserRoundCheck class="h-3.5 w-3.5" />
        {{ props.t("header.followingUps") }}
      </Button>
      <Button
        size="sm"
        variant="outline"
        :class="[topActionButtonClass, props.trashMode ? activeViewButtonClass : '']"
        @click="emit('toggle-trash')"
      >
        <span
          :class="[trashActionIconClass, props.trashMode ? trashActionIconActiveClass : trashActionIconIdleClass]"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </span>
        {{
          props.trashMode
            ? props.t("header.backManager")
            : props.t("header.openTrash")
        }}
      </Button>
    </div>

    <div v-else-if="props.followingUpsMode" class="mt-5 flex justify-start md:justify-end">
      <Button
        size="sm"
        variant="outline"
        :class="[topActionButtonClass, props.followingUpsMode ? activeViewButtonClass : '']"
        @click="emit('open-following-ups')"
      >
        <span
          :class="[trashActionIconClass, props.followingUpsMode ? trashActionIconActiveClass : trashActionIconIdleClass]"
        >
          <UserRoundCheck class="h-3.5 w-3.5" />
        </span>
        {{ props.t("header.backManager") }}
      </Button>
    </div>

    <div v-else class="mt-5 flex justify-start md:justify-end">
      <Button
        size="sm"
        variant="outline"
        :class="[topActionButtonClass, props.trashMode ? activeViewButtonClass : '']"
        @click="emit('toggle-trash')"
      >
        <span
          :class="[trashActionIconClass, props.trashMode ? trashActionIconActiveClass : trashActionIconIdleClass]"
        >
          <Trash2 class="h-3.5 w-3.5" />
        </span>
        {{
          props.trashMode
            ? props.t("header.backManager")
            : props.t("header.openTrash")
        }}
      </Button>
    </div>

    <div class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Button
        v-if="!props.trashMode"
        size="sm"
        variant="outline"
        :class="secondaryActionButtonClass"
        :disabled="props.syncing || props.exporting || props.importing"
        @click="emit('sync-import')"
      >
        <RefreshCcw class="h-3.5 w-3.5" />
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
        :class="secondaryActionButtonClass"
        :disabled="props.syncing || props.exporting || props.importing"
        @click="openExportDialog"
      >
        <Download class="h-3.5 w-3.5" />
        {{ props.t("header.exportBackup") }}
      </Button>
      <Button
        v-if="!props.trashMode"
        size="sm"
        variant="outline"
        :class="secondaryActionButtonClass"
        :disabled="props.syncing || props.exporting || props.importing"
        @click="emit('import-file')"
      >
        <Upload class="h-3.5 w-3.5" />
        {{ props.t("header.importData") }}
      </Button>
      <Button
        v-if="!props.trashMode"
        size="sm"
        variant="outline"
        :class="secondaryActionButtonClass"
        :disabled="props.syncing || props.exporting || props.importing"
        @click="emit('open-webdav-settings')"
      >
        <DatabaseBackup class="h-3.5 w-3.5" />
        {{ props.t("webdav.title") }}
      </Button>
    </div>

    <div v-if="props.progressValue > 0" class="mt-4 space-y-1">
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>{{ props.t("header.syncing") }}</span>
        <span>{{ Math.round(props.progressValue) }}%</span>
      </div>
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
