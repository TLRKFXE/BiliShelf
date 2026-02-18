import { useToast } from "vue-toastification";

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function normalizeErrorMessage(message: string) {
  if (!message) return "";

  const tryParse = (text: string) => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  };

  const parsed = tryParse(message.trim());
  if (!parsed) return message;

  if (Array.isArray(parsed)) {
    const rows = parsed
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return "";
        const row = item as {
          message?: string;
          path?: string[];
          validation?: string;
        };
        const field =
          Array.isArray(row.path) && row.path.length > 0
            ? row.path.join(".")
            : row.validation ?? "";
        if (!row.message) return field;
        return field ? `${field}: ${row.message}` : row.message;
      })
      .filter(Boolean);
    return rows.join(" | ");
  }

  if (parsed && typeof parsed === "object") {
    const row = parsed as { message?: string | string[] };
    if (Array.isArray(row.message)) return row.message.join(" | ");
    if (typeof row.message === "string") return row.message;
  }

  return message;
}

export function useAppToast(t: TranslateFn) {
  const toast = useToast();

  function notifySuccess(title: string, description?: string) {
    const content = description ? `${title}\n${description}` : title;
    toast.success(content, {
      timeout: 2400,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      hideProgressBar: false,
      ...(description ? { icon: "✅" } : {}),
    });
  }

  function notifyError(
    title: string,
    error?: unknown,
    fallback = t("common.requestFailed")
  ) {
    const rawMessage =
      typeof error === "string"
        ? error
        : error instanceof Error
          ? error.message
          : "";
    const description = rawMessage
      ? normalizeErrorMessage(rawMessage) || fallback
      : fallback;
    const content = description ? `${title}\n${description}` : title;
    toast.error(content, {
      timeout: 3600,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      hideProgressBar: false,
      icon: "⚠️",
    });
  }

  return {
    notifySuccess,
    notifyError,
  };
}
