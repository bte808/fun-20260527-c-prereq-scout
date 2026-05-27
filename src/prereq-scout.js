const CONFIDENCE_LABELS = {
  0: "Blank",
  1: "Fragile",
  2: "Patchy",
  3: "Usable",
  4: "Solid"
};

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function slugify(value) {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function parseTopicSheet(input) {
  const topics = [];
  const errors = [];
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const seen = new Map();

  lines.forEach((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 3) {
      errors.push(`Line ${index + 1}: expected at least 3 fields separated by |`);
      return;
    }

    const [rawTitle, rawPrereqs = "", rawConfidence = "", rawNote = ""] = parts;
    const title = normalizeName(rawTitle);
    if (!title) {
      errors.push(`Line ${index + 1}: topic name is empty`);
      return;
    }

    if (seen.has(title.toLowerCase())) {
      errors.push(`Line ${index + 1}: duplicate topic "${title}"`);
      return;
    }

    const confidence = Number.parseInt(rawConfidence, 10);
    if (!Number.isInteger(confidence) || confidence < 0 || confidence > 4) {
      errors.push(`Line ${index + 1}: confidence for "${title}" must be an integer from 0 to 4`);
      return;
    }

    const prerequisites = rawPrereqs
      .split(",")
      .map((part) => normalizeName(part))
      .filter(Boolean);

    const topic = {
      id: slugify(title) || `topic-${index + 1}`,
      title,
      confidence,
      confidenceLabel: CONFIDENCE_LABELS[confidence],
      note: rawNote.trim(),
      prerequisites,
      dependents: [],
      blocksCount: 0,
      level: 0,
      blockedBy: [],
      readyNow: false
    };

    seen.set(title.toLowerCase(), topic);
    topics.push(topic);
  });

  topics.forEach((topic) => {
    topic.prerequisites.forEach((prereq) => {
      const target = seen.get(prereq.toLowerCase());
      if (!target) {
        errors.push(`Unknown prerequisite "${prereq}" referenced by "${topic.title}"`);
        return;
      }
      target.dependents.push(topic.title);
    });
  });

  return { topics, errors };
}

function computeLevels(map, topic, trail = new Set()) {
  if (!topic) {
    return 0;
  }

  if (trail.has(topic.title)) {
    return 0;
  }

  if (!topic.prerequisites.length) {
    topic.level = 0;
    return 0;
  }

  trail.add(topic.title);
  const level = Math.max(
    ...topic.prerequisites.map((name) => {
      const prereq = map.get(name.toLowerCase());
      if (!prereq) {
        return 0;
      }
      return computeLevels(map, prereq, new Set(trail)) + 1;
    })
  );
  topic.level = level;
  return level;
}

function visitForTopo(name, map, state, sorted, cycles, stack = []) {
  if (!map.has(name)) {
    return;
  }
  const mark = state.get(name) || 0;
  if (mark === 1) {
    const cycleStart = stack.indexOf(name);
    const cycle = [...stack.slice(cycleStart), name];
    cycles.push(cycle);
    return;
  }
  if (mark === 2) {
    return;
  }

  state.set(name, 1);
  const topic = map.get(name);
  topic.prerequisites.forEach((prereq) =>
    visitForTopo(prereq.toLowerCase(), map, state, sorted, cycles, [...stack, name])
  );
  state.set(name, 2);
  sorted.push(topic);
}

function collectBlockedDescendants(topic, map, memo = new Map(), trail = new Set()) {
  if (memo.has(topic.title)) {
    return memo.get(topic.title);
  }
  if (trail.has(topic.title)) {
    return new Set();
  }

  trail.add(topic.title);
  const descendants = topic.dependents.reduce((set, dependentTitle) => {
    const dependent = map.get(dependentTitle.toLowerCase());
    if (!dependent) {
      return set;
    }
    set.add(dependent.title);
    const nested = collectBlockedDescendants(dependent, map, memo, new Set(trail));
    nested.forEach((title) => set.add(title));
    return set;
  }, new Set());
  memo.set(topic.title, descendants);
  return descendants;
}

function confidenceChipClass(confidence) {
  if (confidence <= 1) {
    return "low";
  }
  if (confidence === 2) {
    return "mid";
  }
  return "high";
}

