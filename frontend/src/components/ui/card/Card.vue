<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    :class="
      cn(
        'rounded-xl border bg-card/95 text-card-foreground shadow-[0_12px_24px_-18px_hsl(var(--surface-shadow)/0.6)] transition-all duration-200 ease-out hover:shadow-[0_18px_34px_-20px_hsl(var(--surface-shadow)/0.62)]',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
