const STORAGE_KEY = "iternest_entrepreneurs_state_v1";

const screens = document.querySelectorAll(".screen");
const bottomNav = document.querySelector(".bottom-nav");
const coachText = document.querySelector("#coachText");
const userBubble = document.querySelector("#userBubble");
const thoughtInput = document.querySelector("#thoughtInput");
const customTimeInput = document.querySelector("#customTime");

let selectedTime = "25 minutes";
let selectedProjectType = "app";
const appState = loadState();

initialize();

function initialize() {
  hydrateSetupControls();
  ensureInitialProject();
  renderAll();
  showScreen(appState.activeProjectId ? "home" : "welcome");
}

function hydrateSetupControls() {
  const choices = [...document.querySelectorAll(".project-choice-grid button")];
  const types = ["app", "book", "business", "content", "creative", "other"];

  choices.forEach((button, index) => {
    button.dataset.projectType = types[index] ?? "other";
    button.addEventListener("click", () => {
      selectedProjectType = button.dataset.projectType;
      choices.forEach((choice) => choice.classList.toggle("is-selected", choice === button));
    });
  });

  choices[0]?.classList.add("is-selected");
}

function ensureInitialProject() {
  if (appState.projects.length > 0 && appState.activeProjectId) return;
  saveState();
}

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });

  if (bottomNav) bottomNav.classList.toggle("is-hidden", name === "welcome");
  renderAll();
}

function renderAll() {
  renderHome();
  renderNextMove();
  renderProjects();
  renderCoffee();
  renderWhiteboard();
}

function activeProject() {
  return appState.projects.find((project) => project.id === appState.activeProjectId) ?? null;
}

function createProject({ type, milestone, targetDate }) {
  const now = new Date().toISOString();
  const project = {
    id: `project-${Date.now()}`,
    type,
    name: projectTypeLabel(type),
    milestone: milestone || defaultMilestone(type),
    targetDate: targetDate || "",
    whereLeftOff: "Ready to begin.",
    milestoneHealth: "on-track",
    progress: [],
    recommendations: [],
    memory: {
      whiteboard: [],
      decisions: [],
      blockers: [],
      coffee: []
    },
    createdAt: now,
    updatedAt: now
  };

  project.currentRecommendation = recommendNextMove(project, { availableTime: selectedTime });
  project.whereLeftOff = project.currentRecommendation.title;
  project.recommendations.push(project.currentRecommendation);

  appState.projects.push(project);
  appState.activeProjectId = project.id;
  saveCoffee(project, "First-run setup", `Milestone: ${project.milestone}`);
  saveState();
  return project;
}

function recommendNextMove(project, options = {}) {
  const availableTime = options.availableTime ?? selectedTime;
  const minutes = parseMinutes(availableTime);
  const lastProgress = project.progress.at(-1);
  const blocker = project.memory.blockers.at(-1);
  const workUnit = buildWorkUnit(project, minutes, lastProgress, blocker);

  return {
    id: `rec-${Date.now()}`,
    title: workUnit.action,
    summary: workUnit.whyThis,
    steps: [
      `Action: ${workUnit.action}`,
      `Avoid: ${workUnit.avoid}`,
      `Save: ${workUnit.save}`
    ],
    avoid: workUnit.avoid,
    save: workUnit.save,
    estimatedMinutes: minutes,
    confidence: confidenceFor(project, lastProgress, blocker),
    readiness: readinessFor(project, blocker),
    createdAt: new Date().toISOString()
  };
}

function buildWorkUnit(project, minutes, lastProgress, blocker) {
  const context = projectContextText(project);

  if (blocker || lastProgress?.status === "stuck") {
    return {
      action: "Write the blocker in one sentence, then choose one smaller move.",
      whyThis: `This protects ${project.milestone} by turning the stuck point into something you can act on within ${minutes} minutes.`,
      avoid: "Do not reopen the whole project or try to solve every connected issue right now.",
      save: "Save the blocker, the smaller move you chose, and where future-you should restart."
    };
  }

  const action = actionFor(project.type, context, minutes);
  return {
    action,
    whyThis: `This is the smallest useful step toward ${project.milestone} that fits the time you have.`,
    avoid: avoidFor(project.type, minutes),
    save: saveFor(project.type, context)
  };
}

function projectContextText(project) {
  const leftOff = project.whereLeftOff && project.whereLeftOff !== "Ready to begin." ? project.whereLeftOff : "";
  return `${leftOff} ${project.milestone}`.toLowerCase();
}

