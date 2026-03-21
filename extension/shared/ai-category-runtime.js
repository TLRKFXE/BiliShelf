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
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const message =
    choice && typeof choice === "object" && choice !== null ? choice.message : null;
  const content =
    message && typeof message === "object" && message !== null
      ? message.content
      : null;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        item && typeof item === "object" && "text" in item
          ? normalizeText(item.text)
          : "",
      )
      .filter(Boolean)
      .join("\n");
  }
  return "";
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

  let response;
  if (meta.provider === "gemini") {
    response = await fetchImpl(
      `${joinUrl(meta.baseUrl, `models/${encodeURIComponent(meta.model)}:generateContent`)}?key=${encodeURIComponent(meta.apiKey)}`,
      {
        method: "POST",
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
        }),
      },
    );
  } else if (meta.provider === "claude") {
    response = await fetchImpl(joinUrl(meta.baseUrl, "messages"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": meta.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: meta.model,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });
  } else {
    response = await fetchImpl(joinUrl(meta.baseUrl, "chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${meta.apiKey}`,
      },
      body: JSON.stringify({
        model: meta.model,
        temperature: 0.2,
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
      }),
    });
  }

  const responseText = await response.text();
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
