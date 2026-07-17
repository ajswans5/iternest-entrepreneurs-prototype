const STORAGE_KEY = "iternest_entrepreneurs_state_v1";

const bottomNav = document.querySelector(".bottom-nav");
const coachBubble = document.querySelector(".coach-bubble");
const userBubble = document.querySelector("#userBubble");
const thoughtInput = document.querySelector("#thoughtInput");
const customTimeInput = document.querySelector("#customTime");
const projectStoryInput = document.querySelector("#projectStory");
const understandingQuestion = document.querySelector("#understandingQuestion");
const understandingHelp = document.querySelector("#understandingHelp");
const understandingAnswer = document.querySelector("#understandingAnswer");
const understandingSummary = document.querySelector("#understandingSummary");
const timelineEditor = document.querySelector("#timelineEditor");
const Understanding = window.IterNestUnderstanding;

let selectedProjectType = "";
let selectedTime = "25 minutes";
let understandingDraft = null;
let pendingUnderstandingQuestion = null;
const appState = loadState();
selectedTime = appState.selectedTime || "25 minutes";

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

  resetProjectSetup();
}

function resetProjectSetup() {
  selectedProjectType = "";
  document.querySelectorAll(".setup-input").forEach((input) => {
    input.value = "";
  });
  if (projectStoryInput) projectStoryInput.value = "";
  document.querySelectorAll(".project-choice-grid button").forEach((button, index) => {
    button.classList.remove("is-selected");
  });
}

function ensureInitialProject() {
  if (appState.projects.length > 0 && appState.activeProjectId) return;
  saveState();
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === name);
  });

  const hideNavOn = new Set(["welcome", "coach", "prototype", "nextmove", "help", "complete"]);
  if (bottomNav) {
    bottomNav.classList.toggle("is-hidden", hideNavOn.has(name));
    bottomNav.classList.toggle("is-light", name !== "home");
  }

  renderAll();
}

function renderAll() {
  renderHome();
  renderCoach();
  renderNextMove();
  renderProjects();
  renderCoffee();
  renderWhiteboard();
}

function activeProject() {
  return appState.projects.find((project) => project.id === appState.activeProjectId) ?? null;
}