function actionFor(type, context, minutes) {
  const isShort = minutes <= 15;
  const isMedium = minutes <= 45;
  const actionSet = actionLibrary(type);
  const matched = actionSet.find((item) => item.keywords.some((keyword) => context.includes(keyword)));

  if (matched) return isShort ? matched.short : isMedium ? matched.medium : matched.long;
  return isShort ? actionSet[0].short : isMedium ? actionSet[0].medium : actionSet[0].long;
}

function actionLibrary(type) {
  const libraries = {
    app: [
      {
        keywords: ["onboarding", "signup", "sign up", "first run"],
        short: "Decide the next onboarding screen.",
        medium: "Finalize the onboarding flow.",
        long: "Wire the onboarding flow and save what still needs testing."
      },
      {
        keywords: ["dashboard", "home"],
        short: "Choose the one dashboard section that matters most.",
        medium: "Decide the dashboard layout.",
        long: "Build the dashboard layout enough to click through."
      },
      {
        keywords: ["whiteboard", "canvas", "sketch"],
        short: "Decide the Whiteboard's next visible behavior.",
        medium: "Wire the Whiteboard screen.",
        long: "Make the Whiteboard screen save one useful decision."
      },
      {
        keywords: ["flow", "journey", "path"],
        short: "Name the next screen in the flow.",
        medium: "Finalize the next user flow.",
        long: "Build one usable slice of the current flow."
      }
    ],
    book: [
      {
        keywords: ["chapter 4", "chapter four"],
        short: "Outline Chapter 4.",
        medium: "Draft the first rough pass of Chapter 4.",
        long: "Write Chapter 4 until the next natural stopping point."
      },
      {
        keywords: ["chapter"],
        short: "Outline the next chapter.",
        medium: "Draft one chapter section.",
        long: "Move one chapter to a complete rough version."
      },
      {
        keywords: ["scene"],
        short: "Choose what the scene must accomplish.",
        medium: "Draft one scene.",
        long: "Draft one scene and mark the next scene's starting point."
      },
      {
        keywords: ["opening", "paragraph", "intro"],
        short: "Rewrite the opening paragraph.",
        medium: "Rewrite the opening page.",
        long: "Revise the opening section and save the next edit."
      }
    ],
    business: [
      {
        keywords: ["email", "customer", "client"],
        short: "Write one customer email.",
        medium: "Write and refine one customer email.",
        long: "Write the customer email and list who should receive it first."
      },
      {
        keywords: ["pricing", "price"],
        short: "Write the pricing question you need answered.",
        medium: "Validate pricing with one person.",
        long: "Prepare the pricing ask and send it to one person."
      },
      {
        keywords: ["landing", "headline", "page"],
        short: "Draft the landing page headline.",
        medium: "Draft the landing page headline and subhead.",
        long: "Draft the first landing page section."
      },
      {
        keywords: ["offer", "launch"],
        short: "Write the offer in one sentence.",
        medium: "Draft the first customer-facing offer.",
        long: "Draft the offer and the next ask."
      }
    ],
    content: [
      {
        keywords: ["hook", "hooks"],
        short: "Write three hooks.",
        medium: "Write three hooks and choose the strongest one.",
        long: "Draft the hook, outline, and first section."
      },
      {
        keywords: ["outline"],
        short: "Write the rough outline.",
        medium: "Draft one outline.",
        long: "Draft the outline and the first section."
      },
      {
        keywords: ["record", "video", "section"],
        short: "Choose the one section to record.",
        medium: "Record one section.",
        long: "Record one section and note the next edit."
      },
      {
        keywords: ["post", "publish"],
        short: "Choose the post angle.",
        medium: "Draft one post.",
        long: "Draft one publishable post."
      }
    ],
    creative: [
      {
        keywords: ["version", "draft", "pass"],
        short: "Choose the next visible change.",
        medium: "Make one visible creative pass.",
        long: "Create the next rough version."
      },
      {
        keywords: ["decision", "style", "direction"],
        short: "Choose one creative direction.",
        medium: "Test one creative direction.",
        long: "Make one version in the chosen direction."
      }
    ],
    other: [
      {
        keywords: ["decision", "unclear", "choose"],
        short: "Choose the next clear decision.",
        medium: "Make one concrete decision.",
        long: "Turn the next decision into one finished artifact."
      },
      {
        keywords: ["draft", "write", "outline"],
        short: "Write the first rough piece.",
        medium: "Draft one usable section.",
        long: "Finish one rough version."
      }
    ]
  };

  return libraries[type] ?? libraries.other;
}

