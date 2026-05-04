import test from "node:test";
import assert from "node:assert/strict";

import {
  appendSuggestedCustomTag,
  findMatchingCustomTagSuggestions,
  resolveCustomTagInputState,
} from "../utils/custom-tag-suggestions.js";

test("resolveCustomTagInputState tracks current token in a comma-separated input", () => {
  assert.deepEqual(resolveCustomTagInputState("音乐, 教程,  v"), {
    normalizedTags: ["音乐", "教程"],
    activeToken: "v",
  });

  assert.deepEqual(resolveCustomTagInputState(""), {
    normalizedTags: [],
    activeToken: "",
  });
});

test("findMatchingCustomTagSuggestions filters duplicates and matches the active token", () => {
  const suggestions = findMatchingCustomTagSuggestions(
    ["Vlog", "教程", "音乐", "vlog进阶", "Vlog"],
    "音乐, v",
    5,
  );

  assert.deepEqual(suggestions, ["Vlog", "vlog进阶"]);
});

test("appendSuggestedCustomTag preserves free-form input and replaces only the active token", () => {
  assert.equal(
    appendSuggestedCustomTag("音乐, v", "Vlog"),
    "音乐, Vlog",
  );

  assert.equal(
    appendSuggestedCustomTag("音乐, 教程", "Vlog"),
    "音乐, 教程, Vlog",
  );

  assert.equal(
    appendSuggestedCustomTag("音乐, Vlog", "Vlog"),
    "音乐, Vlog",
  );
});
