<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { useVModel } from "@vueuse/core"
import { cn } from "@/lib/utils"

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes["class"]
}>()

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void
}>()

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input
    v-model="modelValue"
    :class="cn(
      'flex h-10 w-full rounded-lg border border-input/90 bg-background/90 px-3 py-2 text-sm ring-offset-background shadow-[0_1px_0_hsl(0_0%_100%/0.55),0_6px_14px_-12px_hsl(var(--foreground)/0.42)] transition-all duration-200 ease-out file:border-0 file:bg-transparent file:text-foreground file:text-sm file:font-medium placeholder:text-muted-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:shadow-[0_1px_0_hsl(0_0%_100%/0.62),0_10px_24px_-14px_hsl(var(--ring)/0.55)] disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  >
</template>