function createProject({ type, milestone, targetDate, understanding }) {
  const now = new Date().toISOString();
  const projectUnderstanding = Understanding?.normalizeUnderstanding(understanding) ?? null;
  const project = {
    id: `project-${Date.now()}`,
    type: projectUnderstanding?.projectType ?? type,
    name: projectUnderstanding?.projectName || projectTypeLabel(type),
    milestone: projectUnderstanding?.currentMilestone || milestone || defaultMilestone(type),
    targetDate: projectUnderstanding?.targetDate || targetDate || "",
    projectUnderstanding,
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
  const blocker = activeBlocker(project);
  if (project.projectUnderstanding && Understanding) {
    const recommendation = Understanding.buildRecommendationFromUnderstanding(project.projectUnderstanding, { availableTime });
    return {
      id: `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: recommendation.action,
      action: recommendation.action,
      startHere: recommendation.startHere,
      summary: recommendation.summary,
      whyThisComesNext: recommendation.whyThisComesNext,
      doneWhen: recommendation.doneWhen,
      steps: [
        `Start here: ${recommendation.startHere}`,
        `Done when: ${recommendation.doneWhen}`,
        `Avoid: ${recommendation.avoid}`,
        `Save your place: ${recommendation.save}`
      ],
      avoid: recommendation.avoid,
      save: recommendation.save,
      estimatedMinutes: minutes,
      confidence: recommendation.confidence,
      readiness: recommendation.readiness,
      importantAssumption: recommendation.importantAssumption,
      createdAt: new Date().toISOString()
    };
  }
  const workUnit = buildWorkUnit(project, minutes, lastProgress, blocker);

  return {
    id: `rec-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: workUnit.action,
    summary: workUnit.whyThis,
    steps: workUnit.steps || [
      "Open only the part of the project needed for this move.",
      "Stop when the time box ends or the useful move is complete.",
      "Leave a restart note so you do not have to reconstruct your thinking."
    ],
    avoid: workUnit.avoid,
    save: workUnit.save,
    estimatedMinutes: minutes,
    confidence: confidenceFor(project, lastProgress, blocker),
    readiness: readinessFor(project, blocker),
    createdAt: new Date().toISOString()
  };
}

function activeBlocker(project) {
  return [...(project.memory?.blockers || [])].reverse().find((item) => !item.resolvedAt) ?? null;
}

function buildWorkUnit(project, minutes, lastProgress, blocker) {
  const context = projectContextText(project);

  if (blocker || lastProgress?.status === "stuck") {
    return blockerWorkUnit(project, minutes, blocker, lastProgress);
  }

  const action = actionFor(project.type, context, minutes, lastProgress);
  return {
    action,
    whyThis: timeSpecificReason(project, minutes),
    avoid: avoidFor(project.type, minutes),
    save: saveFor(project.type, context),
    steps: timeBoxSteps(minutes)
  };
}

function blockerWorkUnit(project, minutes, blocker, lastProgress) {
  const problem = blocker?.problem || lastProgress?.note || "the point where progress stopped";
  const suggested = blocker?.recommendation || "Name the stuck point and reduce it to one move.";

  if (minutes <= 15) {
    return {
      action: "Name the exact stuck point and choose the smallest way around it.",
      whyThis: `A short session is enough to make ${problem.toLowerCase()} concrete without reopening the whole project.`,
      avoid: "Do not try to solve every connected problem in this session.",
      save: "Save the one smaller move you chose.",
      steps: ["Write the stuck point in one sentence.", suggested, "Choose one move that fits the remaining minutes."]
    };
  }

  if (minutes <= 30) {
    return {
      action: "Untangle the blocker and complete its first smaller move.",
      whyThis: `You have enough time to diagnose ${problem.toLowerCase()} and leave with visible progress.`,
      avoid: "Do not turn the diagnosis into a full project review.",
      save: "Save what was blocking you, what you tried, and the next restart point.",
      steps: [suggested, "Complete the first smaller move.", "Record what became clearer."]
    };
  }

  if (minutes <= 60) {
    return {
      action: "Work through the blocker until one path is usable.",
      whyThis: `This work block is long enough to move beyond naming ${problem.toLowerCase()} and test a practical path forward.`,
      avoid: "Do not redesign the entire project around one difficult moment.",
      save: "Save the usable path, the decision you made, and anything still uncertain.",
      steps: [suggested, "Test the most realistic option.", "Keep the path that restores momentum."]
    };
  }

  return {
    action: "Resolve the blocker, test the solution, and reset the next move.",
    whyThis: `A longer session can address ${problem.toLowerCase()}, verify the solution, and reconnect it to ${project.milestone}.`,
    avoid: "Do not expand into unrelated improvements after the blocker is resolved.",
    save: "Save the solution, evidence that it worked, and the next focused action.",
    steps: [suggested, "Implement or test the chosen solution.", "Confirm the next move before stopping."]
  };
}

function projectContextText(project) {
  const leftOff = project.whereLeftOff && project.whereLeftOff !== "Ready to begin." ? project.whereLeftOff : "";
  const latestWhiteboard = project.memory?.whiteboard?.at(-1)?.note || "";
  return `${leftOff} ${latestWhiteboard} ${project.milestone}`.toLowerCase();
}

function timeTier(minutes) {
  if (minutes <= 15) return "quick";
  if (minutes <= 30) return "focused";
  if (minutes <= 60) return "deep";
  return "extended";
}

function actionFor(type, context, minutes, lastProgress) {
  const actionSet = actionLibrary(type);
  const matched = actionSet.find((item) => item.keywords.some((keyword) => context.includes(keyword))) ?? actionSet[0];
  const tier = timeTier(minutes);
  let action = matched[tier];

  if (lastProgress?.status === "done" && lastProgress.recommendationTitle === action && actionSet.length > 1) {
    const alternate = actionSet.find((item) => item !== matched);
    action = alternate?.[tier] ?? action;
  }

  return action;
}

function actionLibrary(type) {
  const libraries = {
    app: [
      {
        keywords: ["onboarding", "signup", "sign up", "first run"],
        quick: "Decide the next onboarding screen.",
        focused: "Define the content and purpose of the next onboarding screen.",
        deep: "Finalize the onboarding flow and its screen-to-screen path.",
        extended: "Wire the onboarding flow and save what still needs testing."
      },
      {
        keywords: ["dashboard", "home"],
        quick: "Choose the one dashboard section that matters most.",
        focused: "Sketch the dashboard's information order.",
        deep: "Build a clickable dashboard layout.",
        extended: "Complete the dashboard flow and test its most important path."
      },
      {
        keywords: ["whiteboard", "canvas", "sketch"],
        quick: "Decide the Whiteboard's next visible behavior.",
        focused: "Define how one Whiteboard idea should be captured.",
        deep: "Wire the Whiteboard screen and its save behavior.",
        extended: "Make the Whiteboard save, restore, and display one useful decision."
      },
      {
        keywords: ["flow", "journey", "path"],
        quick: "Name the next screen in the flow.",
        focused: "Map the next three moments in the user flow.",
        deep: "Build one usable slice of the current flow.",
        extended: "Complete and test the current flow from entry to saved progress."
      }
    ],
    book: [
      {
        keywords: ["chapter 4", "chapter four"],
        quick: "Choose the purpose of Chapter 4.",
        focused: "Outline Chapter 4's main beats.",
        deep: "Draft the first substantial section of Chapter 4.",
        extended: "Write Chapter 4 until the next natural stopping point."
      },
      {
        keywords: ["chapter"],
        quick: "Choose what the next chapter must accomplish.",
        focused: "Outline the next chapter.",
        deep: "Draft one complete chapter section.",
        extended: "Move the chapter to a complete rough version."
      },
      {
        keywords: ["scene"],
        quick: "Choose what the scene must accomplish.",
        focused: "Outline the scene's turning point.",
        deep: "Draft the scene through its main change.",
        extended: "Draft the scene and mark the next scene's starting point."
      },
      {
        keywords: ["opening", "paragraph", "intro"],
        quick: "Choose the opening's clearest promise.",
        focused: "Rewrite the opening paragraph.",
        deep: "Rewrite the opening page.",
        extended: "Revise the opening section and save the next edit."
      }
    ],
    business: [
      {
        keywords: ["email", "customer", "client"],
        quick: "Write the core sentence of one customer email.",
        focused: "Draft one customer email.",
        deep: "Write and refine one customer email.",
        extended: "Finish the email and prepare the first recipient list."
      },
      {
        keywords: ["pricing", "price"],
        quick: "Write the pricing question you need answered.",
        focused: "Draft one pricing test or customer question.",
        deep: "Validate pricing with one person or one evidence source.",
        extended: "Prepare the pricing ask, send it, and save what to compare."
      },
      {
        keywords: ["landing", "headline", "page"],
        quick: "Draft the landing page's main promise.",
        focused: "Draft the headline and subhead.",
        deep: "Draft the first landing-page section.",
        extended: "Build the first complete landing-page pass."
      },
      {
        keywords: ["offer", "launch"],
        quick: "Write the offer in one sentence.",
        focused: "Define the offer, audience, and next ask.",
        deep: "Draft the first customer-facing offer.",
        extended: "Finish the offer and prepare it for one real test."
      }
    ],
    content: [
      {
        keywords: ["hook", "hooks"],
        quick: "Write three opening ideas.",
        focused: "Write five openings and choose the strongest one.",
        deep: "Draft the opening, outline, and first section.",
        extended: "Create a complete rough piece from opening through call to action."
      },
      {
        keywords: ["outline"],
        quick: "Write the three essential points.",
        focused: "Draft one usable outline.",
        deep: "Draft the outline and first section.",
        extended: "Turn the outline into a complete rough piece."
      },
      {
        keywords: ["record", "video", "section"],
        quick: "Choose the one section to record.",
        focused: "Prepare and rehearse one section.",
        deep: "Record one complete section.",
        extended: "Record the piece and note the next edit."
      },
      {
        keywords: ["post", "publish"],
        quick: "Choose the post angle.",
        focused: "Draft one post.",
        deep: "Draft and revise one publishable post.",
        extended: "Finish, format, and prepare one post to publish."
      }
    ],
    creative: [
      {
        keywords: ["version", "draft", "pass"],
        quick: "Choose the next visible change.",
        focused: "Make one focused creative pass.",
        deep: "Create the next rough version.",
        extended: "Complete a version and compare it against the intended direction."
      },
      {
        keywords: ["decision", "style", "direction"],
        quick: "Choose one creative direction to test.",
        focused: "Make a small test in one direction.",
        deep: "Build one full pass in the chosen direction.",
        extended: "Complete, review, and refine one version in that direction."
      }
    ],
    other: [
      {
        keywords: ["decision", "unclear", "choose"],
        quick: "Name the next clear decision.",
        focused: "Make one concrete decision and record why.",
        deep: "Turn the decision into one usable artifact.",
        extended: "Complete the artifact and define the next decision."
      },
      {
        keywords: ["draft", "write", "outline"],
        quick: "Write the first rough piece.",
        focused: "Draft one usable section.",
        deep: "Finish one rough version.",
        extended: "Complete and review the rough version."
      }
    ]
  };

  return libraries[type] ?? libraries.other;
}

function timeSpecificReason(project, minutes) {
  if (minutes <= 15) return `This is a small, finishable decision that moves ${project.milestone} without opening a larger work session.`;
  if (minutes <= 30) return `This uses a focused half-hour to create visible progress toward ${project.milestone}.`;
  if (minutes <= 60) return `This gives you enough room to produce a usable piece of ${project.milestone}, not merely plan it.`;
  return `This longer block can complete and test a meaningful slice of ${project.milestone} while preserving a clear restart point.`;
}

function timeBoxSteps(minutes) {
  if (minutes <= 15) return ["Open only what you need.", "Make the one decision or tiny draft.", "Write one sentence about where to restart."];
  if (minutes <= 30) return ["Spend the first few minutes confirming the outcome.", "Use most of the session to produce the work.", "Save the next natural move before stopping."];
  if (minutes <= 60) return ["Define what a usable result looks like.", "Build the result without widening the scope.", "Review it once and save what remains."];
  return ["Choose the complete slice you can finish.", "Build and test that slice.", "Record the result, remaining uncertainty, and next move."];
}

function avoidFor(type, minutes) {
  if (minutes <= 15) return "Do not open a broad planning session; finish one tiny decision or draft.";
  if (minutes <= 30) return "Do not spend the whole session reorganizing or rereading the project.";
  if (minutes <= 60) return "Do not widen the scope after you have chosen the usable result for this session.";
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
    content: "Save the chosen angle, opening, or next edit.",
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
    resolvedAt: null,
    createdAt: new Date().toISOString()
  };

  if (project) {
    project.memory.blockers.push(diagnosis);
    project.milestoneHealth = "needs-attention";
    project.whereLeftOff = problem;
    regenerateRecommendation(project);
    saveCoffee(project, "Need Help", `${blockerType}: ${recommendation}`);
    saveState();
  }

  return diagnosis;
}

function resolveActiveBlockers(project) {
  const resolvedAt = new Date().toISOString();
  project.memory.blockers.forEach((blocker) => {
    if (!blocker.resolvedAt) blocker.resolvedAt = resolvedAt;
  });
}

function saveProgress(status) {
  const project = activeProject();
  if (!project) return;

  document.querySelectorAll("[data-progress]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.progress === status);
  });

  const note = document.querySelector(".progress-note")?.value.trim() || "";
  const completedAction = project.currentRecommendation?.title ?? "Your focused work session";
  const record = {
    id: `progress-${Date.now()}`,
    status,
    note,
    recommendationTitle: completedAction,
    createdAt: new Date().toISOString()
  };

  project.progress.push(record);
  if (project.projectUnderstanding && Understanding?.applyProgressToUnderstanding) {
    project.projectUnderstanding = Understanding.applyProgressToUnderstanding(project.projectUnderstanding, record);
  }

  if (status === "done") {
    resolveActiveBlockers(project);
    project.milestoneHealth = "on-track";
    project.whereLeftOff = note || `Completed: ${completedAction}`;
  } else if (status === "partial") {
    project.milestoneHealth = "watch";
    project.whereLeftOff = note || `Continue: ${completedAction}`;
  } else {
    project.milestoneHealth = "needs-attention";
    project.whereLeftOff = note || `Stuck while working on: ${completedAction}`;
  }

  regenerateRecommendation(project);
  const resumePoint = project.currentRecommendation?.title || project.whereLeftOff;
  if (status === "done") project.whereLeftOff = `Next: ${resumePoint}`;

  project.updatedAt = new Date().toISOString();
  saveCoffee(project, "Progress saved", `${progressStatusLabel(status)} ${note}`.trim());
  saveState();
  renderAll();

  document.dispatchEvent(new CustomEvent("iternest:progress-saved", {
    detail: {
      status,
      completedAction,
      resumePoint,
      milestoneStatus: milestoneHealthCopy(project).title
    }
  }));
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
  if (project.projectUnderstanding) {
    project.projectUnderstanding.confirmedFacts.push(`Whiteboard note: ${note}`);
    project.projectUnderstanding.continuity = {
      ...(project.projectUnderstanding.continuity || {}),
      whereWorkStopped: "Whiteboard",
      doNotForget: note
    };
    project.projectUnderstanding.updatedAt = new Date().toISOString();
  }
  project.whereLeftOff = note;
  project.updatedAt = new Date().toISOString();
  regenerateRecommendation(project);
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
  if (project.projectUnderstanding) {
    project.projectUnderstanding.confirmedFacts.push(`Conversation note: ${note}`);
    project.projectUnderstanding.continuity = {
      ...(project.projectUnderstanding.continuity || {}),
      whereWorkStopped: note,
      doNotForget: note
    };
    project.projectUnderstanding.updatedAt = new Date().toISOString();
  }
  project.whereLeftOff = note;
  project.updatedAt = new Date().toISOString();
  input.value = "";
  regenerateRecommendation(project);
  saveState();
  renderAll();

  if (screen?.dataset.screen === "help" || screen?.dataset.screen === "coach") {
    if (userBubble) userBubble.textContent = note;
    showScreen("coach");
  }
}