function buildRoute(topics, map) {
  const reviewFirst = [];
  const readyNow = [];
  const extendLater = [];

  topics.forEach((topic) => {
    const weakPrereqs = topic.prerequisites.filter((name) => {
      const prereq = map.get(name.toLowerCase());
      return prereq ? prereq.confidence < 3 : false;
    });
    topic.blockedBy = weakPrereqs;
    topic.readyNow = weakPrereqs.length === 0 && topic.confidence <= 2;

    if (topic.confidence <= 1) {
      reviewFirst.push(topic);
    } else if (topic.readyNow) {
      readyNow.push(topic);
    } else if (topic.confidence >= 3) {
      extendLater.push(topic);
    }
  });

  reviewFirst.sort((a, b) => b.blocksCount - a.blocksCount || a.confidence - b.confidence);
  readyNow.sort((a, b) => b.level - a.level || a.confidence - b.confidence);
  extendLater.sort((a, b) => b.level - a.level || b.confidence - a.confidence);

  return [
    {
      title: "Session 1: repair blockers",
      description: "Topics with low confidence that will unlock later items fastest.",
      topics: reviewFirst
    },
    {
      title: "Session 2: study what is now reachable",
      description: "Topics whose prerequisites look stable enough for a focused pass.",
      topics: readyNow
    },
    {
      title: "Session 3: extend and teach back",
      description: "Topics already in decent shape; use them for synthesis or explanation.",
      topics: extendLater
    }
  ];
}

function buildNextFocus(route, errors) {
  if (errors.length) {
    return {
      title: "Fix input issues",
      label: "Check sheet",
      reason: `Resolve ${errors.length} cycle or format issue(s) before trusting the route.`,
      detail: "Use the input issues card to fix lines, unknown prerequisites, or cycles.",
      topic: null
    };
  }

  const [repairStage, readyStage, extendStage] = route;
  const repairTopic = repairStage.topics[0];
  if (repairTopic) {
    return {
      title: repairTopic.title,
      label: "Repair first",
      reason: `This fragile topic unlocks ${repairTopic.blocksCount} later topic(s).`,
      detail: repairTopic.note || "Stabilize the prerequisite before moving deeper.",
      topic: repairTopic
    };
  }

  const readyTopic = readyStage.topics[0];
  if (readyTopic) {
    return {
      title: readyTopic.title,
      label: "Study next",
      reason: "Its prerequisites look stable enough for a focused pass.",
      detail: readyTopic.note || "Use this as the next reachable study item.",
      topic: readyTopic
    };
  }

  const extendTopic = extendStage.topics[0];
  if (extendTopic) {
    return {
      title: extendTopic.title,
      label: "Teach back",
      reason: "No weak blockers remain, so synthesis is the highest-value move.",
      detail: extendTopic.note || "Explain it aloud or connect it to a later example.",
      topic: extendTopic
    };
  }

  return null;
}

function buildMarkdown(topics, bottlenecks, route, errors, nextFocus) {
  const lines = [
    "# Prereq Scout Plan",
    "",
    `- Topics: ${topics.length}`,
    `- Bottlenecks: ${bottlenecks.length}`,
    `- Issues: ${errors.length}`,
    ""
  ];

  if (errors.length) {
    lines.push("## Input Issues", "", ...errors.map((error) => `- ${error}`), "");
  }

  lines.push("## Next Focus", "");
  if (nextFocus) {
    const confidenceText = nextFocus.topic
      ? ` (${nextFocus.topic.confidenceLabel}, confidence ${nextFocus.topic.confidence})`
      : "";
    lines.push(
      `- **${nextFocus.title}**${confidenceText}`,
      `- Step: ${nextFocus.label}`,
      `- Why: ${nextFocus.reason}`,
      `- Detail: ${nextFocus.detail}`,
      ""
    );
  } else {
    lines.push("- Add at least one topic to get a focus recommendation.", "");
  }

  lines.push("## Bottlenecks", "");
  if (bottlenecks.length) {
    bottlenecks.forEach((topic) => {
      lines.push(
        `- **${topic.title}** (${topic.confidenceLabel}, confidence ${topic.confidence}) blocks ${topic.blocksCount} later topic(s).`
      );
    });
  } else {
    lines.push("- No major bottlenecks found.");
  }

  lines.push("", "## Study Route", "");
  route.forEach((stage) => {
    lines.push(`### ${stage.title}`, "", stage.description);
    if (stage.topics.length) {
      stage.topics.forEach((topic) => {
        const blockedText = topic.blockedBy.length ? ` | blocked by: ${topic.blockedBy.join(", ")}` : "";
        const noteText = topic.note ? ` | note: ${topic.note}` : "";
        lines.push(
          `- ${topic.title} | confidence ${topic.confidence} (${topic.confidenceLabel})${blockedText}${noteText}`
        );
      });
    } else {
      lines.push("- No topics in this bucket yet.");
    }
    lines.push("");
  });

  lines.push("## Topic Table", "");
  topics.forEach((topic) => {
    lines.push(
      `- ${topic.title} | prereqs: ${topic.prerequisites.join(", ") || "none"} | confidence ${topic.confidence} (${topic.confidenceLabel}) | dependents ${topic.dependents.length}`
    );
  });

  return lines.join("\n");
}

