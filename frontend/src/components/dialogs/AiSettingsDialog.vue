<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  Bot,
  ExternalLink,
  Github,
  Info,
  Languages,
  LayoutGrid,
  Moon,
  RefreshCcw,
  RadioTower,
  Settings,
  Sun,
  Tags,
  TestTubeDiagonal,
  Timer,
  Unplug,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchAiSettingsModels } from "@/lib/api";
import type {
  BidirectionalSyncSettings,
  ExtensionUpdateStatus,
  TagEnrichmentSettings,
} from "@/lib/api";
import {
  buildAiSettingsPayload,
  mergeAiModelOptions,
  resolveAiSettingsProviderId,
  type AiSettingsProviderId,
} from "@/lib/ai-settings-form.js";
import type { AiSettings, AiSettingsModelOption } from "@/types";
import {
  VIDEO_CARD_WIDTH_MAX,
  VIDEO_CARD_WIDTH_MIN,
  type Locale,
} from "@/stores/app-ui";

type SettingsSection =
  | "ai"
  | "listener"
  | "tags"
  | "language"
  | "theme"
  | "cards"
  | "about";

const props = defineProps<{
  open: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loading: boolean;
  settings: AiSettings | null;
  section?: SettingsSection;
  listenerLoading: boolean;
  listenerSettings: BidirectionalSyncSettings | null;
  tagEnrichmentLoading: boolean;
  tagEnrichmentSettings: TagEnrichmentSettings | null;
  showAi: boolean;
  showListener: boolean;
  showTagEnrichment: boolean;
  locale: Locale;
  isDark: boolean;
  videoCardWidth: number;
  commentCardWidth: number;
  articleCardWidth: number;
  updateStatus: ExtensionUpdateStatus | null;
  updateLoading: boolean;
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
  "update:section": [value: SettingsSection];
  saveListener: [payload: { biliToLocalEnabled: boolean }];
  reloadListener: [];
  saveTagEnrichment: [payload: { batchSize: number; intervalSeconds: number }];
  setLocale: [value: Locale];
  setTheme: [value: "light" | "dark"];
  setVideoCardWidth: [value: number];
  setCommentCardWidth: [value: number];
  setArticleCardWidth: [value: number];
  checkUpdate: [];
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
const activeSection = ref<SettingsSection>(props.section ?? "ai");
const localBiliToLocalEnabled = ref(false);
const localTagBatchSize = ref(
  String(props.tagEnrichmentSettings?.batchSize ?? 5),
);
const localTagIntervalSeconds = ref(
  String(props.tagEnrichmentSettings?.intervalSeconds ?? 20),
);
const localVideoCardWidth = ref(String(props.videoCardWidth));
const localCommentCardWidth = ref(String(props.commentCardWidth));
const localArticleCardWidth = ref(String(props.articleCardWidth));
let modelRequestToken = 0;
const FALLBACK_GITHUB_URL = "https://github.com/TLRKFXE/BiliShelf";
const FALLBACK_GITHUB_RELEASES_URL = `${FALLBACK_GITHUB_URL}/releases`;

const updateActionUrl = computed(
  () =>
    props.updateStatus?.preferredUrl ||
    props.updateStatus?.releasesUrl ||
    FALLBACK_GITHUB_RELEASES_URL,
);
const githubUpdateUrl = computed(
  () =>
    props.updateStatus?.githubUrl ||
    props.updateStatus?.releasesUrl ||
    FALLBACK_GITHUB_RELEASES_URL,
);
const updateCheckedLabel = computed(() => {
  const timestamp = props.updateStatus?.checkedAt;
  return timestamp ? new Date(timestamp).toLocaleString() : "-";
});

const sponsorHearts = ref<Array<{ id: number; x: number; delay: number }>>([]);
let sponsorHeartSequence = 0;

function celebrateSponsor() {
  const burst = [-24, -12, 0, 13, 25].map((x, index) => ({
    id: ++sponsorHeartSequence,
    x,
    delay: index * 35,
  }));
  sponsorHearts.value = [...sponsorHearts.value, ...burst];
  window.setTimeout(() => {
    const activeIds = new Set(burst.map((heart) => heart.id));
    sponsorHearts.value = sponsorHearts.value.filter(
      (heart) => !activeIds.has(heart.id),
    );
  }, 1_400);
}

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
const showCustomProviderName = computed(
  () => localProviderId.value === "custom",
);
const baseUrlReadonly = computed(() => isOfficialProvider.value);
const hasAvailableApiKey = computed(
  () =>
    localApiKey.value.trim().length > 0 || Boolean(props.settings?.apiKeySet),
);
const needsCustomBaseUrl = computed(
  () => !isOfficialProvider.value && localBaseUrl.value.trim().length === 0,
);
const needsCustomProviderName = computed(
  () =>
    showCustomProviderName.value &&
    localCustomProviderName.value.trim().length === 0,
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
  props.settings?.lastTestAt
    ? new Date(props.settings.lastTestAt).toLocaleString()
    : "-",
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

function updateSection(value: string | number) {
  const next = String(value) as SettingsSection;
  activeSection.value = next;
  emit("update:section", next);
}

function saveListenerSettings() {
  if (props.listenerLoading) return;
  emit("saveListener", {
    biliToLocalEnabled: localBiliToLocalEnabled.value,
  });
}

function commitVideoCardWidth() {
  const normalized = normalizeLocalCardWidth(
    localVideoCardWidth.value,
    props.videoCardWidth,
  );
  localVideoCardWidth.value = normalized;
  emit("setVideoCardWidth", Number(normalized));
}

function normalizeBoundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function saveTagEnrichmentSettings() {
  if (props.tagEnrichmentLoading) return;
  const settings = props.tagEnrichmentSettings;
  const batchSize = normalizeBoundedInteger(
    localTagBatchSize.value,
    settings?.batchSize ?? 5,
    settings?.batchSizeMin ?? 1,
    settings?.batchSizeMax ?? 10,
  );
  const intervalSeconds = normalizeBoundedInteger(
    localTagIntervalSeconds.value,
    settings?.intervalSeconds ?? 20,
    settings?.intervalSecondsMin ?? 20,
    settings?.intervalSecondsMax ?? 300,
  );
  localTagBatchSize.value = String(batchSize);
  localTagIntervalSeconds.value = String(intervalSeconds);
  emit("saveTagEnrichment", { batchSize, intervalSeconds });
}

function normalizeLocalCardWidth(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return String(fallback);
  return String(
    Math.min(VIDEO_CARD_WIDTH_MAX, Math.max(VIDEO_CARD_WIDTH_MIN, parsed)),
  );
}

function commitCommentCardWidth() {
  const normalized = normalizeLocalCardWidth(
    localCommentCardWidth.value,
    props.commentCardWidth,
  );
  localCommentCardWidth.value = normalized;
  emit("setCommentCardWidth", Number(normalized));
}

function commitArticleCardWidth() {
  const normalized = normalizeLocalCardWidth(
    localArticleCardWidth.value,
    props.articleCardWidth,
  );
  localArticleCardWidth.value = normalized;
  emit("setArticleCardWidth", Number(normalized));
}

watch(
  () => [props.open, props.settings] as const,
  ([open]) => {
    if (!open || !props.showAi) return;
    void resetFormFromSettings();
  },
  { immediate: true },
);

watch(
  () => [props.open, props.section] as const,
  ([open, section]) => {
    if (!open) return;
    activeSection.value = section ?? (props.showAi ? "ai" : "listener");
  },
  { immediate: true },
);

watch(
  () => [props.open, props.listenerSettings] as const,
  () => {
    localBiliToLocalEnabled.value = Boolean(
      props.listenerSettings?.biliToLocalEnabled,
    );
  },
  { immediate: true },
);

watch(
  () => [props.open, props.tagEnrichmentSettings] as const,
  ([open, settings]) => {
    if (!open || !settings) return;
    localTagBatchSize.value = String(settings.batchSize);
    localTagIntervalSeconds.value = String(settings.intervalSeconds);
  },
  { immediate: true },
);

watch(
  () => props.videoCardWidth,
  (value) => {
    localVideoCardWidth.value = String(value);
  },
  { immediate: true },
);

watch(
  () => props.commentCardWidth,
  (value) => {
    localCommentCardWidth.value = String(value);
  },
  { immediate: true },
);

watch(
  () => props.articleCardWidth,
  (value) => {
    localArticleCardWidth.value = String(value);
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
    <DialogContent
      class="top-[6dvh] max-h-[88dvh] max-w-4xl translate-y-0 overflow-y-auto"
    >
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"
          >
            <Settings class="h-4.5 w-4.5" />
          </span>
          {{ t("settings.title") }}
        </DialogTitle>
      </DialogHeader>

      <Tabs :model-value="activeSection" @update:model-value="updateSection">
        <TabsList
          class="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-7"
        >
          <TabsTrigger v-if="showAi" value="ai" class="gap-1.5 py-2.5">
            <Bot class="h-3.5 w-3.5" />
            {{ t("settings.ai") }}
          </TabsTrigger>
          <TabsTrigger
            v-if="showListener"
            value="listener"
            class="gap-1.5 py-2.5"
          >
            <RadioTower class="h-3.5 w-3.5" />
            {{ t("settings.listener") }}
          </TabsTrigger>
          <TabsTrigger
            v-if="showTagEnrichment"
            value="tags"
            class="gap-1.5 py-2.5"
          >
            <Tags class="h-3.5 w-3.5" />
            {{ t("settings.tagEnrichment") }}
          </TabsTrigger>
          <TabsTrigger value="language" class="gap-1.5 py-2.5">
            <Languages class="h-3.5 w-3.5" />
            {{ t("settings.language") }}
          </TabsTrigger>
          <TabsTrigger value="theme" class="gap-1.5 py-2.5">
            <Moon class="h-3.5 w-3.5" />
            {{ t("settings.theme") }}
          </TabsTrigger>
          <TabsTrigger value="cards" class="gap-1.5 py-2.5">
            <LayoutGrid class="h-3.5 w-3.5" />
            {{ t("settings.cardSize") }}
          </TabsTrigger>
          <TabsTrigger value="about" class="gap-1.5 py-2.5">
            <Info class="h-3.5 w-3.5" />
            {{ t("settings.about") }}
          </TabsTrigger>
        </TabsList>

        <TabsContent v-if="showAi" value="ai" class="mt-4 space-y-4">
          <label
            class="panel-surface flex items-start gap-3 rounded-lg border p-3.5"
          >
            <Checkbox
              :model-value="localEnabled"
              :disabled="loading"
              class="mt-0.5"
              @update:model-value="localEnabled = $event === true"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium">
                {{ t("ai.settings.enableTitle") }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ t("ai.settings.enableDesc") }}
              </p>
            </div>
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1.5">
              <span class="text-xs text-muted-foreground">{{
                t("ai.settings.provider")
              }}</span>
              <Select
                v-model="localProviderId"
                :disabled="loading || modelLoading"
              >
                <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
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
              <span class="text-xs text-muted-foreground">{{
                t("ai.settings.customProviderName")
              }}</span>
              <Input
                v-model="localCustomProviderName"
                :disabled="loading"
                :placeholder="t('ai.settings.customProviderNamePlaceholder')"
              />
            </label>

            <label
              class="space-y-1.5"
              :class="{ 'sm:col-span-2': !showCustomProviderName }"
            >
              <span class="text-xs text-muted-foreground">{{
                t("ai.settings.baseUrl")
              }}</span>
              <Input
                v-model="localBaseUrl"
                :disabled="loading || baseUrlReadonly"
                :placeholder="t('ai.settings.baseUrlPlaceholder')"
              />
              <p
                v-if="baseUrlReadonly"
                class="text-[11px] text-muted-foreground"
              >
                {{ t("ai.settings.baseUrlAuto") }}
              </p>
            </label>

            <label class="space-y-1.5 sm:col-span-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-xs text-muted-foreground">{{
                  t("ai.settings.model")
                }}</span>
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
              <Select
                v-model="localModel"
                :disabled="loading || modelLoading || modelOptions.length === 0"
              >
                <SelectTrigger class="w-full"
                  ><SelectValue :placeholder="t('ai.settings.modelsEmpty')"
                /></SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="model in modelOptions"
                    :key="model.id"
                    :value="model.id"
                    >{{ model.label }}</SelectItem
                  >
                </SelectContent>
              </Select>
              <p class="text-[11px] text-muted-foreground">
                {{ modelHintText }}
              </p>
              <p
                v-if="modelError"
                class="text-[11px] text-amber-600 dark:text-amber-400"
              >
                {{ modelError }}
              </p>
            </label>

            <label class="space-y-1.5 sm:col-span-2">
              <span class="text-xs text-muted-foreground">{{
                t("ai.settings.apiKey")
              }}</span>
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

          <div
            class="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground"
          >
            <p>{{ t("ai.settings.statusTest", { time: statusTime }) }}</p>
            <p
              v-if="settings?.lastError"
              class="mt-1 flex items-start gap-1 text-amber-600 dark:text-amber-400"
            >
              <Unplug class="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{{ settings.lastError }}</span>
            </p>
          </div>

          <div class="flex flex-wrap justify-between gap-2 border-t pt-4">
            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                :disabled="loading"
                @click="emit('reload')"
              >
                <RefreshCcw class="h-3.5 w-3.5" />
                {{ t("ai.settings.reload") }}
              </Button>
              <Button
                variant="outline"
                :disabled="!canTest"
                @click="handleTest"
              >
                <TestTubeDiagonal class="h-3.5 w-3.5" />
                {{ t("ai.settings.test") }}
              </Button>
            </div>
            <Button :disabled="!canSave" @click="handleSave">{{
              t("settings.saveAi")
            }}</Button>
          </div>
        </TabsContent>

        <TabsContent
          v-if="showListener"
          value="listener"
          class="mt-4 space-y-4"
        >
          <label
            class="panel-surface flex items-start gap-3 rounded-lg border p-4"
          >
            <Checkbox
              :model-value="localBiliToLocalEnabled"
              :disabled="listenerLoading"
              class="mt-0.5"
              @update:model-value="localBiliToLocalEnabled = $event === true"
            />
            <div class="min-w-0">
              <p class="text-sm font-medium">
                {{ t("sync.settings.biliToLocalTitle") }}
              </p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">
                {{ t("sync.settings.biliToLocalDesc") }}
              </p>
            </div>
          </label>
          <div class="flex flex-wrap justify-end gap-2 border-t pt-4">
            <Button
              variant="outline"
              :disabled="listenerLoading"
              @click="emit('reloadListener')"
            >
              <RefreshCcw class="h-3.5 w-3.5" />
              {{ t("sync.settings.reload") }}
            </Button>
            <Button :disabled="listenerLoading" @click="saveListenerSettings">{{
              t("settings.saveListener")
            }}</Button>
          </div>
        </TabsContent>

        <TabsContent v-if="showTagEnrichment" value="tags" class="mt-4">
          <section class="panel-surface space-y-4 rounded-lg border p-4">
            <div class="flex items-start gap-3">
              <span
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground"
              >
                <Timer class="h-4 w-4" />
              </span>
              <div>
                <p class="text-sm font-medium">
                  {{ t("settings.tagEnrichmentTitle") }}
                </p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                  {{ t("settings.tagEnrichmentDescription") }}
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="space-y-1.5">
                <span class="text-xs text-muted-foreground">{{
                  t("settings.tagBatchSize")
                }}</span>
                <Input
                  v-model="localTagBatchSize"
                  type="number"
                  inputmode="numeric"
                  :min="tagEnrichmentSettings?.batchSizeMin ?? 1"
                  :max="tagEnrichmentSettings?.batchSizeMax ?? 10"
                  step="1"
                  class="tabular-nums"
                  :disabled="tagEnrichmentLoading"
                />
              </label>
              <label class="space-y-1.5">
                <span class="text-xs text-muted-foreground">{{
                  t("settings.tagInterval")
                }}</span>
                <div class="flex items-center gap-2">
                  <Input
                    v-model="localTagIntervalSeconds"
                    type="number"
                    inputmode="numeric"
                    :min="tagEnrichmentSettings?.intervalSecondsMin ?? 20"
                    :max="tagEnrichmentSettings?.intervalSecondsMax ?? 300"
                    step="1"
                    class="tabular-nums"
                    :disabled="tagEnrichmentLoading"
                  />
                  <span class="shrink-0 text-sm text-muted-foreground">s</span>
                </div>
              </label>
            </div>

            <p class="text-[11px] leading-5 text-muted-foreground">
              {{
                t("settings.tagEnrichmentLimits", {
                  batchMin: tagEnrichmentSettings?.batchSizeMin ?? 1,
                  batchMax: tagEnrichmentSettings?.batchSizeMax ?? 10,
                  intervalMin: tagEnrichmentSettings?.intervalSecondsMin ?? 20,
                  intervalMax: tagEnrichmentSettings?.intervalSecondsMax ?? 300,
                })
              }}
            </p>
            <div class="flex justify-end border-t pt-4">
              <Button
                :disabled="tagEnrichmentLoading"
                @click="saveTagEnrichmentSettings"
              >
                {{ t("settings.saveTagEnrichment") }}
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="language" class="mt-4">
          <section class="panel-surface space-y-3 rounded-lg border p-4">
            <p class="text-sm font-medium">{{ t("settings.languageTitle") }}</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <Button
                :variant="locale === 'zh-CN' ? 'default' : 'outline'"
                class="justify-start"
                @click="emit('setLocale', 'zh-CN')"
              >
                <Languages class="h-4 w-4" /> 简体中文
              </Button>
              <Button
                :variant="locale === 'en-US' ? 'default' : 'outline'"
                class="justify-start"
                @click="emit('setLocale', 'en-US')"
              >
                <Languages class="h-4 w-4" /> English
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="theme" class="mt-4">
          <section class="panel-surface space-y-3 rounded-lg border p-4">
            <p class="text-sm font-medium">{{ t("settings.themeTitle") }}</p>
            <div class="grid gap-2 sm:grid-cols-2">
              <Button
                :variant="!isDark ? 'default' : 'outline'"
                class="justify-start"
                @click="emit('setTheme', 'light')"
              >
                <Sun class="h-4 w-4" /> {{ t("settings.light") }}
              </Button>
              <Button
                :variant="isDark ? 'default' : 'outline'"
                class="justify-start"
                @click="emit('setTheme', 'dark')"
              >
                <Moon class="h-4 w-4" /> {{ t("settings.dark") }}
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="cards" class="mt-4">
          <section class="panel-surface space-y-4 rounded-lg border p-4">
            <div>
              <p class="text-sm font-medium">
                {{ t("settings.cardSizeTitle") }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ t("settings.cardSizeDescription") }}
              </p>
            </div>
            <div class="grid gap-3 sm:grid-cols-3">
              <label class="space-y-1.5">
                <span class="text-xs text-muted-foreground">{{
                  t("video.cardSize")
                }}</span>
                <div class="flex items-center gap-2">
                  <Input
                    v-model="localVideoCardWidth"
                    type="number"
                    inputmode="numeric"
                    :min="VIDEO_CARD_WIDTH_MIN"
                    :max="VIDEO_CARD_WIDTH_MAX"
                    step="1"
                    class="tabular-nums"
                    @keydown.enter.prevent="commitVideoCardWidth"
                    @blur="commitVideoCardWidth"
                  />
                  <span class="shrink-0 text-sm text-muted-foreground">px</span>
                </div>
                <Button
                  class="w-full"
                  size="sm"
                  @click="commitVideoCardWidth"
                  >{{ t("common.apply") }}</Button
                >
              </label>
              <label class="space-y-1.5">
                <span class="text-xs text-muted-foreground">{{
                  t("comments.cardSize")
                }}</span>
                <div class="flex items-center gap-2">
                  <Input
                    v-model="localCommentCardWidth"
                    type="number"
                    inputmode="numeric"
                    :min="VIDEO_CARD_WIDTH_MIN"
                    :max="VIDEO_CARD_WIDTH_MAX"
                    step="1"
                    class="tabular-nums"
                    @keydown.enter.prevent="commitCommentCardWidth"
                    @blur="commitCommentCardWidth"
                  />
                  <span class="shrink-0 text-sm text-muted-foreground">px</span>
                </div>
                <Button
                  class="w-full"
                  size="sm"
                  @click="commitCommentCardWidth"
                  >{{ t("common.apply") }}</Button
                >
              </label>
              <label class="space-y-1.5">
                <span class="text-xs text-muted-foreground">{{
                  t("articles.cardSize")
                }}</span>
                <div class="flex items-center gap-2">
                  <Input
                    v-model="localArticleCardWidth"
                    type="number"
                    inputmode="numeric"
                    :min="VIDEO_CARD_WIDTH_MIN"
                    :max="VIDEO_CARD_WIDTH_MAX"
                    step="1"
                    class="tabular-nums"
                    @keydown.enter.prevent="commitArticleCardWidth"
                    @blur="commitArticleCardWidth"
                  />
                  <span class="shrink-0 text-sm text-muted-foreground">px</span>
                </div>
                <Button
                  class="w-full"
                  size="sm"
                  @click="commitArticleCardWidth"
                  >{{ t("common.apply") }}</Button
                >
              </label>
            </div>
            <p class="text-[11px] text-muted-foreground">
              {{
                t("settings.cardSizeHint", {
                  min: VIDEO_CARD_WIDTH_MIN,
                  max: VIDEO_CARD_WIDTH_MAX,
                })
              }}
            </p>
          </section>
        </TabsContent>

        <TabsContent value="about" class="mt-4">
          <section class="panel-surface space-y-4 rounded-lg border p-4">
            <div class="flex items-start gap-3">
              <span
                class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground"
              >
                <Info class="h-4 w-4" />
              </span>
              <div class="min-w-0">
                <p class="text-sm font-medium">
                  {{ t("settings.aboutTitle") }}
                </p>
                <p class="mt-1 text-xs leading-5 text-muted-foreground">
                  {{ t("settings.aboutDescription") }}
                </p>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div class="rounded-md border bg-muted/20 p-3">
                <p class="text-xs text-muted-foreground">
                  {{ t("settings.currentVersion") }}
                </p>
                <p class="mt-1 text-sm font-semibold tabular-nums">
                  {{ updateStatus?.currentVersion || "-" }}
                </p>
              </div>
              <div class="rounded-md border bg-muted/20 p-3">
                <p class="text-xs text-muted-foreground">
                  {{ t("settings.updateChannel") }}
                </p>
                <p class="mt-1 text-sm font-semibold">
                  {{
                    t(`settings.channel.${updateStatus?.channel || "chrome"}`)
                  }}
                </p>
              </div>
              <div class="rounded-md border bg-muted/20 p-3">
                <p class="text-xs text-muted-foreground">
                  {{ t("settings.storeVersion") }}
                </p>
                <p class="mt-1 text-sm font-semibold tabular-nums">
                  {{ updateStatus?.storeVersion || t("settings.notPublished") }}
                </p>
              </div>
              <div class="rounded-md border bg-muted/20 p-3">
                <p class="text-xs text-muted-foreground">
                  {{ t("settings.githubVersion") }}
                </p>
                <p class="mt-1 text-sm font-semibold">
                  {{
                    updateStatus?.githubLabel ||
                    updateStatus?.githubVersion ||
                    "-"
                  }}
                </p>
              </div>
            </div>

            <section class="space-y-2 border-t pt-4">
              <p class="text-xs font-medium">
                {{ t("settings.sponsorThanks") }}
              </p>
              <p class="text-xs leading-5 text-muted-foreground">
                {{ t("settings.sponsorThanksDescription") }}
              </p>
              <ul
                class="flex flex-wrap gap-2"
                :aria-label="t('settings.sponsorThanks')"
              >
                <li class="relative">
                  <button
                    type="button"
                    class="rounded-md border bg-muted/20 px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
                    @click="celebrateSponsor"
                  >
                    沫*o
                  </button>
                  <span
                    v-for="heart in sponsorHearts"
                    :key="heart.id"
                    class="sponsor-heart"
                    aria-hidden="true"
                    :style="{
                      left: `calc(50% + ${heart.x}px)`,
                      animationDelay: `${heart.delay}ms`,
                    }"
                    >💖</span
                  >
                </li>
              </ul>
            </section>

            <div
              v-if="updateStatus?.updateAvailable"
              class="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{
                  t("settings.updateAvailable", {
                    version: updateStatus.latestLabel,
                  })
                }}</span>
                <Badge
                  v-if="updateStatus.storeUpdateAvailable"
                  variant="secondary"
                  >{{ t("settings.storeReady") }}</Badge
                >
                <Badge
                  v-else-if="updateStatus.storePending"
                  variant="outline"
                  >{{ t("settings.storePending") }}</Badge
                >
              </div>
              <p
                v-if="updateStatus.storePending"
                class="mt-1 text-xs text-muted-foreground"
              >
                {{ t("settings.storePendingDescription") }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <Button as-child size="sm">
                  <a
                    :href="updateActionUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink class="h-3.5 w-3.5" />
                    {{
                      updateStatus.preferredSource === "store"
                        ? t("settings.openStore")
                        : t("settings.openGithubRelease")
                    }}
                  </a>
                </Button>
                <Button
                  v-if="
                    updateStatus.preferredSource === 'store' &&
                    updateStatus.githubUpdateAvailable
                  "
                  as-child
                  size="sm"
                  variant="outline"
                >
                  <a
                    :href="githubUpdateUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github class="h-3.5 w-3.5" />
                    {{ t("settings.openGithubRelease") }}
                  </a>
                </Button>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 border-t pt-4">
              <Button
                size="sm"
                :disabled="updateLoading"
                @click="emit('checkUpdate')"
              >
                <RefreshCcw class="h-3.5 w-3.5" />
                {{ t("settings.checkUpdate") }}
              </Button>
              <Button as-child size="sm" variant="outline">
                <a
                  :href="
                    updateStatus?.storeUrl ||
                    updateStatus?.releasesUrl ||
                    FALLBACK_GITHUB_RELEASES_URL
                  "
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink class="h-3.5 w-3.5" />
                  {{
                    updateStatus?.storeUrl
                      ? t("settings.openStore")
                      : t("settings.openGithubRelease")
                  }}
                </a>
              </Button>
              <Button as-child size="sm" variant="outline">
                <a
                  :href="updateStatus?.repositoryUrl || FALLBACK_GITHUB_URL"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github class="h-3.5 w-3.5" />
                  {{ t("settings.openGithub") }}
                </a>
              </Button>
            </div>
            <p class="text-[11px] text-muted-foreground">
              {{ t("settings.lastChecked", { time: updateCheckedLabel }) }}
            </p>
            <p
              v-if="updateStatus?.lastError"
              class="text-xs text-amber-600 dark:text-amber-400"
            >
              {{
                t("settings.updateCheckFailed", {
                  error: updateStatus.lastError,
                })
              }}
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.sponsor-heart {
  position: absolute;
  bottom: calc(100% + 2px);
  pointer-events: none;
  opacity: 0;
  transform: translateX(-50%);
  animation: sponsor-heart-rise 1.15s ease-out forwards;
}

@keyframes sponsor-heart-rise {
  0% {
    opacity: 0;
    transform: translate(-50%, 8px) scale(0.7);
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -42px) scale(1.05);
  }
}
</style>
