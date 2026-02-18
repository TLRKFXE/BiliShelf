import { watch, type Ref } from "vue";

type UseManageTagsDialogParams = {
  toolsOpen: Ref<boolean>;
  manageCustomTagPage: Ref<number>;
  manageCustomTagTotalPages: Ref<number>;
};

export function useManageTagsDialog(params: UseManageTagsDialogParams) {
  const { toolsOpen, manageCustomTagPage, manageCustomTagTotalPages } = params;

  watch(
    () => manageCustomTagTotalPages.value,
    () => {
      if (manageCustomTagPage.value > manageCustomTagTotalPages.value) {
        manageCustomTagPage.value = manageCustomTagTotalPages.value;
      }
      if (manageCustomTagPage.value < 1) {
        manageCustomTagPage.value = 1;
      }
    },
    { immediate: true }
  );

  watch(toolsOpen, (open) => {
    if (open) manageCustomTagPage.value = 1;
  });

  function prevManageCustomTagPage() {
    if (manageCustomTagPage.value <= 1) return;
    manageCustomTagPage.value -= 1;
  }

  function nextManageCustomTagPage() {
    if (manageCustomTagPage.value >= manageCustomTagTotalPages.value) return;
    manageCustomTagPage.value += 1;
  }

  return {
    prevManageCustomTagPage,
    nextManageCustomTagPage,
  };
}
