import type { AiProvider, AiSettings, AiSettingsModelOption } from "../types";

export type AiSettingsProviderId = AiProvider | "custom";

export function resolveAiSettingsProviderId(
  settings: Partial<AiSettings> | null | undefined
): AiSettingsProviderId;

export function buildAiSettingsPayload(input: {
  providerId: AiSettingsProviderId;
  customProviderName?: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  enabled: boolean;
}): {
  provider: AiProvider;
  customProviderName: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  enabled: boolean;
};

export function mergeAiModelOptions(
  currentModel: string | null | undefined,
  options: AiSettingsModelOption[]
): AiSettingsModelOption[];
