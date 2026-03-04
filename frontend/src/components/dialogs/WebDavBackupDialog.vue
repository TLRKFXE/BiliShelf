<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  CloudDownload,
  CloudUpload,
  FolderArchive,
  RefreshCcw,
  RotateCw,
  ServerCog,
  ShieldCheck,
  Unplug,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WebDavSettings } from "@/lib/api";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  settings: WebDavSettings | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [payload: { enabled: boolean; baseUrl: string; username: string; password?: string; remotePath: string }];
  reload: [];
  test: [payload: { enabled: boolean; baseUrl: string; username: string; password?: string; remotePath: string }];
  upload: [];
  restore: [];
  download: [];
}>();

const localEnabled = ref(false);
const localBaseUrl = ref("");
const localUsername = ref("");
const localPassword = ref("");
const localRemotePath = ref("bilishelf");

watch(
  () => [props.open, props.settings] as const,
  () => {
    localEnabled.value = Boolean(props.settings?.enabled);
    localBaseUrl.value = props.settings?.baseUrl ?? "";
    localUsername.value = props.settings?.username ?? "";
    localRemotePath.value = props.settings?.remotePath ?? "bilishelf";
    localPassword.value = "";
  },
  { immediate: true }
);

const canSave = computed(() => !props.loading);

function buildPayload() {
  return {
    enabled: localEnabled.value,
    baseUrl: localBaseUrl.value,
    username: localUsername.value,
    password: localPassword.value || undefined,
    remotePath: localRemotePath.value,
  };
}

function handleSave() {
  if (!canSave.value) return;
  emit("save", buildPayload());
}

function handleTest() {
  if (!canSave.value) return;
  emit("test", buildPayload());
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ServerCog class="h-4.5 w-4.5" />
          </span>
          {{ t("webdav.title") }}
        </DialogTitle>
        <DialogDescription>{{ t("webdav.desc") }}</DialogDescription>
      </DialogHeader>

      <section class="space-y-3">
        <label class="panel-surface flex items-start gap-3 rounded-md border p-3">
          <Checkbox
            :model-value="localEnabled"
            :disabled="loading"
            class="mt-0.5"
            @update:model-value="localEnabled = $event === true"
          />
          <div class="min-w-0">
            <p class="text-sm font-medium">{{ t("webdav.enableTitle") }}</p>
            <p class="text-xs text-muted-foreground">
              {{ t("webdav.enableDesc") }}
            </p>
          </div>
        </label>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1.5 sm:col-span-2">
            <span class="text-xs text-muted-foreground">{{ t("webdav.baseUrl") }}</span>
            <Input
              v-model="localBaseUrl"
              :disabled="loading"
              placeholder="https://dav.example.com/remote.php/dav/files/username"
            />
          </label>
          <label class="space-y-1.5">
            <span class="text-xs text-muted-foreground">{{ t("webdav.username") }}</span>
            <Input v-model="localUsername" :disabled="loading" />
          </label>
          <label class="space-y-1.5">
            <span class="text-xs text-muted-foreground">{{ t("webdav.password") }}</span>
            <Input
              v-model="localPassword"
              :disabled="loading"
              type="password"
              :placeholder="settings?.passwordSet ? t('webdav.passwordPlaceholderKeep') : ''"
            />
          </label>
          <label class="space-y-1.5 sm:col-span-2">
            <span class="text-xs text-muted-foreground">{{ t("webdav.remotePath") }}</span>
            <Input v-model="localRemotePath" :disabled="loading" placeholder="bilishelf" />
          </label>
        </div>

        <div class="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          <p>{{ t("webdav.statusTest", { time: settings?.lastTestAt ? new Date(settings.lastTestAt).toLocaleString() : "-" }) }}</p>
          <p>{{ t("webdav.statusBackup", { time: settings?.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : "-" }) }}</p>
          <p>{{ t("webdav.statusRestore", { time: settings?.lastRestoreAt ? new Date(settings.lastRestoreAt).toLocaleString() : "-" }) }}</p>
          <p v-if="settings?.lastError" class="mt-1 flex items-start gap-1 text-amber-600 dark:text-amber-400">
            <Unplug class="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{{ settings.lastError }}</span>
          </p>
          <p v-else class="mt-1 flex items-start gap-1">
            <ShieldCheck class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{{ t("webdav.desc") }}</span>
          </p>
        </div>
      </section>

      <DialogFooter class="flex flex-wrap justify-between gap-2">
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" :disabled="loading" @click="emit('reload')">
            <RefreshCcw class="h-3.5 w-3.5" />
            {{ t("webdav.reload") }}
          </Button>
          <Button variant="outline" :disabled="loading" @click="handleTest">
            <RotateCw class="h-3.5 w-3.5" />
            {{ t("webdav.test") }}
          </Button>
          <Button variant="outline" :disabled="loading" @click="emit('upload')">
            <CloudUpload class="h-3.5 w-3.5" />
            {{ t("webdav.upload") }}
          </Button>
          <Button variant="outline" :disabled="loading" @click="emit('download')">
            <CloudDownload class="h-3.5 w-3.5" />
            {{ t("webdav.download") }}
          </Button>
          <Button variant="outline" :disabled="loading" @click="emit('restore')">
            <FolderArchive class="h-3.5 w-3.5" />
            {{ t("webdav.restore") }}
          </Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" :disabled="loading" @click="emit('update:open', false)">
            {{ t("common.cancel") }}
          </Button>
          <Button :disabled="!canSave" @click="handleSave">
            {{ t("common.confirm") }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
