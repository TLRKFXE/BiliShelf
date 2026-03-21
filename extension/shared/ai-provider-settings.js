import { formatAiProviderErrorMessage } from "./ai-provider-error.js";

function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function sortModels(models) {
  return models.slice().sort((left, right) => left.id.localeCompare(right.id));
}

const PROVIDER_PRESETS = Object.freeze({
  openai: {
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-4.1-mini", label: "gpt-4.1-mini" },
      { id: "gpt-4.1", label: "gpt-4.1" },
      { id: "gpt-4o-mini", label: "gpt-4o-mini" },
    ],
    supportsRemoteFetch: true,
  },
  gemini: {
    provider: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      { id: "gemini-2.5-flash", label: "gemini-2.5-flash" },
      { id: "gemini-2.5-pro", label: "gemini-2.5-pro" },
    ],
    supportsRemoteFetch: true,
  },
  claude: {
    provider: "claude",
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      { id: "claude-sonnet-4-20250514", label: "claude-sonnet-4-20250514" },
      { id: "claude-opus-4-20250514", label: "claude-opus-4-20250514" },
      { id: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku-20241022" },
    ],
    supportsRemoteFetch: true,
  },
  grok: {
    provider: "grok",
    baseUrl: "https://api.x.ai/v1",
    models: [
      { id: "grok-2-latest", label: "grok-2-latest" },
    ],
    supportsRemoteFetch: true,
  },
  deepseek: {
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    models: [
      { id: "deepseek-chat", label: "deepseek-chat" },
      { id: "deepseek-reasoner", label: "deepseek-reasoner" },
    ],
    supportsRemoteFetch: true,
  },
  kimi: {
    provider: "kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    models: [
      { id: "moonshot-v1-8k", label: "moonshot-v1-8k" },
      { id: "moonshot-v1-32k", label: "moonshot-v1-32k" },
    ],
    supportsRemoteFetch: true,
  },
  "openai-compatible": {
    provider: "openai-compatible",
    baseUrl: "",
    models: [],
    supportsRemoteFetch: true,
  },
});

function toModelOption(id, label = id) {
  const normalizedId = normalizeText(id);
  if (!normalizedId) return null;
  return {
    id: normalizedId,
    label: normalizeText(label) || normalizedId,
  };
}

export function getAiProviderPreset(provider) {
  const preset = PROVIDER_PRESETS[normalizeText(provider).toLowerCase()];
  if (!preset) {
    return {
      provider: "openai-compatible",
      baseUrl: "",
      models: [],
      supportsRemoteFetch: true,
    };
  }
  return {
    ...preset,
    models: preset.models.map((model) => ({ ...model })),
  };
}

export function normalizeAiProviderBaseUrl(provider, rawUrl) {
  const text = normalizeText(rawUrl);
  const preset = getAiProviderPreset(provider);
  if (!text) return preset.baseUrl;

  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return text;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return text;
  }

  const base = parsed.toString().replace(/\/+$/, "");
  if (provider === "gemini" && base === "https://generativelanguage.googleapis.com") {
    return `${base}/v1beta`;
  }
  if (provider === "openai" && base === "https://api.openai.com") {
    return `${base}/v1`;
  }
  if (provider === "claude" && base === "https://api.anthropic.com") {
    return `${base}/v1`;
  }
  if (provider === "grok" && base === "https://api.x.ai") {
    return `${base}/v1`;
  }
  if (provider === "deepseek" && base === "https://api.deepseek.com") {
    return `${base}/v1`;
  }
  if (provider === "kimi" && base === "https://api.moonshot.cn") {
    return `${base}/v1`;
  }

  return base;
}

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function parseOpenAiStyleModels(payload) {
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return sortModels(
    items
      .map((item) =>
        item && typeof item === "object" ? toModelOption(item.id, item.id) : null,
      )
      .filter(Boolean),
  );
}

function parseGeminiModels(payload) {
  const items = Array.isArray(payload?.models) ? payload.models : [];
  return sortModels(
    items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const methods = Array.isArray(item.supportedGenerationMethods)
          ? item.supportedGenerationMethods.map((method) => normalizeText(method))
          : [];
        if (!methods.includes("generateContent")) return null;
        const fullName = normalizeText(item.name);
        const id = fullName.replace(/^models\//, "");
        return toModelOption(id, normalizeText(item.displayName) || id);
      })
      .filter(Boolean),
  );
}

function parseClaudeModels(payload) {
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return sortModels(
    items
      .map((item) =>
        item && typeof item === "object"
          ? toModelOption(item.id, item.display_name || item.id)
          : null,
      )
      .filter(Boolean),
  );
}

export async function listAiProviderModels(config, options = {}) {
  const provider = normalizeText(config?.provider).toLowerCase() || "openai-compatible";
  const preset = getAiProviderPreset(provider);
  const baseUrl = normalizeAiProviderBaseUrl(provider, config?.baseUrl);
  const apiKey = normalizeText(config?.apiKey);

  if (!apiKey || !preset.supportsRemoteFetch || !baseUrl) {
    return {
      provider: preset.provider,
      baseUrl,
      models: preset.models,
      source: "builtin",
      supportsRemoteFetch: preset.supportsRemoteFetch,
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  let response;
  if (provider === "gemini") {
    response = await fetchImpl(
      `${joinUrl(baseUrl, "models")}?key=${encodeURIComponent(apiKey)}`,
      {
        method: "GET",
      },
    );
  } else if (provider === "claude") {
    response = await fetchImpl(joinUrl(baseUrl, "models"), {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
  } else {
    response = await fetchImpl(joinUrl(baseUrl, "models"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  }

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(formatAiProviderErrorMessage(response.status, responseText));
  }

  const payload = responseText ? JSON.parse(responseText) : {};
  const models =
    provider === "gemini"
      ? parseGeminiModels(payload)
      : provider === "claude"
        ? parseClaudeModels(payload)
        : parseOpenAiStyleModels(payload);

  return {
    provider: preset.provider,
    baseUrl,
    models: models.length > 0 ? models : preset.models,
    source: models.length > 0 ? "remote" : "builtin",
    supportsRemoteFetch: preset.supportsRemoteFetch,
  };
}
