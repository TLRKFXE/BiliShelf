import { ref } from "vue";
import { fetchVideoById } from "@/lib/api";
import type { Video } from "@/types";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;
type NotifyErrorFn = (title: string, error?: unknown, fallback?: string) => void;

export type DetailVideo = Video & { folders?: Array<{ id: number; name: string }> };

export function useVideoDetail(t: TranslateFn, notifyError: NotifyErrorFn) {
  const detailOpen = ref(false);
  const detailLoading = ref(false);
  const detailVideo = ref<DetailVideo | null>(null);

  async function openVideoDetail(id: number) {
    detailOpen.value = true;
    detailLoading.value = true;
    detailVideo.value = null;

    try {
      detailVideo.value = await fetchVideoById(id);
    } catch (error) {
      detailOpen.value = false;
      notifyError(t("toast.loadDetailFail"), error);
    } finally {
      detailLoading.value = false;
    }
  }

  return {
    detailOpen,
    detailLoading,
    detailVideo,
    openVideoDetail,
  };
}