function avoidFor(type, minutes) {
  if (minutes <= 15) return "Do not open a broad planning session; finish one tiny decision or draft.";
  if (minutes <= 45) return "Do not start anything that requires a full project review.";
  return {
    app: "Do not rebuild adjacent flows until this slice works.",
    book: "Do not revise the whole manuscript; stay with one section.",
    business: "Do not redesign the whole offer; test one customer-facing move.",
    content: "Do not plan the whole channel; finish one piece or section.",
    creative: "Do not chase every variation; make one visible version.",
    other: "Do not expand the scope; leave with one finished step."
  }[type] ?? "Do not expand the scope; leave with one finished step.";
}

function saveFor(type, context) {
  if (context.includes("stuck") || context.includes("blocker")) {
    return "Save what blocked you and the first smaller move that became clear.";
  }
  return {
    app: "Save the screen, flow, or decision that should be picked up next.",
    book: "Save the next sentence, scene, or section future-you should start with.",
    business: "Save the message, person, or decision that should happen next.",
    content: "Save the chosen angle, hook, or next edit.",
    creative: "Save what changed and what still needs deciding.",
    other: "Save where to continue and what future-you should not have to reconstruct."
  }[type] ?? "Save where to continue and what future-you should not have to reconstruct.";
}

function diagnoseBlocker(problem, project = activeProject()) {
  const text = problem.toLowerCase();
  let blockerType = "unclear next move";
  let recommendation = "Reduce the blocker before choosing a bigger work block.";

  if (text.includes("decision")) {
    blockerType = "decision ambiguity";
    recommendation = "Name the decision, write the two realistic options, and choose the one that protects momentum.";
  } else if (text.includes("overexplaining")) {
    blockerType = "message clarity";
    recommendation = "Write the idea in one sentence for the person it helps most.";
  } else if (text.includes("screen")) {
    blockerType = "experience mismatch";
    recommendation = "Identify the one moment that feels wrong and adjust only that moment.";
  } else if (text.includes("overwhelmed")) {
    blockerType = "too many open paths";
    recommendation = "Hide every path except the one that moves the current milestone.";
  } else if (text.includes("plan")) {
    blockerType = "missing sequence";
    recommendation = "Turn the goal into three ordered moves: first, next, later.";
  }

  const diagnosis = {
    id: `blocker-${Date.now()}`,
    problem,
    blockerType,
    recommendation,
    createdAt: new Date().toISOString()
  };

  if (project) {
    project.memory.blockers.push(diagnosis);
    project.milestoneHealth = "needs-attention";
    project.currentRecommendation = recommendNextMove(project, { availableTime: selectedTime });
    project.recommendations.push(project.currentRecommendation);
    saveCoffee(project, "Need Help", `${blockerType}: ${recommendation}`);
    saveState();
  }

  return diagnosis;
}

function saveProgress(status) {
  const project = activeProject();
  if (!project) return;

  document.querySelectorAll("[data-progress]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.progress === status);
  });

  const note = document.querySelector(".progress-note")?.value.trim() || "";
  const record = {
    id: `progress-${Date.now()}`,
    status,
    note,
    recommendationTitle: project.currentRecommendation?.title ?? "",
    createdAt: new Date().toISOString()
  };

  project.progress.push(record);
  project.whereLeftOff = progressLeftOff(record, project);
  project.milestoneHealth = status === "stuck" ? "needs-attention" : status === "partial" ? "watch" : "on-track";
  project.currentRecommendation = recommendNextMove(project, { availableTime: selectedTime });
  project.recommendations.push(project.currentRecommendation);
  project.updatedAt = new Date().toISOString();

  saveCoffee(project, "Progress saved", `${progressStatusLabel(status)} ${note}`.trim());
  saveState();
  renderAll();
}

function saveWhiteboard() {
  const project = activeProject();
  const note = document.querySelector(".idea-box")?.value.trim();
  if (!project || !note) return;

  project.memory.whiteboard.push({
    id: `whiteboard-${Date.now()}`,
    note,
    createdAt: new Date().toISOString()
  });
  project.whereLeftOff = "Whiteboard";
  project.updatedAt = new Date().toISOString();
  saveCoffee(project, "Whiteboard", note);
  saveState();
  renderAll();
}

