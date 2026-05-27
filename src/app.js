import { sampleTopicSheet } from "./sample-data.js";
import { analyzeTopicSheet } from "./prereq-scout.js";

const input = document.querySelector("#topic-input");
const analyzeButton = document.querySelector("#analyze");
const sampleButton = document.querySelector("#load-sample");
const routeOutput = document.querySelector("#route-output");
const bottleneckOutput = document.querySelector("#bottleneck-output");
const graphOutput = document.querySelector("#graph-output");
const markdownOutput = document.querySelector("#markdown-output");
const copyButton = document.querySelector("#copy-markdown");
const downloadButton = document.querySelector("#download-markdown");
const copyStatus = document.querySelector("#copy-status");

const statTopics = document.querySelector("#stat-topics");
const statReady = document.querySelector("#stat-ready");
const statBottlenecks = document.querySelector("#stat-bottlenecks");
const statIssues = document.querySelector("#stat-issues");

let currentMarkdown = "";

function setSample() {
  input.value = sampleTopicSheet;
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
    <ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>
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
  bottleneckOutput.innerHTML = analysis.bottleneckHtml;
  graphOutput.innerHTML = analysis.graphSvg;
  markdownOutput.value = analysis.markdown;
  copyStatus.textContent = analysis.summary;
}

async function copyMarkdown() {
  if (!currentMarkdown) {
    copyStatus.textContent = "Build a plan first.";
    return;
  }

  try {
    await navigator.clipboard.writeText(currentMarkdown);
    copyStatus.textContent = "Markdown copied.";
  } catch {
    copyStatus.textContent = "Clipboard unavailable. Use Download .md instead.";
  }
}

sampleButton.addEventListener("click", setSample);
analyzeButton.addEventListener("click", runAnalysis);
copyButton.addEventListener("click", copyMarkdown);
downloadButton.addEventListener("click", () => {
  if (!currentMarkdown) {
    copyStatus.textContent = "Build a plan first.";
    return;
  }
  downloadText("prereq-scout-plan.md", currentMarkdown);
  copyStatus.textContent = "Markdown downloaded.";
});

input.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    runAnalysis();
  }
});

setSample();
