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

function translateKnownBackendError(raw: string, t: TranslateFn) {
  const message = raw.trim();
  if (!message) return message;

  const isZhLocale = /[\u4e00-\u9fff]/.test(t("common.cancel"));
  if (!isZhLocale) return message;

  const exactMap: Record<string, string> = {
    "Folder name already exists": "收藏夹名称已存在",
    "Tag name already exists": "标签名称已存在",
    "Folder not found": "未找到收藏夹",
    "Video not found": "未找到视频",
    "Tag not found": "未找到标签",
    "At least one folder is required": "至少需要选择一个收藏夹",
    "Video payload is incomplete": "视频信息不完整",
    "Target folder is invalid": "目标收藏夹无效",
    "mode is invalid": "批处理模式无效",
    "mode must be move or copy": "批处理模式必须为移动或复制",
    "folderId is required": "缺少收藏夹参数",
    "Request failed": "请求失败",
    "Internal server error": "服务器内部错误",
  };

  if (exactMap[message]) return exactMap[message];

  if (message.startsWith("Route not found")) {
    return message.replace("Route not found", "接口不存在");
  }
  if (message.startsWith("Bilibili API request failed")) {
    return message.replace("Bilibili API request failed", "B站接口请求失败");
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
      ? translateKnownBackendError(normalizeErrorMessage(rawMessage) || fallback, t)
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
