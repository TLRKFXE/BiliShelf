import {
  STABLE_CATEGORY_KEYS,
  normalizeClassificationPayload,
} from "./ai-provider.js";
import { formatAiProviderErrorMessage } from "./ai-provider-error.js";

function normalizeText(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function joinUrl(baseUrl, path) {
  const base = normalizeText(baseUrl).replace(/\/+$/, "");
  const nextPath = normalizeText(path).replace(/^\/+/, "");
  return `${base}/${nextPath}`;
}

function extractJsonObject(rawText) {
  const direct = normalizeText(rawText);
  if (!direct) {
    throw new Error("AI response was empty");
  }
  try {
    return JSON.parse(direct);
  } catch {}

  const fencedMatch = direct.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? direct;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("AI response did not contain JSON");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function extractOpenAiLikeText(payload) {
  const extractValue = (value) => {
    if (typeof value === "string") return normalizeText(value);
    if (Array.isArray(value)) {
      return value.map((item) => extractValue(item)).filter(Boolean).join("\n");
    }
    if (!value || typeof value !== "object") return "";
    if (typeof value.text === "string") return normalizeText(value.text);
    if (typeof value.output_text === "string") return normalizeText(value.output_text);
    if (value.content !== undefined) return extractValue(value.content);
    return "";
  };

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  for (const choice of choices) {
    if (!choice || typeof choice !== "object") continue;
    const text = extractValue(choice.message?.content) ||
      extractValue(choice.message?.reasoning_content) ||
      extractValue(choice.content) ||
      extractValue(choice.text);
    if (text) return text;
  }
  const topLevel = extractValue(payload.output_text) || extractValue(payload.output);
  if (topLevel) return topLevel;
  return extractValue(payload.result) || extractValue(payload.response);
}

function extractClaudeText(payload) {
  if (!Array.isArray(payload.content)) return "";
  return payload.content
    .map((item) =>
      item && typeof item === "object" && "text" in item
        ? normalizeText(item.text)
        : "",
    )
    .filter(Boolean)
    .join("\n");
}

function extractGeminiText(payload) {
  const candidate = Array.isArray(payload.candidates) ? payload.candidates[0] : null;
  const content =
    candidate && typeof candidate === "object" && candidate !== null
      ? candidate.content
      : null;
  const parts =
    content && typeof content === "object" && content !== null ? content.parts : null;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((item) =>
      item && typeof item === "object" && "text" in item
        ? normalizeText(item.text)
        : "",
    )
    .filter(Boolean)
    .join("\n");
}

export async function requestAiJson(meta, prompt, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = options.signal;
  const requestedMaxTokens = Number(options.maxTokens);
  const requestedTemperature = Number(options.temperature);
  const maxTokens = Math.min(
    8192,
    Math.max(128, Number.isFinite(requestedMaxTokens) ? requestedMaxTokens : 2048),
  );
  const temperature = Math.min(
    1,
    Math.max(0, Number.isFinite(requestedTemperature) ? requestedTemperature : 0.1),
  );

  let response;
  let responseText = null;
  if (meta.provider === "gemini") {
    response = await fetchImpl(
      `${joinUrl(meta.baseUrl, `models/${encodeURIComponent(meta.model)}:generateContent`)}?key=${encodeURIComponent(meta.apiKey)}`,
      {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            responseMimeType: "application/json",
          },
        }),
      },
    );
  } else if (meta.provider === "claude") {
    response = await fetchImpl(joinUrl(meta.baseUrl, "messages"), {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": meta.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: meta.model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });
  } else {
    const requestBody = {
      model: meta.model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: "system",
          content:
            "Return JSON only. Do not include markdown fences or extra prose.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      ...(meta.provider === "deepseek" || meta.provider === "openai"
        ? { response_format: { type: "json_object" } }
        : {}),
    };
    const requestUrl = joinUrl(meta.baseUrl, "chat/completions");
    const requestInit = {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${meta.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    };
    response = await fetchImpl(requestUrl, requestInit);
    responseText = await response.text();
    // Some OpenAI-compatible gateways expose JSON mode but reject the
    // response_format field for newer or vendor-specific models. Retry once
    // with the same prompt so those models still get a chance to answer.
    if (!response.ok && response.status === 400 && requestBody.response_format) {
      const fallbackBody = { ...requestBody };
      delete fallbackBody.response_format;
      response = await fetchImpl(requestUrl, {
        ...requestInit,
        body: JSON.stringify(fallbackBody),
      });
      responseText = await response.text();
    }
  }

  if (responseText === null) responseText = await response.text();
  if (!response.ok) {
    throw new Error(formatAiProviderErrorMessage(response.status, responseText));
  }

  const payload = responseText ? JSON.parse(responseText) : {};
  const text =
    meta.provider === "gemini"
      ? extractGeminiText(payload)
      : meta.provider === "claude"
        ? extractClaudeText(payload)
        : extractOpenAiLikeText(payload);

  return extractJsonObject(text);
}

export async function categorizeFolderVideo(meta, input, video, options = {}) {
  const allowedCategoryKeys = STABLE_CATEGORY_KEYS.join(", ");
  const payload = await requestAiJson(
    meta,
    [
      "You analyze one video inside a folder and return JSON only.",
      `Allowed category keys (choose exactly one): ${allowedCategoryKeys}`,
      'Return schema: {"category":"<one allowed category key>"}',
      `Folder: ${input.folderName}`,
      `Video title: ${video.title}`,
      `Uploader: ${video.uploader}`,
      `Description: ${video.description || "-"}`,
      `Custom tags: ${video.customTags.join(", ") || "-"}`,
      `System tags: ${video.systemTags.join(", ") || "-"}`,
    ].join("\n"),
    options,
  );
  return normalizeClassificationPayload(payload);
}
