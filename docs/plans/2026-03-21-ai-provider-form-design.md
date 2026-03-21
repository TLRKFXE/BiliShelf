# AI Provider Form Design

**Date:** 2026-03-21

**Status:** Approved

## Goal

Reduce AI settings misconfiguration by replacing free-form provider setup with:

- official provider presets with normalized default base URLs
- built-in recommended model options
- optional live model refresh after entering an API key
- a minimal custom provider form for OpenAI-compatible services

## Product Direction

### Official Providers

Official providers are presented as structured presets instead of raw text inputs.

Each preset defines:

- display label
- runtime provider key
- normalized default base URL
- built-in model list
- whether live model fetching is supported

The user flow for official providers becomes:

1. choose provider
2. fill API key
3. select a model from the built-in list or refresh the model list
4. save or test

### Custom Provider

Custom provider is treated as a minimal OpenAI-compatible configuration surface.

The setup form only requires:

- provider name
- base URL
- API key

After the custom provider is selected, the UI still offers a model selector, but models are obtained through the same OpenAI-compatible model-list flow rather than a manually typed model field.

## Architecture

### Persisted Settings

Persisted AI settings keep the existing runtime provider enum for execution compatibility, and add a small amount of metadata for UI-driven configuration:

- `customProviderName: string`
- optional provider preset metadata in the frontend only

For custom providers:

- persisted runtime provider remains `openai-compatible`
- persisted `baseUrl` is the user-entered root URL
- persisted `customProviderName` is used for presentation only

### Provider Presets

Frontend and extension share the same preset intent:

- official providers use normalized default base URLs
- Gemini base URL should include `/v1beta`
- OpenAI-style providers should use their `/v1` root URLs
- built-in model options are available even before any live fetch

### Live Model Fetch

Add an extension-local API endpoint for listing models from the current provider config.

Recommended route:

- `POST /ai/settings/models`

Request payload:

- provider
- baseUrl
- apiKey
- optional customProviderName

Response payload:

- normalized provider/base URL metadata
- model list
- whether the list came from a live fetch or built-in fallback

Provider-specific behavior:

- Gemini: `GET {baseUrl}/models?key=...`, keep only models supporting `generateContent`
- OpenAI/OpenAI-compatible style: `GET {baseUrl}/models`
- Claude: `GET {baseUrl}/models`

If live fetch fails, the frontend keeps the built-in model list and shows a lightweight error.

## UI Behavior

### Official Provider Form

Official presets should render:

- provider selector
- read-only or preset-driven base URL field
- model dropdown
- API key field
- refresh models action

The user should not need to manually type a base URL for official providers.

### Custom Provider Form

Custom provider should render:

- provider name field
- base URL field
- API key field
- model dropdown populated from built-in placeholder options or live fetch

The custom form intentionally stays small and avoids provider-specific protocol switches.

## Error Handling

- normalize official base URLs before save and before test
- avoid exposing raw malformed provider paths when a preset can supply the correct root
- if model refresh fails, keep the current selected model when possible
- preserve previous API key when the field is left blank
- keep save/test available when built-in models are sufficient

## Testing

### Extension

- provider base URL normalization
- custom provider metadata persistence
- provider model list parsing for Gemini and OpenAI-compatible responses
- fallback behavior when live model fetching fails

### Frontend

- preset selection updates base URL and model options
- custom provider form shape is enforced
- refreshed model list replaces built-in options without losing validity
- type-check passes with the new settings contract

## Success Criteria

- users no longer need to manually discover the correct Gemini base URL format
- official providers can be configured with API key plus selection-based fields
- custom providers can be added with only provider name, base URL, and API key
- model selection is presented as a form choice rather than a free-text input
- configuration mistakes that previously caused 404s are materially reduced
