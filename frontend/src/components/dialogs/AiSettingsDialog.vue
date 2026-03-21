<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Bot,
  RefreshCcw,
  TestTubeDiagonal,
  Unplug,
} from "lucide-vue-next";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchAiSettingsModels } from "@/lib/api";
import {
  buildAiSettingsPayload,
  mergeAiModelOptions,
  resolveAiSettingsProviderId,
  type AiSettingsProviderId,
} from "@/lib/ai-settings-form.js";
import type { AiSettings, AiSettingsModelOption } from "@/types";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  settings: AiSettings | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [
    payload: {
      provider: AiSettings["provider"];
      customProviderName?: string;
      baseUrl: string;
      apiKey?: string;
      model: string;
      enabled: boolean;
    },
  ];
  reload: [];
  test: [
    payload: {
      provider: AiSettings["provider"];
      customProviderName?: string;
      baseUrl: string;
      apiKey?: string;
      model: string;
      enabled: boolean;
    },
  ];
}>();

const OFFICIAL_PROVIDER_IDS = new Set<AiSettingsProviderId>([
  "openai",
  "gemini",
  "claude",
  "grok",
  "deepseek",
  "kimi",
]);

const localProviderId = ref<AiSettingsProviderId>("openai-compatible");
const localCustomProviderName = ref("");
const localBaseUrl = ref("");
const localApiKey = ref("");
const localModel = ref("");
const localEnabled = ref(false);
const modelOptions = ref<AiSettingsModelOption[]>([]);
const modelSource = ref<"builtin" | "remote">("builtin");
const modelLoading = ref(false);
const modelError = ref("");
const hydrating = ref(false);
let modelRequestToken = 0;

const providerOptions = computed(() => [
  { value: "openai" as const, label: "OpenAI" },
  { value: "gemini" as const, label: "Gemini" },
  { value: "claude" as const, label: "Claude" },
  { value: "grok" as const, label: "Grok" },
  { value: "deepseek" as const, label: "DeepSeek" },
  { value: "kimi" as const, label: "Kimi" },
  { value: "openai-compatible" as const, label: "OpenAI Compatible" },
  { value: "custom" as const, label: props.t("ai.settings.customProvider") },
]);

const isOfficialProvider = computed(() =>
  OFFICIAL_PROVIDER_IDS.has(localProviderId.value),
);
const showCustomProviderName = computed(() => localProviderId.value === "custom");
const baseUrlReadonly = computed(() => isOfficialProvider.value);
const hasAvailableApiKey = computed(
  () => localApiKey.value.trim().length > 0 || Boolean(props.settings?.apiKeySet),
);
const needsCustomBaseUrl = computed(
  () => !isOfficialProvider.value && localBaseUrl.value.trim().length === 0,
);
const needsCustomProviderName = computed(
  () =>
    showCustomProviderName.value && localCustomProviderName.value.trim().length === 0,
);
const canRefreshModels = computed(
  () =>
    !props.loading &&
    !modelLoading.value &&
    hasAvailableApiKey.value &&
    (isOfficialProvider.value || localBaseUrl.value.trim().length > 0),
);
const canSave = computed(() => {
  if (props.loading) return false;
  if (!localEnabled.value) return true;
  if (!hasAvailableApiKey.value) return false;
  if (!localModel.value.trim()) return false;
  if (needsCustomBaseUrl.value) return false;
  if (needsCustomProviderName.value) return false;
  return true;
});
const canTest = computed(() => {
  if (props.loading) return false;
  if (!hasAvailableApiKey.value) return false;
  if (!localModel.value.trim()) return false;
  if (needsCustomBaseUrl.value) return false;
  if (needsCustomProviderName.value) return false;
  return true;
});
const statusTime = computed(() =>
  props.settings?.lastTestAt ? new Date(props.settings.lastTestAt).toLocaleString() : "-",
);
const modelSourceText = computed(() =>
  props.t(
    modelSource.value === "remote"
      ? "ai.settings.modelsRemote"
      : "ai.settings.modelsBuiltin",
  ),
);
const modelHintText = computed(() => {
  if (showCustomProviderName.value) {
    return props.t("ai.settings.modelsHintCustom");
  }
  if (!hasAvailableApiKey.value) {
    return props.t("ai.settings.modelsHintNeedKey");
  }
  return modelSourceText.value;
});

function buildPayload() {
  return buildAiSettingsPayload({
    providerId: localProviderId.value,
    customProviderName: localCustomProviderName.value,
    baseUrl: localBaseUrl.value,
    apiKey: localApiKey.value,
    model: localModel.value,
    enabled: localEnabled.value,
  });
}