function renderSectionItem(topic) {
  const chips = [
    `<span class="chip ${confidenceChipClass(topic.confidence)}">${topic.confidenceLabel}</span>`,
    `<span class="chip">depends on ${topic.prerequisites.length || 0}</span>`,
    `<span class="chip">unlocks ${topic.dependents.length}</span>`
  ].join("");

  const blocked = topic.blockedBy.length
    ? `<p>Blocked by weak prereqs: ${escapeHtml(topic.blockedBy.join(", "))}</p>`
    : "<p>No weak prerequisites blocking this topic.</p>";

  const note = topic.note ? `<p>${escapeHtml(topic.note)}</p>` : "";

  return `<article class="route-item">
    <h3>${escapeHtml(topic.title)}</h3>
    <div class="chips">${chips}</div>
    ${blocked}
    ${note}
  </article>`;
}

function renderRoute(route) {
  return route
    .map((stage) => {
      const items = stage.topics.length
        ? stage.topics.map((topic) => renderSectionItem(topic)).join("")
        : '<p class="empty-state">No topics in this bucket.</p>';
      return `<section class="route-stage">
        <h3>${escapeHtml(stage.title)}</h3>
        <p>${escapeHtml(stage.description)}</p>
        <div class="list-stack">${items}</div>
      </section>`;
    })
    .join("");
}

function renderBottlenecks(bottlenecks) {
  if (!bottlenecks.length) {
    return '<p class="empty-state">No major bottlenecks. You can focus on ready-now topics.</p>';
  }

  return bottlenecks
    .map(
      (topic) => `<article class="bottleneck-item">
        <h3>${escapeHtml(topic.title)}</h3>
        <p>${escapeHtml(topic.confidenceLabel)} confidence. Fixing this can unlock ${topic.blocksCount} later topic(s).</p>
        <div class="chips">
          <span class="chip ${confidenceChipClass(topic.confidence)}">confidence ${topic.confidence}</span>
          <span class="chip">dependents ${topic.dependents.length}</span>
          <span class="chip">level ${topic.level}</span>
        </div>
      </article>`
    )
    .join("");
}

function renderNextFocus(nextFocus) {
  if (!nextFocus) {
    return '<p class="empty-state">Add at least one topic to get a focus recommendation.</p>';
  }

  const confidenceChip = nextFocus.topic
    ? `<span class="chip ${confidenceChipClass(nextFocus.topic.confidence)}">${nextFocus.topic.confidenceLabel}</span>`
    : '<span class="chip low">input check</span>';
  const unlockChip = nextFocus.topic
    ? `<span class="chip">unlocks ${nextFocus.topic.blocksCount}</span>`
    : "";

  return `<article class="next-focus-card">
    <div>
      <span class="focus-label">${escapeHtml(nextFocus.label)}</span>
      <h2>${escapeHtml(nextFocus.title)}</h2>
    </div>
    <p>${escapeHtml(nextFocus.reason)}</p>
    <p>${escapeHtml(nextFocus.detail)}</p>
    <div class="chips">
      ${confidenceChip}
      ${unlockChip}
    </div>
  </article>`;
}

function confidenceColor(confidence) {
  if (confidence <= 1) {
    return "#f3c3be";
  }
  if (confidence === 2) {
    return "#f2ddad";
  }
  return "#bfe4d8";
}