function saveMessageFromActiveScreen(sendButton) {
  const project = activeProject();
  const screen = sendButton.closest(".screen");
  const input = screen?.querySelector(".message-bar input");
  const note = input?.value.trim();
  if (!project || !note) return;

  saveCoffee(project, "Conversation", note);
  project.whereLeftOff = note;
  project.updatedAt = new Date().toISOString();
  input.value = "";
  saveState();
  renderAll();

  if (screen?.dataset.screen === "help" || screen?.dataset.screen === "coach") {
    if (userBubble) userBubble.textContent = note;
    if (coachText) {
      coachText.textContent = `I saved that context. Given ${selectedTime}, the next useful move is still: ${project.currentRecommendation.title}`;
    }
    showScreen("coach");
  }
}

function renderHome() {
  const project = activeProject();
  if (!project) return;

  const healthCopy = milestoneHealthCopy(project);
  const trackStrong = document.querySelector(".track-card strong");
  const trackSpan = document.querySelector(".track-card span");
  const trackLight = document.querySelector(".track-light");
  if (trackStrong) trackStrong.textContent = healthCopy.title;
  if (trackSpan) trackSpan.textContent = healthCopy.detail;
  if (trackLight) trackLight.className = `track-light ${project.milestoneHealth}`;

  const continueCard = document.querySelector(".continue-card");
  if (continueCard) {
    continueCard.innerHTML = `
      <p>Where you left off</p>
      <strong>${escapeHtml(project.whereLeftOff)}</strong>
      <span>Current milestone: ${escapeHtml(project.milestone)}</span>
    `;
  }

  if (userBubble) userBubble.textContent = `I have ${selectedTime} today.`;
}

function renderNextMove() {
  const project = activeProject();
  if (!project) return;

  const recommendation = project.currentRecommendation ?? recommendNextMove(project, { availableTime: selectedTime });
  project.currentRecommendation = recommendation;

  const title = document.querySelector(".next-move-title");
  if (title) title.textContent = recommendation.title;

  const nextMoveSummary = document.querySelector(".screen-nextmove .work-card > p:not(.field-label)");
  if (nextMoveSummary) nextMoveSummary.textContent = recommendation.summary;

  const label = document.querySelector(".screen-nextmove .field-label");
  if (label) label.textContent = `For the next ${recommendation.estimatedMinutes} minutes`;

  const steps = document.querySelector(".next-steps");
  if (steps) {
    steps.innerHTML = recommendation.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  }
}

function renderProjects() {
  const list = document.querySelector(".project-list");
  if (!list) return;

  list.innerHTML = appState.projects.map((project) => `
    <button class="project-card ${project.id === appState.activeProjectId ? "active-project" : ""}" data-project-id="${project.id}">
      <div>
        <span class="project-status ${healthColor(project.milestoneHealth)}"></span>
        <strong>${escapeHtml(project.name)}</strong>
        <p>${escapeHtml(project.milestone)}</p>
      </div>
      <em>Next: ${escapeHtml(project.currentRecommendation?.title ?? project.whereLeftOff)}</em>
    </button>
  `).join("");
}

function renderCoffee() {
  const project = activeProject();
  const list = document.querySelector(".history-list");
  if (!project || !list) return;

  const items = project.memory.coffee.slice(-8).toReversed();
  list.innerHTML = items.length
    ? items.map((item) => `
      <button>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
        <em>${relativeDay(item.createdAt)}</em>
      </button>
    `).join("")
    : `<button><strong>No coffee history yet</strong><span>Conversations and saved decisions will appear here.</span><em>Today</em></button>`;
}

function renderWhiteboard() {
  const project = activeProject();
  const memoryNote = document.querySelector(".screen-prototype .memory-note");
  if (!project || !memoryNote) return;

  const latest = project.memory.whiteboard.at(-1);
  memoryNote.textContent = latest
    ? `Saved decision: ${latest.note}`
    : "IterNest saves the useful decisions from this Whiteboard so next time it remembers why you built it this way.";
}

