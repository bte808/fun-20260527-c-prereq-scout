import test from "node:test";
import assert from "node:assert/strict";
import { analyzeTopicSheet, parseTopicSheet } from "../src/prereq-scout.js";
import { sampleTopicSheet } from "../src/sample-data.js";

test("parseTopicSheet parses valid topics", () => {
  const parsed = parseTopicSheet("A | | 1 | note\nB | A | 3 | okay");
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.topics.length, 2);
  assert.deepEqual(parsed.topics[1].prerequisites, ["A"]);
});

test("analyzeTopicSheet finds unknown prerequisites", () => {
  const analysis = analyzeTopicSheet("A | Missing | 2 |");
  assert.match(analysis.errors[0], /Unknown prerequisite/);
});

test("analyzeTopicSheet detects cycles", () => {
  const analysis = analyzeTopicSheet("A | B | 1 |\nB | A | 1 |");
  assert.ok(analysis.errors.some((error) => error.includes("Cycle detected")));
});

test("sample builds route and markdown", () => {
  const analysis = analyzeTopicSheet(sampleTopicSheet);
  assert.ok(analysis.route[0].topics.length >= 2);
  assert.ok(analysis.route[1].topics.some((topic) => topic.title === "Signals and noise"));
  assert.match(analysis.markdown, /## Study Route/);
});
