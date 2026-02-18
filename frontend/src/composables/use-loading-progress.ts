import { onUnmounted, ref, watch, type Ref } from "vue";

export function useLoadingProgress(isBusy: Readonly<Ref<boolean>>) {
  const progressValue = ref(0);
  let progressTimer: number | null = null;

  watch(
    isBusy,
    (busy) => {
      if (busy) {
        progressValue.value = Math.max(15, progressValue.value);
        if (progressTimer !== null) window.clearInterval(progressTimer);
        progressTimer = window.setInterval(() => {
          progressValue.value = Math.min(
            90,
            progressValue.value + Math.random() * 6 + 2
          );
        }, 140);
        return;
      }

      if (progressTimer !== null) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }

      progressValue.value = 100;
      window.setTimeout(() => (progressValue.value = 0), 240);
    },
    { immediate: true }
  );

  onUnmounted(() => {
    if (progressTimer !== null) window.clearInterval(progressTimer);
  });

  return progressValue;
}
