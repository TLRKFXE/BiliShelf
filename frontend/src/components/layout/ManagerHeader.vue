<script setup lang="ts">
import { CirclePlay, Moon, Sun } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const props = defineProps<{
  t: (key: string, vars?: Record<string, string | number>) => string;
  trashMode: boolean;
  currentViewLabel: string;
  currentScopeLabel: string;
  localeToggleText: string;
  isDark: boolean;
  progressValue: number;
}>();

const emit = defineEmits<{
  openTags: [];
  toggleTrash: [];
  toggleLocale: [];
  toggleTheme: [];
}>();
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
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{{ props.currentViewLabel }}</Badge>
        <Badge
          v-if="!props.trashMode"
          variant="outline"
          class="max-w-[260px] truncate"
        >
          {{ props.currentScopeLabel }}
        </Badge>
        <Button
          v-if="!props.trashMode"
          size="sm"
          variant="outline"
          @click="emit('openTags')"
        >
          {{ props.t("header.manageTags") }}
        </Button>
        <Button
          size="sm"
          :variant="props.trashMode ? 'default' : 'outline'"
          @click="emit('toggleTrash')"
        >
          {{
            props.trashMode
              ? props.t("header.backManager")
              : props.t("header.openTrash")
          }}
        </Button>
        <Button size="sm" variant="outline" @click="emit('toggleLocale')">
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
          @click="emit('toggleTheme')"
        >
          <Transition name="theme-icon" mode="out-in">
            <Sun v-if="props.isDark" key="sun" class="h-4 w-4" />
            <Moon v-else key="moon" class="h-4 w-4" />
          </Transition>
        </Button>
      </div>
    </div>
    <div v-if="props.progressValue > 0" class="mt-3">
      <Progress :model-value="props.progressValue" />
    </div>
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
