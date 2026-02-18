import { ref, watch } from "vue";

type RenameTarget = {
  name: string;
};

export function useRenameTagDialog<T extends RenameTarget>() {
  const renameTagDialogOpen = ref(false);
  const renameTagValue = ref("");
  const renameTagTarget = ref<T | null>(null);

  function openRenameTagDialog(tag: T) {
    renameTagTarget.value = tag;
    renameTagValue.value = tag.name;
    renameTagDialogOpen.value = true;
  }

  function setRenameDialogOpen(open: boolean) {
    renameTagDialogOpen.value = open;
  }

  watch(renameTagDialogOpen, (open) => {
    if (!open) {
      renameTagTarget.value = null;
      renameTagValue.value = "";
    }
  });

  return {
    renameTagDialogOpen,
    renameTagValue,
    renameTagTarget,
    openRenameTagDialog,
    setRenameDialogOpen,
  };
}