function regenerateRecommendation(project, time = selectedTime) {
  project.currentRecommendation = recommendNextMove(project, { availableTime: time });
  project.recommendations.push(project.currentRecommendation);
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
    const understanding = project.projectUnderstanding;
    const stage = understanding?.currentStage || "Unknown stage";
    continueCard.innerHTML = `
      <p>Where you left off</p>
      <strong>${escapeHtml(project.whereLeftOff)}</strong>
      <span>${escapeHtml(stage)} · ${escapeHtml(project.milestone)}</span>
    `;
  }

  document.querySelectorAll("[data-time]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.time === selectedTime);
  });
}

function renderCoach() {
  const project = activeProject();
  if (!project || !coachBubble) return;

  const recommendation = project.currentRecommendation ?? recommendNextMove(project, { availableTime: selectedTime });
  project.currentRecommendation = recommendation;
  const isLowTrust = recommendation.confidence === "Low";

  if (isLowTrust) {
    coachBubble.innerHTML = `
      <p>I don't understand enough yet to recommend something I trust.</p>
      <p><strong>I have one question.</strong><br>${escapeHtml(recommendation.startHere || "Tell me a little more about where this project is right now.")}</p>
      <p>Let's keep working through it.</p>
    `;
    return;
  }

  coachBubble.innerHTML = `
    <p>With ${escapeHtml(selectedTime)}, here's the next useful move.</p>
    <p class="focus-label">Action</p>
    <p><strong>${escapeHtml(recommendation.title)}</strong></p>
    <p class="focus-label">Start here</p>
    <p>${escapeHtml(recommendation.startHere || recommendation.steps?.[0] || "Start with the first visible piece.")}</p>
    <p class="focus-label">Done when</p>
    <p>${escapeHtml(recommendation.doneWhen || "You have one finished next step.")}</p>
    <details class="why-details">
      <summary>Why?</summary>
      <p>${escapeHtml(recommendation.whyThisComesNext || recommendation.summary)}</p>
      <p><strong>Avoid:</strong> ${escapeHtml(recommendation.avoid)}</p>
      <p><strong>Save your place:</strong> ${escapeHtml(recommendation.save)}</p>
      <p><strong>How sure I am:</strong> ${escapeHtml(recommendation.confidence)}</p>
      ${recommendation.importantAssumption ? `<p><strong>One thing I am assuming:</strong> ${escapeHtml(recommendation.importantAssumption)}</p>` : ""}
    </details>
  `;
}