async function loadModelOptions(useRemote: boolean) {
  const requestToken = ++modelRequestToken;
  if (useRemote) {
    modelLoading.value = true;
  }
  modelError.value = "";

  try {
    const payload = buildPayload();
    const result = await fetchAiSettingsModels({
      provider: payload.provider,
      customProviderName: payload.customProviderName,
      baseUrl: payload.baseUrl,
      apiKey: useRemote ? payload.apiKey : undefined,
    });
    if (requestToken !== modelRequestToken) return;

    localBaseUrl.value = result.baseUrl;
    modelSource.value = result.source;
    modelOptions.value = mergeAiModelOptions(localModel.value, result.models);
    if (!localModel.value.trim() && modelOptions.value[0]) {
      localModel.value = modelOptions.value[0].id;
    }
  } catch (error) {
    if (requestToken !== modelRequestToken) return;
    modelError.value = error instanceof Error ? error.message : String(error);
    modelOptions.value = mergeAiModelOptions(localModel.value, []);
  } finally {
    if (requestToken === modelRequestToken && useRemote) {
      modelLoading.value = false;
    }
  }
}

async function resetFormFromSettings() {
  hydrating.value = true;
  const settings = props.settings;
  localProviderId.value = resolveAiSettingsProviderId(settings);
  localCustomProviderName.value = settings?.customProviderName ?? "";
  localBaseUrl.value = settings?.baseUrl ?? "";
  localModel.value = settings?.model ?? "";
  localEnabled.value = Boolean(settings?.enabled);
  localApiKey.value = "";
  modelOptions.value = [];
  modelSource.value = "builtin";
  modelError.value = "";
  hydrating.value = false;
  await loadModelOptions(false);
}

function handleSave() {
  if (!canSave.value) return;
  emit("save", buildPayload());
}

function handleTest() {
  if (!canTest.value) return;
  emit("test", buildPayload());
}

watch(
  () => [props.open, props.settings] as const,
  () => {
    void resetFormFromSettings();
  },
  { immediate: true },
);

watch(
  () => localProviderId.value,
  (next, previous) => {
    if (hydrating.value) return;
    if (next === previous) return;

    modelError.value = "";
    modelOptions.value = [];
    modelSource.value = "builtin";
    localModel.value = "";

    if (next !== "custom") {
      localCustomProviderName.value = "";
    }
    if (!OFFICIAL_PROVIDER_IDS.has(next)) {
      localBaseUrl.value = "";
    }

    void loadModelOptions(false);
  },
);
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
            <Select v-model="localProviderId" :disabled="loading || modelLoading">
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

          <label v-if="showCustomProviderName" class="space-y-1.5">
            <span class="text-xs text-muted-foreground">
              {{ t("ai.settings.customProviderName") }}
            </span>
            <Input
              v-model="localCustomProviderName"
              :disabled="loading"
              :placeholder="t('ai.settings.customProviderNamePlaceholder')"
            />
          </label>

          <label class="space-y-1.5" :class="{ 'sm:col-span-2': !showCustomProviderName }">
            <span class="text-xs text-muted-foreground">{{ t("ai.settings.baseUrl") }}</span>
            <Input
              v-model="localBaseUrl"
              :disabled="loading || baseUrlReadonly"
              :placeholder="t('ai.settings.baseUrlPlaceholder')"
            />
            <p v-if="baseUrlReadonly" class="text-[11px] text-muted-foreground">
              {{ t("ai.settings.baseUrlAuto") }}
            </p>
          </label>

          <label class="space-y-1.5 sm:col-span-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-xs text-muted-foreground">{{ t("ai.settings.model") }}</span>
              <Button
                variant="outline"
                size="sm"
                :disabled="!canRefreshModels"
                @click="loadModelOptions(true)"
              >
                <RefreshCcw class="h-3.5 w-3.5" />
                {{ t("ai.settings.refreshModels") }}
              </Button>
            </div>

            <Select v-model="localModel" :disabled="loading || modelLoading || modelOptions.length === 0">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="t('ai.settings.modelsEmpty')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="model in modelOptions"
                  :key="model.id"
                  :value="model.id"
                >
                  {{ model.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <p class="text-[11px] text-muted-foreground">
              {{ modelHintText }}
            </p>
            <p v-if="modelError" class="text-[11px] text-amber-600 dark:text-amber-400">
              {{ modelError }}
            </p>
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
        </div>
      </section>

      <DialogFooter class="flex flex-wrap justify-between gap-2">
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" :disabled="loading" @click="emit('reload')">
            <RefreshCcw class="h-3.5 w-3.5" />
            {{ t("ai.settings.reload") }}
          </Button>
          <Button variant="outline" :disabled="!canTest" @click="handleTest">
            <TestTubeDiagonal class="h-3.5 w-3.5" />
            {{ t("ai.settings.test") }}
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