function saveCoffee(project, title, detail) {
  project.memory.coffee.push({
    id: `coffee-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    detail,
    createdAt: new Date().toISOString()
  });
}

function setSelectedTime(time) {
  selectedTime = time;
  document.querySelectorAll("[data-time]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.time === time);
  });

  const project = activeProject();
  if (project) {
    project.currentRecommendation = recommendNextMove(project, { availableTime: time });
    project.recommendations.push(project.currentRecommendation);
    saveState();
  }

  if (userBubble) userBubble.textContent = `I have ${time} today.`;
  if (coachText && project) {
    coachText.innerHTML = `
      With ${escapeHtml(time)}, use where you left off instead of opening the whole project.
      <br><br>${escapeHtml(project.currentRecommendation.summary)}
    `;
  }
  renderAll();
}

function setCustomTime() {
  const raw = customTimeInput?.value.trim();
  if (!raw) return;
  const time = /minute|min|hour|hr/i.test(raw) ? raw : `${raw} minutes`;
  setSelectedTime(time);
  showScreen("coach");
}

document.addEventListener("click", (event) => {
  const menuTarget = event.target.closest(".menu-button");
  if (menuTarget) {
    showScreen("projects");
    return;
  }

  const setupTarget = event.target.closest("[data-go='home'].primary-start");
  if (setupTarget) {
    event.preventDefault();
    const milestone = document.querySelector(".setup-input")?.value.trim();
    const targetDate = document.querySelectorAll(".setup-input")[1]?.value.trim();
    createProject({ type: selectedProjectType, milestone, targetDate });
    showScreen("home");
    return;
  }

  const projectTarget = event.target.closest("[data-project-id]");
  if (projectTarget) {
    appState.activeProjectId = projectTarget.dataset.projectId;
    saveState();
    showScreen("home");
    return;
  }

  const newProjectTarget = event.target.closest(".new-project-button");
  if (newProjectTarget) {
    showScreen("welcome");
    return;
  }

  const progressTarget = event.target.closest("[data-progress]");
  if (progressTarget) {
    saveProgress(progressTarget.dataset.progress);
    return;
  }

  const customTimeTarget = event.target.closest('[data-action="custom-time"]');
  if (customTimeTarget) {
    setCustomTime();
    return;
  }

  const timeTarget = event.target.closest("[data-time]");
  if (timeTarget) {
    setSelectedTime(timeTarget.dataset.time);
    showScreen("coach");
    return;
  }

  const problemTarget = event.target.closest("[data-problem]");
  if (problemTarget) {
    const diagnosis = diagnoseBlocker(problemTarget.dataset.problem);
    if (userBubble) userBubble.textContent = problemTarget.dataset.problem;
    if (coachText) {
      coachText.innerHTML = `
        I hear this: "${escapeHtml(problemTarget.dataset.problem)}."
        <br><br>This looks like <strong>${escapeHtml(diagnosis.blockerType)}</strong>.
        <br><br>${escapeHtml(diagnosis.recommendation)}
      `;
    }
    showScreen("coach");
    return;
  }

  const voiceTarget = event.target.closest('[data-action="voice"]');
  if (voiceTarget) {
    if (thoughtInput) {
      thoughtInput.value = "I need help choosing the most useful next step from where I left off.";
      thoughtInput.focus();
    }
    return;
  }

  const sendTarget = event.target.closest(".message-bar .send");
  if (sendTarget && event.target.closest(".screen-prototype")) {
    saveWhiteboard();
    return;
  }

  if (sendTarget) {
    saveMessageFromActiveScreen(sendTarget);
    return;
  }

  const whiteboardToolTarget = event.target.closest(".tool-row button");
  if (whiteboardToolTarget) {
    const ideaBox = document.querySelector(".idea-box");
    if (ideaBox) {
      ideaBox.focus();
      if (!ideaBox.value.trim()) ideaBox.value = "I want to save this idea so I can pick it back up later.";
    }
    return;
  }

  const goTarget = event.target.closest("[data-go]");
  if (goTarget) {
    const destination = goTarget.dataset.go;
    if (destination === "coach") updateCoachFromHomeContext();
    showScreen(destination);
  }
});

function updateCoachFromHomeContext() {
  const project = activeProject();
  const thought = thoughtInput?.value.trim();
  if (!project) return;

  if (thought) {
    if (userBubble) userBubble.textContent = `I have ${selectedTime}. ${thought}`;
    if (coachText) {
      coachText.textContent = `Given ${selectedTime}, ${project.milestone}, and where you left off, the next useful move is: ${project.currentRecommendation.title}`;
    }
    saveCoffee(project, "Coffee", thought);
    saveState();
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeProjectId: null, projects: [] };
    const parsed = JSON.parse(raw);
    const projects = Array.isArray(parsed.projects) ? parsed.projects.map(normalizeProject) : [];
    return {
      activeProjectId: projects.some((project) => project.id === parsed.activeProjectId) ? parsed.activeProjectId : projects[0]?.id ?? null,
      projects
    };
  } catch {
    return { activeProjectId: null, projects: [] };
  }
}

function normalizeProject(project) {
  const normalized = {
    id: project.id ?? `project-${Date.now()}`,
    type: project.type ?? "other",
    name: project.name ?? projectTypeLabel(project.type ?? "other"),
    milestone: project.milestone ?? defaultMilestone(project.type ?? "other"),
    targetDate: project.targetDate ?? "",
    whereLeftOff: project.whereLeftOff ?? "Ready to begin.",
    milestoneHealth: project.milestoneHealth ?? "on-track",
    progress: Array.isArray(project.progress) ? project.progress : [],
    recommendations: Array.isArray(project.recommendations) ? project.recommendations : [],
    memory: {
      whiteboard: Array.isArray(project.memory?.whiteboard) ? project.memory.whiteboard : [],
      decisions: Array.isArray(project.memory?.decisions) ? project.memory.decisions : [],
      blockers: Array.isArray(project.memory?.blockers) ? project.memory.blockers : [],
      coffee: Array.isArray(project.memory?.coffee) ? project.memory.coffee : []
    },
    currentRecommendation: project.currentRecommendation ?? null,
    createdAt: project.createdAt ?? new Date().toISOString(),
    updatedAt: project.updatedAt ?? project.createdAt ?? new Date().toISOString()
  };

  if (!normalized.currentRecommendation) {
    normalized.currentRecommendation = recommendNextMove(normalized, { availableTime: selectedTime });
  }

  return normalized;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function parseMinutes(value) {
  const lower = String(value ?? "").toLowerCase();
  const number = Number(lower.match(/\d+/)?.[0] ?? 25);
  return lower.includes("hour") || lower.includes("hr") ? number * 60 : number;
}

function fillTemplate(value, project, blocker) {
  return value
    .replaceAll("{milestone}", project.milestone)
    .replaceAll("{project}", project.name)
    .replaceAll("{blocker}", blocker?.blockerType ?? "the current blocker");
}

function confidenceFor(project, lastProgress, blocker) {
  if (blocker || lastProgress?.status === "stuck") return "Medium";
  if (project.progress.length >= 2) return "High";
  return "Medium";
}

function readinessFor(project, blocker) {
  if (blocker) return "Blocker first";
  if (project.milestoneHealth === "needs-attention") return "Needs attention";
  return "Ready for next move";
}

function milestoneHealthCopy(project) {
  if (project.milestoneHealth === "needs-attention") {
    return {
      title: "Needs attention.",
      detail: "The latest blocker should be diagnosed before pushing the milestone forward."
    };
  }
  if (project.milestoneHealth === "watch") {
    return {
      title: "Still moving.",
      detail: "The milestone is active, but the next session should pick up from partial progress."
    };
  }
  return {
    title: "You're on track.",
    detail: `${project.milestone} still looks achievable if we take the next useful step.`
  };
}

function progressLeftOff(record, project) {
  if (record.status === "done") return project.currentRecommendation?.title ?? "Next move completed.";
  if (record.status === "partial") return record.note || "Partly done. Pick up from the last stopping point.";
  return record.note || "Stuck. Diagnose the blocker before choosing the next move.";
}

function progressStatusLabel(status) {
  return {
    done: "Done.",
    partial: "Partly done.",
    stuck: "Stuck."
  }[status] ?? "Progress saved.";
}

function projectTypeLabel(type) {
  return {
    app: "App Project",
    book: "Book Project",
    business: "Business Project",
    content: "Content Project",
    creative: "Creative Project",
    other: "Project"
  }[type] ?? "Project";
}

function defaultMilestone(type) {
  return {
    app: "Complete the next usable product flow",
    book: "Finish the next meaningful section",
    business: "Clarify the next customer-facing step",
    content: "Publish the next useful piece",
    creative: "Create the next visible version",
    other: "Move the project forward"
  }[type] ?? "Move the project forward";
}

function healthColor(health) {
  return health === "on-track" ? "green" : "yellow";
}

function relativeDay(value) {
  if (!value) return "Today";
  const then = new Date(value);
  const now = new Date();
  return then.toDateString() === now.toDateString() ? "Today" : then.toLocaleDateString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
