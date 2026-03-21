# AI Provider Form Implementation Plan

## Task 1: Extend AI settings contracts for preset-driven providers and custom provider metadata

- modify shared AI state/types to support `customProviderName`
- update response masking/types for frontend consumption
- add normalization tests

## Task 2: Add provider preset and model-list helpers in the extension

- add normalized official provider base URLs
- add built-in provider model lists
- add provider-specific live model fetching helpers
- add tests for Gemini and OpenAI-compatible parsing/fallbacks

## Task 3: Add extension-local model list API

- add `POST /ai/settings/models`
- validate incoming provider config
- return built-in or live model options with normalized base URL
- add tests for response shape and error handling

## Task 4: Rebuild frontend AI settings form around provider presets

- replace free-text base URL/model entry for official providers with preset-driven UI
- add custom provider subform
- add model refresh action and option state
- keep API key entry and save/test actions

## Task 5: Verification

- run `node --test extension/tests/*.test.mjs`
- run `pnpm --dir extension exec tsc --noEmit`
- run `pnpm --dir frontend check`
