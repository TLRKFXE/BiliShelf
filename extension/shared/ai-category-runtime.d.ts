import type { FolderAnalysisInput, FolderAnalysisVideoInput } from "./ai-analysis.js";
import type { AiMeta } from "./ai-state.js";

export type AiRuntimeFetchResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

export type AiRuntimeFetch = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<AiRuntimeFetchResponse>;

export function requestAiJson(
  meta: Pick<AiMeta, "provider" | "baseUrl" | "apiKey" | "model">,
  prompt: string,
  options?: {
    fetchImpl?: AiRuntimeFetch;
  },
): Promise<Record<string, unknown>>;

export function categorizeFolderVideo(
  meta: Pick<AiMeta, "provider" | "baseUrl" | "apiKey" | "model">,
  input: FolderAnalysisInput,
  video: FolderAnalysisVideoInput,
  options?: {
    fetchImpl?: AiRuntimeFetch;
  },
): Promise<{ category: string }>;
