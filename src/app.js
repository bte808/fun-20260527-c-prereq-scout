import { starterSheets } from "./sample-data.js";
import { analyzeTopicSheet, escapeHtml } from "./prereq-scout.js";

const input = document.querySelector("#topic-input");
const analyzeButton = document.querySelector("#analyze");
const sampleButton = document.querySelector("#load-sample");
const starterSelect = document.querySelector("#starter-sheet");
const routeOutput = document.querySelector("#route-output");
const bottleneckOutput = document.querySelector("#bottleneck-output");
const graphOutput = document.querySelector("#graph-output");
const markdownOutput = document.querySelector("#markdown-output");
const nextFocusOutput = document.querySelector("#next-focus-output");
const copyButton = document.querySelector("#copy-markdown");
const downloadButton = document.querySelector("#download-markdown");
const copyStatus = document.querySelector("#copy-status");

const statTopics = document.querySelector("#stat-topics");
const statReady = document.querySelector("#stat-ready");
const statBottlenecks = document.querySelector("#stat-bottlenecks");
const statIssues = document.querySelector("#stat-issues");

const draftKey = "prereq-scout-topic-sheet-v1";
let currentMarkdown = "";
let saveTimer;

function setStatus(message) {
  copyStatus.textContent = message;
}

function persistDraft(message = "Draft saved locally.") {
  try {
    localStorage.setItem(draftKey, input.value);
    if (message) {
      setStatus(message);
    }
  } catch {
    setStatus("Local draft storage is unavailable in this browser.");
  }
}

function restoreDraft() {
  try {
    return localStorage.getItem(draftKey);
  } catch {
    return null;
  }
}

function getSelectedStarter() {
  return starterSheets.find((starter) => starter.id === starterSelect.value) || starterSheets[0];
}

function renderStarterOptions() {
  starterSelect.innerHTML = starterSheets
    .map((starter) => `<option value="${escapeHtml(starter.id)}">${escapeHtml(starter.name)}</option>`)
    .join("");
}

function setSample() {
  const starter = getSelectedStarter();
  input.value = starter.sheet;
  persistDraft(`${starter.name} starter loaded and saved locally.`);
  runAnalysis();
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createIssuesHtml(errors) {
  if (!errors.length) {
    return "";
  }

  return `<article class="route-item">
    <h3>Input issues</h3>
    <div class="chips"><span class="chip low">${errors.length} issue(s)</span></div>
    <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>
  </article>`;
}

function runAnalysis() {
  const analysis = analyzeTopicSheet(input.value);
  currentMarkdown = analysis.markdown;

  statTopics.textContent = String(analysis.topics.length);
  statReady.textContent = String(analysis.route[1].topics.length);
  statBottlenecks.textContent = String(analysis.bottlenecks.length);
  statIssues.textContent = String(analysis.errors.length);

  routeOutput.innerHTML = `${createIssuesHtml(analysis.errors)}${analysis.routeHtml}`;
  nextFocusOutput.innerHTML = analysis.nextFocusHtml;
  bottleneckOutput.innerHTML = analysis.bottleneckHtml;
  graphOutput.innerHTML = analysis.graphSvg;
  markdownOutput.value = analysis.markdown;
  setStatus(analysis.summary);
}

async function copyMarkdown() {
  if (!currentMarkdown) {
    setStatus("Build a plan first.");
    return;
  }

  try {
    await navigator.clipboard.writeText(currentMarkdown);
    setStatus("Markdown copied.");
  } catch {
    setStatus("Clipboard unavailable. Use Download .md instead.");
  }
}

sampleButton.addEventListener("click", setSample);
analyzeButton.addEventListener("click", runAnalysis);
copyButton.addEventListener("click", copyMarkdown);
downloadButton.addEventListener("click", () => {
  if (!currentMarkdown) {
    setStatus("Build a plan first.");
    return;
  }
  downloadText("prereq-scout-plan.md", currentMarkdown);
  setStatus("Markdown downloaded.");
});

input.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    runAnalysis();
  }
});

input.addEventListener("input", () => {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => persistDraft(), 250);
});

renderStarterOptions();

const restoredDraft = restoreDraft();
if (restoredDraft !== null) {
  input.value = restoredDraft;
  runAnalysis();
  setStatus("Restored your local draft.");
} else {
  setSample();
}
