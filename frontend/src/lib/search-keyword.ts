import type { Locale } from "@/stores/app-ui";

export type SearchFieldToken =
  | "title"
  | "uploader"
  | "description"
  | "systemTag"
  | "customTag";

export const FIELD_SNIPPETS: Record<SearchFieldToken, string> = {
  title: "title:",
  uploader: "uploader:",
  description: "description:",
  systemTag: "systemTag:",
  customTag: "customTag:",
};

export const FIELD_SNIPPETS_ZH: Record<SearchFieldToken, string> = {
  title: "标题:",
  uploader: "UP主:",
  description: "简介:",
  systemTag: "B站tag:",
  customTag: "自定义tag:",
};

export const FIELD_ALIASES: Record<SearchFieldToken, string[]> = {
  title: ["title", "标题"],
  uploader: ["uploader", "up", "up主", "UP主"],
  description: ["description", "简介"],
  systemTag: ["systemTag", "bTag", "b站tag", "B站tag", "bilibiliTag"],
  customTag: ["customTag", "custom", "自定义tag", "自定义标签"],
};

export function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const allAliasPattern = Object.values(FIELD_ALIASES)
  .flat()
  .map((name) => escapeRegExp(name))
  .join("|");

export const FIELD_REGEX_MAP: Record<SearchFieldToken, RegExp> = {
  title: new RegExp(
    `(?:^|\\s)(?:${FIELD_ALIASES.title.map((name) => escapeRegExp(name)).join("|")})\\s*:\\s*([^:]+?)(?=\\s(?:${allAliasPattern})\\s*:|$)`,
    "giu"
  ),
  uploader: new RegExp(
    `(?:^|\\s)(?:${FIELD_ALIASES.uploader.map((name) => escapeRegExp(name)).join("|")})\\s*:\\s*([^:]+?)(?=\\s(?:${allAliasPattern})\\s*:|$)`,
    "giu"
  ),
  description: new RegExp(
    `(?:^|\\s)(?:${FIELD_ALIASES.description.map((name) => escapeRegExp(name)).join("|")})\\s*:\\s*([^:]+?)(?=\\s(?:${allAliasPattern})\\s*:|$)`,
    "giu"
  ),
  systemTag: new RegExp(
    `(?:^|\\s)(?:${FIELD_ALIASES.systemTag.map((name) => escapeRegExp(name)).join("|")})\\s*:\\s*([^:]+?)(?=\\s(?:${allAliasPattern})\\s*:|$)`,
    "giu"
  ),
  customTag: new RegExp(
    `(?:^|\\s)(?:${FIELD_ALIASES.customTag.map((name) => escapeRegExp(name)).join("|")})\\s*:\\s*([^:]+?)(?=\\s(?:${allAliasPattern})\\s*:|$)`,
    "giu"
  ),
};

export function localizedFieldSnippet(field: SearchFieldToken, locale: Locale) {
  return locale === "zh-CN" ? FIELD_SNIPPETS_ZH[field] : FIELD_SNIPPETS[field];
}

export function allFieldSnippets(field: SearchFieldToken) {
  return [...new Set([FIELD_SNIPPETS[field], FIELD_SNIPPETS_ZH[field]])];
}

export function parseKeyword(raw: string) {
  const text = raw.trim();
  const extracted: Partial<Record<SearchFieldToken, string>> = {};
  let rest = text;

  for (const field of Object.keys(FIELD_REGEX_MAP) as SearchFieldToken[]) {
    const matches = [...text.matchAll(FIELD_REGEX_MAP[field])];
    if (matches.length === 0) continue;
    extracted[field] = matches[matches.length - 1][1].trim();
    rest = rest.replace(FIELD_REGEX_MAP[field], " ");
  }

  const danglingFieldTokenRegex = new RegExp(
    `(?:^|\\s)(?:${allAliasPattern})\\s*:(?=\\s|$)`,
    "giu"
  );
  rest = rest.replace(danglingFieldTokenRegex, " ");

  const tokens = rest
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((row) => row.trim())
    .filter(Boolean);

  return {
    extracted,
    keywordTags: [] as string[],
    globalKeyword: tokens.join(" ").trim(),
  };
}

export function toggleFieldTokenKeyword(
  sourceKeyword: string,
  field: SearchFieldToken,
  locale: Locale
) {
  const snippet = localizedFieldSnippet(field, locale);
  const snippetAlternatives = allFieldSnippets(field);
  const source = sourceKeyword.trim();
  const fieldRegex = new RegExp(
    FIELD_REGEX_MAP[field].source,
    FIELD_REGEX_MAP[field].flags
  );
  const snippetRegex = new RegExp(
    `(^|\\s)(?:${snippetAlternatives
      .map((item) => escapeRegExp(item))
      .join("|")})(?=\\s|$)`,
    "giu"
  );

  if (fieldRegex.test(source) || snippetRegex.test(source)) {
    return source
      .replace(new RegExp(FIELD_REGEX_MAP[field].source, "giu"), " ")
      .replace(snippetRegex, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return source ? `${source} ${snippet}` : snippet;
}