function renderGraph(topics, map) {
  if (!topics.length) {
    return "No graph data.";
  }

  const levels = new Map();
  topics.forEach((topic) => {
    const levelTopics = levels.get(topic.level) || [];
    levelTopics.push(topic);
    levels.set(topic.level, levelTopics);
  });

  const sortedLevels = [...levels.entries()].sort((a, b) => a[0] - b[0]);
  const positions = new Map();
  const xGap = 230;
  const yGap = 110;
  const width = Math.max(760, sortedLevels.length * xGap + 120);
  const maxRows = Math.max(...sortedLevels.map(([, items]) => items.length));
  const height = Math.max(280, maxRows * yGap + 120);

  sortedLevels.forEach(([level, items]) => {
    items.forEach((topic, row) => {
      const x = 90 + level * xGap;
      const yOffset = (height - (items.length - 1) * yGap) / 2;
      const y = yOffset + row * yGap;
      positions.set(topic.title, { x, y });
    });
  });

  const edges = topics
    .flatMap((topic) =>
      topic.prerequisites.map((prereqTitle) => {
        const from = positions.get(prereqTitle);
        const to = positions.get(topic.title);
        if (!from || !to) {
          return "";
        }
        return `<path d="M ${from.x + 84} ${from.y} C ${from.x + 130} ${from.y}, ${to.x - 130} ${to.y}, ${to.x - 84} ${to.y}" fill="none" stroke="#c7baa8" stroke-width="2"/>`;
      })
    )
    .join("");

  const nodes = topics
    .map((topic) => {
      const { x, y } = positions.get(topic.title);
      const title = escapeHtml(topic.title);
      return `<g>
        <rect x="${x - 84}" y="${y - 34}" rx="18" ry="18" width="168" height="68" fill="${confidenceColor(topic.confidence)}" stroke="#8a7c6d"/>
        <text x="${x}" y="${y - 6}" text-anchor="middle" font-size="16" font-family="Arial Narrow, sans-serif" fill="#21302e">${title}</text>
        <text x="${x}" y="${y + 16}" text-anchor="middle" font-size="12" fill="#405655">c${topic.confidence} · unlocks ${topic.dependents.length}</text>
      </g>`;
    })
    .join("");

  const levelLabels = sortedLevels
    .map(
      ([level]) =>
        `<text x="${90 + level * xGap}" y="32" text-anchor="middle" font-size="13" fill="#556764">Level ${level}</text>`
    )
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Prerequisite graph">
    ${levelLabels}
    ${edges}
    ${nodes}
  </svg>`;
}

export function analyzeTopicSheet(input) {
  const parsed = parseTopicSheet(input);
  const map = new Map(parsed.topics.map((topic) => [topic.title.toLowerCase(), topic]));
  const topo = [];
  const cycles = [];
  const state = new Map();

  parsed.topics.forEach((topic) => computeLevels(map, topic));
  parsed.topics.forEach((topic) =>
    visitForTopo(topic.title.toLowerCase(), map, state, topo, cycles)
  );

  const errors = [...parsed.errors];
  if (cycles.length) {
    cycles.forEach((cycle) => errors.push(`Cycle detected: ${cycle.join(" -> ")}`));
  }

  const blockMemo = new Map();
  parsed.topics.forEach((topic) => {
    topic.blocksCount = collectBlockedDescendants(topic, map, blockMemo).size;
  });

  const route = buildRoute(topo, map);
  const bottlenecks = parsed.topics
    .filter((topic) => topic.confidence <= 2 && topic.blocksCount > 0)
    .sort((a, b) => b.blocksCount - a.blocksCount || a.confidence - b.confidence)
    .slice(0, 6);
  const nextFocus = buildNextFocus(route, errors);
  const markdown = buildMarkdown(topo, bottlenecks, route, errors, nextFocus);

  return {
    topics: topo,
    errors,
    bottlenecks,
    route,
    nextFocus,
    graphSvg: renderGraph(topo, map),
    nextFocusHtml: renderNextFocus(nextFocus),
    routeHtml: renderRoute(route),
    bottleneckHtml: renderBottlenecks(bottlenecks),
    markdown,
    summary: `Mapped ${topo.length} topic(s), ${route[1].topics.length} ready-now topic(s), and ${bottlenecks.length} bottleneck(s).`
  };
}