function renderNextMove() {
  const project = activeProject();
  if (!project) return;

  const recommendation = project.currentRecommendation ?? recommendNextMove(project, { availableTime: selectedTime });
  project.currentRecommendation = recommendation;

  const title = document.querySelector(".next-move-title");
  if (title) title.textContent = recommendation.title;

  const nextMoveSummary = document.querySelector(".screen-nextmove .work-card > p:not(.field-label)");
  if (nextMoveSummary) nextMoveSummary.textContent = recommendation.startHere || recommendation.summary;

  const label = document.querySelector(".screen-nextmove .field-label");
  if (label) label.textContent = `For the next ${recommendation.estimatedMinutes} minutes`;

  const steps = document.querySelector(".next-steps");
  if (steps) {
    const structuredSteps = [
      `Done when: ${recommendation.doneWhen || "The next useful output exists."}`,
      `Why: ${recommendation.whyThisComesNext || recommendation.summary}`
    ];
    steps.innerHTML = structuredSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
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
      <article class="history-item">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
        <em>${relativeDay(item.createdAt)}</em>
      </article>
    `).join("")
    : `<article class="history-item"><strong>No coffee history yet</strong><span>Conversations and saved decisions will appear here.</span><em>Today</em></article>`;
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
  appState.selectedTime = time;

  document.querySelectorAll("[data-time]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.time === time);
  });

  const project = activeProject();
  if (project) regenerateRecommendation(project, time);
  saveState();

  if (userBubble) userBubble.textContent = `I have ${time} today.`;
  renderAll();
}

function setCustomTime() {
  const raw = customTimeInput?.value.trim();
  if (!raw) return;
  const time = /minute|min|hour|hr/i.test(raw) ? raw : `${raw} minutes`;
  const thought = applyHomeContext();
  setSelectedTime(time);
  if (thought && userBubble) userBubble.textContent = `I have ${selectedTime}. ${thought}`;
  showScreen("coach");
}

function applyHomeContext() {
  const project = activeProject();
  const thought = thoughtInput?.value.trim();
  if (!project || !thought) return "";

  const alreadySaved = project.whereLeftOff === thought;
  project.whereLeftOff = thought;
  if (project.projectUnderstanding) {
    project.projectUnderstanding.continuity = {
      ...(project.projectUnderstanding.continuity || {}),
      whereWorkStopped: thought,
      doNotForget: thought
    };
    project.projectUnderstanding.updatedAt = new Date().toISOString();
  }
  project.updatedAt = new Date().toISOString();
  if (!alreadySaved) saveCoffee(project, "Current context", thought);
  return thought;
}

function startUnderstandingFlow() {
  const story = projectStoryInput?.value.trim() || "";
  if (!story) {
    if (projectStoryInput) {
      projectStoryInput.focus();
      projectStoryInput.placeholder = "Start with a few sentences about the project, where it is now, and where you want it to go.";
    }
    return;
  }

  understandingDraft = Understanding.createUnderstandingFromStory(story, selectedProjectType);
  moveUnderstandingForward();
}

function moveUnderstandingForward() {
  if (!understandingDraft) return;
  pendingUnderstandingQuestion = Understanding.hasEnoughForReflection?.(understandingDraft)
    ? null
    : Understanding.selectNextQuestion(understandingDraft);

  if (pendingUnderstandingQuestion) {
    renderUnderstandingQuestion();
    showScreen("understanding");
    return;
  }

  renderUnderstandingConfirmation();
  showScreen("confirm");
}
function renderUnderstandingQuestion() {
  if (!pendingUnderstandingQuestion) return;
  if (understandingQuestion) understandingQuestion.textContent = pendingUnderstandingQuestion.prompt;
  if (understandingHelp) understandingHelp.textContent = pendingUnderstandingQuestion.help;
  if (understandingAnswer) understandingAnswer.value = "";
}

function answerUnderstandingQuestion(skip = false) {
  if (!understandingDraft || !pendingUnderstandingQuestion) return;
  const answer = skip ? "" : understandingAnswer?.value.trim() || "";
  if (answer) {
    understandingDraft = Understanding.applyQuestionAnswer(understandingDraft, pendingUnderstandingQuestion.id, answer);
  } else {
    understandingDraft.askedQuestionIds = [...new Set([...(understandingDraft.askedQuestionIds || []), pendingUnderstandingQuestion.id])];
  }
  pendingUnderstandingQuestion = null;
  moveUnderstandingForward();
}
function renderUnderstandingConfirmation() {
  if (!understandingDraft || !understandingSummary || !timelineEditor) return;
  const summary = Understanding.summaryForConfirmation(understandingDraft);
  understandingSummary.innerHTML = [
    ["You're making", summary.created],
    ["You want it to become", summary.intendedOutcome],
    ["It's for", summary.audience],
    ["Right now", summary.currentStage],
    ["Already happened", summary.completedWork],
    ["What is getting in the way", summary.currentBottleneck],
    ["What that prevents", summary.bottleneckPrevents],
    ["Next meaningful step", summary.nextMilestone],
    ["Timing", summary.targetDate],
    ["What might make it harder", summary.constraints],
    ["Still uncertain", summary.unknowns],
    ["The path I see", summary.likelyPath]
  ].map(([label, value]) => `
    <div class="summary-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "Unknown")}</strong>
    </div>
  `).join("");

  timelineEditor.innerHTML = understandingDraft.projectTimeline.map((stage, index) => `
    <div class="timeline-stage">
      <label>
        <span>Part of the path</span>
        <input data-stage-name="${index}" value="${escapeHtml(stage.name)}" />
      </label>
      <label>
        <span>What this part needs to produce</span>
        <textarea data-stage-output="${index}">${escapeHtml(stage.requiredOutput)}</textarea>
      </label>
      <select data-stage-status="${index}" aria-label="Status for ${escapeHtml(stage.name)}">
        ${Understanding.STAGE_STATUSES.map((status) => `<option value="${status}" ${status === stage.status ? "selected" : ""}>${status}</option>`).join("")}
      </select>
    </div>
  `).join("");
}
function confirmUnderstandingFlow() {
  if (!understandingDraft) return;
  const updates = {};
  document.querySelectorAll("[data-stage-status]").forEach((select) => {
    const index = select.dataset.stageStatus;
    updates[index] = {
      status: select.value,
      name: document.querySelector(`[data-stage-name="${index}"]`)?.value.trim(),
      requiredOutput: document.querySelector(`[data-stage-output="${index}"]`)?.value.trim()
    };
  });
  const confirmed = Understanding.confirmUnderstanding(understandingDraft, updates);
  createProject({
    type: confirmed.projectType,
    milestone: confirmed.currentMilestone,
    targetDate: confirmed.targetDate,
    understanding: confirmed
  });
  understandingDraft = null;
  pendingUnderstandingQuestion = null;
  showScreen("home");
}

function editUnderstandingFlow() {
  if (!understandingDraft) return;
  pendingUnderstandingQuestion = {
    id: "correction",
    prompt: "What should I change?",
    help: "Tell me only what feels wrong or incomplete. I'll update that part and show you the project again."
  };
  renderUnderstandingQuestion();
  showScreen("understanding");
}

document.addEventListener("click", (event) => {
  const menuTarget = event.target.closest(".menu-button");
  if (menuTarget) {
    showScreen("projects");
    return;
  }

  const setupTarget = event.target.closest('[data-action="start-understanding"]');
  if (setupTarget) {
    event.preventDefault();
    startUnderstandingFlow();
    return;
  }

  const answerUnderstandingTarget = event.target.closest('[data-action="answer-understanding"]');
  if (answerUnderstandingTarget) {
    answerUnderstandingQuestion(false);
    return;
  }

  const skipUnderstandingTarget = event.target.closest('[data-action="skip-understanding"]');
  if (skipUnderstandingTarget) {
    answerUnderstandingQuestion(true);
    return;
  }

  const confirmUnderstandingTarget = event.target.closest('[data-action="confirm-understanding"]');
  if (confirmUnderstandingTarget) {
    confirmUnderstandingFlow();
    return;
  }

  const editUnderstandingTarget = event.target.closest('[data-action="edit-understanding"]');
  if (editUnderstandingTarget) {
    editUnderstandingFlow();
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
    resetProjectSetup();
    understandingDraft = null;
    pendingUnderstandingQuestion = null;
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
    const thought = applyHomeContext();
    setSelectedTime(timeTarget.dataset.time);
    if (thought && userBubble) userBubble.textContent = `I have ${selectedTime}. ${thought}`;
    showScreen("coach");
    return;
  }

  const problemTarget = event.target.closest("[data-problem]");
  if (problemTarget) {
    diagnoseBlocker(problemTarget.dataset.problem);
    if (userBubble) userBubble.textContent = problemTarget.dataset.problem;
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
  const thought = applyHomeContext();
  if (!project || !thought) return;

  if (userBubble) userBubble.textContent = `I have ${selectedTime}. ${thought}`;
  regenerateRecommendation(project);
  saveState();
  renderAll();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeProjectId: null, projects: [], selectedTime: "25 minutes" };
    const parsed = JSON.parse(raw);
    const projects = Array.isArray(parsed.projects) ? parsed.projects.map(normalizeProject) : [];
    return {
      activeProjectId: projects.some((project) => project.id === parsed.activeProjectId) ? parsed.activeProjectId : projects[0]?.id ?? null,
      projects,
      selectedTime: parsed.selectedTime || "25 minutes"
    };
  } catch {
    return { activeProjectId: null, projects: [], selectedTime: "25 minutes" };
  }
}

function normalizeProject(project) {
  const migratedUnderstanding = Understanding?.migrateProjectToUnderstanding(project) ?? project.projectUnderstanding ?? null;
  const normalized = {
    id: project.id ?? `project-${Date.now()}`,
    type: migratedUnderstanding?.projectType ?? project.type ?? "other",
    name: project.name ?? migratedUnderstanding?.projectName ?? projectTypeLabel(project.type ?? "other"),
    milestone: project.milestone ?? migratedUnderstanding?.currentMilestone ?? defaultMilestone(project.type ?? "other"),
    targetDate: project.targetDate ?? migratedUnderstanding?.targetDate ?? "",
    projectUnderstanding: migratedUnderstanding,
    whereLeftOff: normalizeStartingPoint(project),
    milestoneHealth: project.milestoneHealth ?? "on-track",
    progress: Array.isArray(project.progress) ? project.progress : [],
    recommendations: Array.isArray(project.recommendations) ? project.recommendations : [],
    memory: {
      whiteboard: Array.isArray(project.memory?.whiteboard) ? project.memory.whiteboard : [],
      decisions: Array.isArray(project.memory?.decisions) ? project.memory.decisions : [],
      blockers: Array.isArray(project.memory?.blockers)
        ? project.memory.blockers.map((blocker) => ({ ...blocker, resolvedAt: blocker.resolvedAt ?? null }))
        : [],
      coffee: Array.isArray(project.memory?.coffee) ? project.memory.coffee : []
    },
    currentRecommendation: project.currentRecommendation ?? null,
    createdAt: project.createdAt ?? new Date().toISOString(),
    updatedAt: project.updatedAt ?? project.createdAt ?? new Date().toISOString()
  };

  if (!normalized.currentRecommendation) {
    normalized.currentRecommendation = recommendNextMove(normalized, { availableTime: selectedTime || "25 minutes" });
  }

  return normalized;
}

function normalizeStartingPoint(project) {
  const whereLeftOff = project.whereLeftOff ?? "Ready to begin.";
  const hasRealProgress = Array.isArray(project.progress) && project.progress.length > 0;
  const hasSavedMemory = Boolean(
    project.memory?.whiteboard?.length ||
    project.memory?.blockers?.length ||
    project.memory?.coffee?.some((item) => item.title !== "First-run setup")
  );

  if (!hasRealProgress && !hasSavedMemory && whereLeftOff === project.currentRecommendation?.title) {
    return "Ready to begin.";
  }

  return whereLeftOff;
}

function saveState() {
  appState.selectedTime = selectedTime;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function parseMinutes(value) {
  const lower = String(value ?? "").toLowerCase();
  const number = Number(lower.match(/\d+/)?.[0] ?? 25);
  return lower.includes("hour") || lower.includes("hr") ? number * 60 : number;
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
      detail: "The latest stuck point should be reduced before pushing the milestone forward."
    };
  }
  if (project.milestoneHealth === "watch") {
    return {
      title: "Still moving.",
      detail: "The milestone is active, and the next session will pick up from partial progress."
    };
  }
  return {
    title: "You're on track.",
    detail: `${project.milestone} still looks achievable if we take the next useful step.`
  };
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