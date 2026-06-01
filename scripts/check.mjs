import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { analyzeTopicSheet } from "../src/prereq-scout.js";
import { sampleTopicSheet } from "../src/sample-data.js";

const root = new URL("..", import.meta.url);
const requiredFiles = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/prereq-scout.js",
  "src/sample-data.js",
  "README.md",
  "LICENSE",
  "favicon.svg"
];

for (const file of requiredFiles) {
  const path = join(root.pathname, file);
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const source = await readFile(new URL("../src/prereq-scout.js", import.meta.url), "utf8");
const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

for (const [name, content] of Object.entries({ index, readme, css, source, app })) {
  if (/\/Users\/|OPENAI_API_KEY|ghp_|node_modules/.test(content)) {
    throw new Error(`Forbidden local/private marker found in ${name}`);
  }
}

if (!index.includes('type="module" src="./src/app.js"')) {
  throw new Error("index.html does not load the app module");
}

if (!readme.includes("DAG-based Kanji learning") || !readme.includes("example data")) {
  throw new Error("README needs inspiration and sample-data caveats");
}

if (!readme.includes("local storage") || !app.includes("prereq-scout-topic-sheet-v1")) {
  throw new Error("Local draft persistence is not documented and wired");
}

if (!index.includes("starter-sheet") || !app.includes("starterSheets")) {
  throw new Error("Starter sheet selector is not wired");
}

if (!readme.includes("starter sheets")) {
  throw new Error("README should explain the starter sheets");
}

if (!css.includes("@media (max-width: 560px)")) {
  throw new Error("Mobile layout media query is missing");
}

const analysis = analyzeTopicSheet(sampleTopicSheet);
if (analysis.topics.length < 6 || analysis.bottlenecks.length < 2) {
  throw new Error("Sample analysis is too thin");
}

if (analysis.markdown.includes("NaN")) {
  throw new Error("Markdown report includes NaN");
}

console.log("Static check passed");
console.log(analysis.summary);
