<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Bot, RefreshCcw, ShieldCheck, TestTubeDiagonal, Unplug } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AiProvider, AiSettings } from "@/types";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  settings: AiSettings | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [payload: { provider: AiProvider; baseUrl: string; apiKey?: string; model: string; enabled: boolean }];
  reload: [];
  test: [payload: { provider: AiProvider; baseUrl: string; apiKey?: string; model: string; enabled: boolean }];
}>();

const providerOptions: Array<{ value: AiProvider; label: string }> = [
  { value: "openai-compatible", label: "OpenAI Compatible" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
  { value: "grok", label: "Grok" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "kimi", label: "Kimi" },
];

const localProvider = ref<AiProvider>("openai-compatible");
const localBaseUrl = ref("");
const localApiKey = ref("");
const localModel = ref("");
const localEnabled = ref(false);

watch(
  () => [props.open, props.settings] as const,
  () => {
    localProvider.value = props.settings?.provider ?? "openai-compatible";
    localBaseUrl.value = props.settings?.baseUrl ?? "";
    localModel.value = props.settings?.model ?? "";
    localEnabled.value = Boolean(props.settings?.enabled);
    localApiKey.value = "";
  },
  { immediate: true },
);

const canSubmit = computed(() => !props.loading);
const statusTime = computed(() =>
  props.settings?.lastTestAt
    ? new Date(props.settings.lastTestAt).toLocaleString()
    : "-",
);

function buildPayload() {
  return {
    provider: localProvider.value,
    baseUrl: localBaseUrl.value.trim(),
    apiKey: localApiKey.value.trim() || undefined,
    model: localModel.value.trim(),
    enabled: localEnabled.value,
  };
}

function handleSave() {
  if (!canSubmit.value) return;
  emit("save", buildPayload());
}

function handleTest() {
  if (!canSubmit.value) return;
  emit("test", buildPayload());
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"
          >
            <Bot class="h-4.5 w-4.5" />
          </span>
          {{ t("ai.settings.title") }}
        </DialogTitle>
        <DialogDescription>{{ t("ai.settings.desc") }}</DialogDescription>
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
            <p class="text-sm font-medium">{{ t("ai.settings.enableTitle") }}</p>
            <p class="text-xs text-muted-foreground">
              {{ t("ai.settings.enableDesc") }}
            </p>
          </div>
        </label>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1.5">
            <span class="text-xs text-muted-foreground">{{ t("ai.settings.provider") }}</span>
            <Select v-model="localProvider" :disabled="loading">
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="provider in providerOptions"
                  :key="provider.value"
                  :value="provider.value"
                >
                  {{ provider.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label class="space-y-1.5">
            <span class="text-xs text-muted-foreground">{{ t("ai.settings.model") }}</span>
            <Input
              v-model="localModel"
              :disabled="loading"
              :placeholder="t('ai.settings.modelPlaceholder')"
            />
          </label>

          <label class="space-y-1.5 sm:col-span-2">
            <span class="text-xs text-muted-foreground">{{ t("ai.settings.baseUrl") }}</span>
            <Input
              v-model="localBaseUrl"
              :disabled="loading"
              :placeholder="t('ai.settings.baseUrlPlaceholder')"
            />
          </label>

          <label class="space-y-1.5 sm:col-span-2">
            <span class="text-xs text-muted-foreground">{{ t("ai.settings.apiKey") }}</span>
            <Input
              v-model="localApiKey"
              :disabled="loading"
              type="password"
              :placeholder="
                settings?.apiKeySet
                  ? t('ai.settings.apiKeyPlaceholderKeep')
                  : t('ai.settings.apiKeyPlaceholder')
              "
            />
          </label>
        </div>

        <div class="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          <p>{{ t("ai.settings.statusTest", { time: statusTime }) }}</p>
          <p
            v-if="settings?.lastError"
            class="mt-1 flex items-start gap-1 text-amber-600 dark:text-amber-400"
          >
            <Unplug class="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{{ settings.lastError }}</span>
          </p>
          <p v-else class="mt-1 flex items-start gap-1">
            <ShieldCheck class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>{{ t("ai.settings.desc") }}</span>
          </p>
        </div>
      </section>

      <DialogFooter class="flex flex-wrap justify-between gap-2">
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" :disabled="loading" @click="emit('reload')">
            <RefreshCcw class="h-3.5 w-3.5" />
            {{ t("ai.settings.reload") }}
          </Button>
          <Button variant="outline" :disabled="loading" @click="handleTest">
            <TestTubeDiagonal class="h-3.5 w-3.5" />
            {{ t("ai.settings.test") }}
          </Button>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" :disabled="loading" @click="emit('update:open', false)">
            {{ t("common.cancel") }}
          </Button>
          <Button :disabled="!canSubmit" @click="handleSave">
            {{ t("common.confirm") }}
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
