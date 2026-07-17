(function (global) {
  const STAGE_STATUSES = ["not started", "ready", "active", "waiting", "blocked", "complete", "skipped", "unknown"];

  const TIMELINE_TEMPLATES = {
    app: [
      ["Define the user path", "Clarify who starts here and what they need to accomplish.", "A named user, starting point, and successful end state."],
      ["Shape the core flow", "Turn the path into ordered screens or steps.", "A complete flow outline with each screen's job."],
      ["Build the usable slice", "Make the smallest version someone can click through.", "A working slice that reaches the milestone."],
      ["Test with a real person", "Find what breaks, confuses, or fails to matter.", "Notes from one real walkthrough."],
      ["Prepare launch", "Make the experience ready to share more broadly.", "A shareable version with obvious rough edges removed."]
    ],
    book: [
      ["Define the reader promise", "Clarify what the reader should receive from the book.", "A clear reader, promise, and point of view."],
      ["Shape the structure", "Create the order that makes the book understandable.", "A chapter or section map."],
      ["Draft the current section", "Turn the structure into actual pages.", "A rough draft of the next meaningful section."],
      ["Revise for clarity", "Make the draft easier to follow.", "A revised section with the main idea intact."],
      ["Prepare to share", "Get the work ready for a reader, editor, or next review.", "A readable excerpt or draft package."]
    ],
    business: [
      ["Define the offer", "Clarify who you help and what they get.", "A one-sentence offer and target customer."],
      ["Validate demand", "Learn whether a real person wants it.", "One customer conversation, reply, or signal."],
      ["Shape the sales path", "Decide how someone hears about it and says yes.", "A simple path from first contact to next step."],
      ["Deliver the first version", "Create the smallest useful version of the offer.", "A deliverable that can help one customer."],
      ["Improve and repeat", "Use evidence to make the offer easier to sell or deliver.", "A clear improvement from real feedback."]
    ],
    content: [
      ["Define audience and message", "Clarify who it is for and what they should understand.", "One audience, one central message, and one desired action."],
      ["Build the outline", "Create the order before recording or publishing.", "An opening, main sections, and ending."],
      ["Draft the script or post", "Turn the outline into publishable words.", "A rough script, post, or content draft."],
      ["Create or record", "Produce the actual content asset.", "Usable recording, draft, or media for the piece."],
      ["Edit and publish", "Make the piece clear enough to share.", "A finished version with title, description, or publish details."]
    ],
    creative: [
      ["Define the direction", "Choose what this version should become.", "A clear creative direction and success signal."],
      ["Create the rough version", "Make the idea visible.", "A rough version that can be reacted to."],
      ["Refine the strongest part", "Improve what is working before expanding.", "One improved version with the core choice preserved."],
      ["Prepare to share", "Make the work understandable to someone else.", "A shareable version or explanation."],
      ["Decide the next iteration", "Use feedback or taste to choose the next pass.", "A specific next change."]
    ],
    other: [
      ["Define the destination", "Clarify what finished should mean.", "A concrete outcome and who it serves."],
      ["Find the current stage", "Identify where the project actually is.", "A named current stage and next dependency."],
      ["Create the next artifact", "Make one visible piece of progress.", "One finished artifact or decision."],
      ["Review what changed", "Check whether the work moved the project forward.", "A saved result and next natural move."],
      ["Prepare the next handoff", "Make tomorrow easier to start.", "A clear place to pick up."]
    ]
  };

  function createUnderstandingFromStory(story, shortcutType = "") {
    const text = clean(story);
    const type = shortcutType || inferProjectType(text);
    const targetDate = inferTargetDate(text);
    const currentStage = inferCurrentStage(text);
    const completedWork = inferList(text, ["already", "finished", "completed", "done", "have"]);
    const blockers = inferList(text, ["stuck", "blocked", "blocker", "in the way", "unclear", "waiting"]);
    const constraints = inferList(text, ["deadline", "constraint", "limited", "only", "before", "by"]);
    const dependencies = inferList(text, ["waiting on", "depends", "need someone", "approval", "feedback"]);
    const intendedOutcome = inferOutcome(text);
    const audience = inferAudience(text);
    const currentMilestone = inferMilestone(text, type);

    const model = normalizeUnderstanding({
      version: "project-understanding-v1",
      confirmed: false,
      projectName: inferProjectName(text, type),
      projectType: type,
      projectDescription: text,
      intendedOutcome,
      audience,
      currentMilestone,
      currentStage,
      completedWork,
      activeWork: inferList(text, ["working on", "currently", "right now"]),
      openDecisions: inferList(text, ["decide", "decision", "choose", "figure out"]),
      constraints,
      blockers,
      dependencies,
      targetDate,
      dateFlexibility: targetDate ? "unknown" : "unknown",
      typicalWorkSessionLength: inferSessionLength(text),
      projectTimeline: [],
      confirmedFacts: text ? [`Project description: ${text}`] : [],
      inferredFacts: [],
      assumptions: [],
      unknowns: [],
      confidenceByField: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    addInference(model, "projectType", model.projectType, shortcutType ? "chosen shortcut" : "detected from project words");
    addInference(model, "projectName", model.projectName, "temporary working name");
    markField(model, "projectDescription", text ? "high" : "missing");
    markField(model, "intendedOutcome", intendedOutcome ? "medium" : "missing");
    markField(model, "audience", audience ? "medium" : "missing");
    markField(model, "currentStage", currentStage ? "medium" : "missing");
    markField(model, "completedWork", completedWork.length ? "medium" : "missing");
    markField(model, "targetDate", targetDate ? "medium" : "missing");
    markField(model, "dependencies", dependencies.length ? "medium" : "missing");
    refreshUnknowns(model);
    model.projectTimeline = buildTimeline(model);
    return model;
  }

  function normalizeUnderstanding(input = {}) {
    const model = {
      version: input.version || "project-understanding-v1",
      confirmed: Boolean(input.confirmed),
      projectName: input.projectName || "",
      projectType: input.projectType || "other",
      projectDescription: input.projectDescription || "",
      intendedOutcome: input.intendedOutcome || "",
      audience: input.audience || "",
      currentMilestone: input.currentMilestone || "",
      currentStage: input.currentStage || "",
      completedWork: asArray(input.completedWork),
      activeWork: asArray(input.activeWork),
      openDecisions: asArray(input.openDecisions),
      constraints: asArray(input.constraints),
      blockers: asArray(input.blockers),
      dependencies: asArray(input.dependencies),
      targetDate: input.targetDate || "",
      dateFlexibility: input.dateFlexibility || "unknown",
      typicalWorkSessionLength: input.typicalWorkSessionLength || "",
      projectTimeline: Array.isArray(input.projectTimeline) ? input.projectTimeline : [],
      confirmedFacts: asArray(input.confirmedFacts),
      inferredFacts: asArray(input.inferredFacts),
      assumptions: asArray(input.assumptions),
      unknowns: asArray(input.unknowns),
      confidenceByField: input.confidenceByField || {},
      continuity: input.continuity || {
        whereWorkStopped: "",
        whatChanged: "",
        whatRemainsOpen: "",
        nextNaturalMove: "",
        doNotForget: ""
      },
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: input.updatedAt || new Date().toISOString()
    };

    if (!model.projectTimeline.length) model.projectTimeline = buildTimeline(model);
    refreshUnknowns(model);
    return model;
  }

  function migrateProjectToUnderstanding(project = {}) {
    if (project.projectUnderstanding) return normalizeUnderstanding(project.projectUnderstanding);
    const type = project.type || "other";
    return normalizeUnderstanding({
      confirmed: true,
      projectName: project.name || projectTypeLabel(type),
      projectType: type,
      projectDescription: project.milestone || "",
      intendedOutcome: project.milestone || "",
      audience: "",
      currentMilestone: project.milestone || defaultMilestone(type),
      currentStage: "unknown",
      completedWork: Array.isArray(project.progress) ? project.progress.map((item) => item.recommendationTitle || item.note).filter(Boolean) : [],
      activeWork: project.whereLeftOff && project.whereLeftOff !== "Ready to begin." ? [project.whereLeftOff] : [],
      openDecisions: [],
      constraints: project.targetDate ? [`Target date: ${project.targetDate}`] : [],
      blockers: Array.isArray(project.memory?.blockers) ? project.memory.blockers.map((item) => item.blockerType || item.problem).filter(Boolean) : [],
      dependencies: [],
      targetDate: project.targetDate || "",
      dateFlexibility: project.targetDate ? "unknown" : "unknown",
      typicalWorkSessionLength: "",
      confirmedFacts: ["Migrated from existing beta project memory."],
      inferredFacts: ["Some fields were reconstructed from the previous project format."],
      assumptions: ["Current stage may need confirmation."],
      confidenceByField: {
        projectName: "medium",
        projectType: "medium",
        projectDescription: project.milestone ? "medium" : "missing",
        currentStage: "missing"
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
  }

  function selectNextQuestion(model) {
    const checks = [
      ["currentStage", "Where are you right now: planning, building, testing, launching, or something else?", "This helps me avoid recommending work from the wrong stage."],
      ["intendedOutcome", "What does finished look like for this project?", "For example: a published video, a usable beta, a finished chapter, or a first paying customer."],
      ["completedWork", "What have you already completed?", "A short answer is enough. I only need what should not be repeated."],
      ["targetDate", "Is there a date this needs to be finished?", "Say no date yet if the timing is flexible."],
      ["dependencies", "Is anything waiting on another person, tool, or decision?", "This keeps me from suggesting work that cannot move yet."]
    ];

    const missing = checks.find(([field]) => isMissing(model, field));
    if (!missing) return null;
    return { id: missing[0], prompt: missing[1], help: missing[2] };
  }

  function applyQuestionAnswer(model, questionId, answer) {
    const next = normalizeUnderstanding(model);
    const value = clean(answer);
    if (!value) return next;

    if (questionId === "completedWork" || questionId === "dependencies") {
      next[questionId] = splitList(value);
    } else if (questionId === "targetDate") {
      if (/no|none|flexible|not yet|unknown/i.test(value)) {
        next.targetDate = "";
        next.dateFlexibility = "flexible";
      } else {
        next.targetDate = value;
        next.dateFlexibility = inferDateFlexibility(value);
      }
    } else {
      next[questionId] = value;
    }

    next.confirmedFacts.push(`${labelFor(questionId)}: ${value}`);
    next.confidenceByField[questionId] = "high";
    next.updatedAt = new Date().toISOString();
    next.projectTimeline = buildTimeline(next);
    refreshUnknowns(next);
    return next;
  }

  function confirmUnderstanding(model, timelineUpdates = {}) {
    const next = normalizeUnderstanding(model);
    next.confirmed = true;
    next.confirmedFacts.push("Founder confirmed the project summary.");
    next.projectTimeline = next.projectTimeline.map((stage, index) => ({
      ...stage,
      name: typeof timelineUpdates[index] === "object" && timelineUpdates[index].name ? timelineUpdates[index].name : stage.name,
      requiredOutput: typeof timelineUpdates[index] === "object" && timelineUpdates[index].requiredOutput ? timelineUpdates[index].requiredOutput : stage.requiredOutput,
      status: STAGE_STATUSES.includes(typeof timelineUpdates[index] === "object" ? timelineUpdates[index].status : timelineUpdates[index])
        ? (typeof timelineUpdates[index] === "object" ? timelineUpdates[index].status : timelineUpdates[index])
        : stage.status
    }));
    next.updatedAt = new Date().toISOString();
    return next;
  }

  function applyProgressToUnderstanding(model, progress = {}) {
    const next = normalizeUnderstanding(model);
    const title = clean(progress.recommendationTitle);
    const note = clean(progress.note);
    const status = progress.status || "partial";
    const current = nextReadyStage(next);

    if (status === "done" && title) {
      next.completedWork = unique([...next.completedWork, title]);
      if (current) {
        const index = next.projectTimeline.findIndex((stage) => stage.name === current.name);
        if (index >= 0) {
          next.projectTimeline[index].status = "complete";
          next.projectTimeline[index].completionEvidence = unique([...(next.projectTimeline[index].completionEvidence || []), title]);
          if (next.projectTimeline[index + 1] && next.projectTimeline[index + 1].status === "not started") {
            next.projectTimeline[index + 1].status = "ready";
          }
        }
      }
    }

    if (status === "partial") {
      next.activeWork = unique([...next.activeWork, note || title].filter(Boolean));
    }

    if (status === "stuck") {
      next.blockers = unique([...next.blockers, note || "A blocker was reported."]);
      if (current) {
        const index = next.projectTimeline.findIndex((stage) => stage.name === current.name);
        if (index >= 0) next.projectTimeline[index].status = "blocked";
      }
    }

    next.continuity = {
      whereWorkStopped: note || title || "Progress was saved.",
      whatChanged: status,
      whatRemainsOpen: status === "done" ? "Next dependency should be checked." : (note || "The current work is still open."),
      nextNaturalMove: nextReadyStage(next)?.requiredOutput || "",
      doNotForget: note
    };
    next.updatedAt = new Date().toISOString();
    refreshUnknowns(next);
    return next;
  }

  function buildTimeline(model) {
    const template = TIMELINE_TEMPLATES[model.projectType] || TIMELINE_TEMPLATES.other;
    const current = normalizeStageName(model.currentStage);
    let activeIndex = template.findIndex(([name]) => normalizeStageName(name).includes(current) || current.includes(normalizeStageName(name)));

    if (activeIndex < 0) {
      if (/plan|idea|message|audience|define|strategy/i.test(model.currentStage)) activeIndex = 0;
      else if (/outline|structure|shap|flow/i.test(model.currentStage)) activeIndex = 1;
      else if (/build|draft|write|create|record/i.test(model.currentStage)) activeIndex = 2;
      else if (/test|feedback|review|validate/i.test(model.currentStage)) activeIndex = 3;
      else if (/launch|publish|share|scale/i.test(model.currentStage)) activeIndex = 4;
    }

    return template.map(([name, purpose, output], index) => {
      const status = activeIndex < 0
        ? (index === 0 ? "unknown" : "not started")
        : index < activeIndex ? "complete" : index === activeIndex ? "active" : index === activeIndex + 1 ? "ready" : "not started";
      return {
        name,
        purpose,
        requiredOutput: output,
        dependencies: index === 0 ? [] : [template[index - 1][0]],
        status,
        completionEvidence: status === "complete" ? model.completedWork : [],
        confidence: activeIndex < 0 ? "low" : "medium",
        openQuestions: status === "unknown" ? ["Confirm the current stage."] : []
      };
    });
  }

  function readinessForRecommendation(model) {
    const nextQuestion = selectNextQuestion(model);
    if (isMissing(model, "currentStage")) {
      return { ready: false, question: nextQuestion, reason: "I need to know where the project is before choosing work." };
    }
    const nextStage = nextReadyStage(model);
    if (!nextStage) {
      return { ready: false, question: nextQuestion, reason: "I do not know the next ready dependency yet." };
    }
    if (nextStage.status === "unknown") {
      return { ready: false, question: nextQuestion, reason: "The current stage is still uncertain." };
    }
    return { ready: true, nextStage, reason: "The current stage and next dependency are clear enough for a useful recommendation." };
  }

  function nextReadyStage(model) {
    const timeline = Array.isArray(model.projectTimeline) ? model.projectTimeline : [];
    return timeline.find((stage) => ["active", "ready", "blocked", "waiting", "unknown"].includes(stage.status)) || timeline.find((stage) => stage.status === "not started") || null;
  }

  function buildRecommendationFromUnderstanding(model, options = {}) {
    const minutes = parseMinutes(options.availableTime || model.typicalWorkSessionLength || "25 minutes");
    const readiness = readinessForRecommendation(model);
    if (!readiness.ready) {
      const question = readiness.question || selectNextQuestion(model);
      return {
        title: "Answer one project question before choosing the next move.",
        action: "Answer one project question before choosing the next move.",
        startHere: question?.prompt || "Tell me where the project currently stands.",
        summary: readiness.reason,
        whyThisComesNext: readiness.reason,
        doneWhen: "I know the current stage and the next dependency well enough to recommend work.",
        avoid: "Do not jump into building, recording, publishing, or launching until the current stage is clear.",
        save: "Save the answer that changes what should come next.",
        confidence: "Low",
        importantAssumption: "The project understanding is not complete enough for a strong recommendation.",
        estimatedMinutes: minutes,
        readiness: "Needs one answer",
        steps: []
      };
    }

    const stage = readiness.nextStage;
    const size = minutes <= 15 ? "smallest decision inside" : minutes <= 45 ? "focused draft of" : "complete usable pass on";
    const action = actionForStage(model, stage, minutes, size);
    const startHere = startForStage(model, stage);
    return {
      title: action,
      action,
      startHere,
      summary: `${stage.name} comes next because it creates ${stage.requiredOutput.toLowerCase()} for ${model.currentMilestone || model.intendedOutcome || "the project"}.`,
      whyThisComesNext: `${stage.name} is the next unfinished dependency in the project path. Available time changes the size of the work, not the order.`,
      doneWhen: doneForStage(stage, minutes),
      avoid: avoidForStage(model, stage),
      save: saveForStage(model, stage),
      confidence: confidenceForModel(model, stage),
      importantAssumption: assumptionForModel(model),
      estimatedMinutes: minutes,
      readiness: "Ready for next move",
      steps: []
    };
  }

  function actionForStage(model, stage, minutes, size) {
    const output = stage.requiredOutput.replace(/\.$/, "").toLowerCase();
    if (minutes <= 15) return `Decide the first piece of ${output}.`;
    if (minutes <= 45) return `Create a ${size} ${output}.`;
    return `Create and review a ${size} ${output}.`;
  }

  function startForStage(model, stage) {
    if (/audience|message|reader|offer|destination|direction/i.test(stage.name)) {
      return "Start by writing who this is for and what they should understand or receive.";
    }
    if (/outline|structure|flow|path/i.test(stage.name)) {
      return "Start by writing the first step, the middle steps, and the ending in order.";
    }
    if (/draft|build|create|record/i.test(stage.name)) {
      return "Start with the smallest piece that proves this stage is real.";
    }
    if (/test|validate|feedback/i.test(stage.name)) {
      return "Start by choosing the one person or situation that would reveal the most useful feedback.";
    }
    return "Start with the first visible output this stage needs.";
  }

  function doneForStage(stage, minutes) {
    if (minutes <= 15) return `You have one clear decision or starting point for ${stage.requiredOutput.toLowerCase()}`;
    if (minutes <= 45) return `You have a usable draft of ${stage.requiredOutput.toLowerCase()}`;
    return `You have ${stage.requiredOutput.toLowerCase()} and have reviewed what should happen next`;
  }

  function avoidForStage(model, stage) {
    return `Do not skip ahead to later stages until ${stage.name.toLowerCase()} has something real to hand forward.`;
  }

  function saveForStage(model, stage) {
    return `Save the ${stage.requiredOutput.toLowerCase()} and the exact place future-you should continue.`;
  }

  function confidenceForModel(model, stage) {
    if (model.unknowns.length > 2) return "Low";
    if (stage.confidence === "low") return "Low";
    if (model.confirmed && model.currentStage && model.intendedOutcome) return "Medium";
    return "Low";
  }

  function assumptionForModel(model) {
    return model.assumptions[0] || (model.unknowns.length ? `I still need to confirm: ${model.unknowns[0]}.` : "");
  }

  function summaryForConfirmation(model) {
    const path = (model.projectTimeline || []).map((stage) => stage.name).join(" -> ");
    return {
      created: model.projectDescription || model.projectName,
      intendedOutcome: model.intendedOutcome || "Unknown",
      audience: model.audience || "Unknown",
      currentStage: model.currentStage || "Unknown",
      completedWork: model.completedWork.length ? model.completedWork.join(", ") : "Unknown",
      nextMilestone: model.currentMilestone || "Unknown",
      targetDate: model.targetDate || "No date confirmed",
      constraints: model.constraints.length ? model.constraints.join(", ") : "None confirmed",
      likelyPath: path || "Unknown"
    };
  }

  function refreshUnknowns(model) {
    const unknowns = [];
    if (!model.projectDescription) unknowns.push("what the project is");
    if (!model.intendedOutcome) unknowns.push("what finished looks like");
    if (!model.currentStage) unknowns.push("current stage");
    if (!model.completedWork.length) unknowns.push("what is already complete");
    if (!model.targetDate && model.dateFlexibility === "unknown") unknowns.push("whether timing matters");
    model.unknowns = unique(unknowns);
  }

  function addInference(model, field, value, reason) {
    if (!value) return;
    model.inferredFacts.push(`${labelFor(field)}: ${value} (${reason})`);
  }

  function markField(model, field, confidence) {
    model.confidenceByField[field] = confidence;
  }

  function isMissing(model, field) {
    const value = model[field];
    return Array.isArray(value) ? value.length === 0 : !clean(value);
  }

  function inferProjectType(text) {
    const lower = text.toLowerCase();
    if (/app|software|website|dashboard|prototype|saas|mobile/.test(lower)) return "app";
    if (/book|chapter|novel|manuscript|memoir|story/.test(lower)) return "book";
    if (/business|offer|customer|client|pricing|service|sales/.test(lower)) return "business";
    if (/video|youtube|podcast|post|content|newsletter|record/.test(lower)) return "content";
    if (/art|design|music|creative|illustration/.test(lower)) return "creative";
    return "other";
  }

  function inferProjectName(text, type) {
    const quoted = text.match(/"([^"]+)"/)?.[1];
    if (quoted) return quoted;
    const named = text.match(/(?:called|named)\s+([A-Z][\w\s]{2,40})/)?.[1];
    if (named) return clean(named);
    return projectTypeLabel(type);
  }

  function inferOutcome(text) {
    return extractAfter(text, ["so that", "goal is", "want it to", "finished means", "success is", "outcome is"]);
  }

  function inferAudience(text) {
    return extractAfter(text, ["for ", "helps ", "audience is ", "readers are ", "viewers are ", "customers are "]);
  }

  function inferMilestone(text, type) {
    return extractAfter(text, ["milestone is", "next milestone", "working toward", "trying to"]) || defaultMilestone(type);
  }

  function inferCurrentStage(text) {
    const lower = text.toLowerCase();
    if (/outlin|structure|flow|path|shaping/.test(lower)) return "shaping";
    if (/planning|idea|figuring|message|audience|define/.test(lower)) return "planning";
    if (/building|drafting|writing|recording/.test(lower)) return "building";
    if (/testing|feedback|validating|review/.test(lower)) return "testing";
    if (/launching|publishing|shipping|sharing/.test(lower)) return "launching";
    return "";
  }

  function inferTargetDate(text) {
    return extractAfter(text, ["by ", "before ", "deadline is ", "due "]);
  }

  function inferDateFlexibility(value) {
    if (/fixed|must|hard|deadline/i.test(value)) return "fixed";
    if (/prefer|hope|aim/i.test(value)) return "preferred";
    if (/flex/i.test(value)) return "flexible";
    return "unknown";
  }

  function inferSessionLength(text) {
    return text.match(/\b\d+\s*(?:minutes|minute|min|hours|hour|hr)\b/i)?.[0] || "";
  }

  function inferList(text, markers) {
    const lower = text.toLowerCase();
    if (!markers.some((marker) => lower.includes(marker))) return [];
    return splitList(text).slice(0, 3);
  }

  function extractAfter(text, markers) {
    const lower = text.toLowerCase();
    for (const marker of markers) {
      const index = lower.indexOf(marker);
      if (index >= 0) {
        const start = index + marker.length;
        return clean(text.slice(start).split(/[.;\n]/)[0]).slice(0, 160);
      }
    }
    return "";
  }

  function splitList(value) {
    return unique(clean(value).split(/[,;\n]|\band\b/i).map(clean).filter(Boolean)).slice(0, 6);
  }

  function asArray(value) {
    return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function unique(values) {
    return [...new Set(values)];
  }

  function normalizeStageName(value) {
    return clean(value).toLowerCase();
  }

  function parseMinutes(value) {
    const lower = String(value ?? "").toLowerCase();
    const number = Number(lower.match(/\d+/)?.[0] ?? 25);
    return lower.includes("hour") || lower.includes("hr") ? number * 60 : number;
  }

  function projectTypeLabel(type) {
    return {
      app: "App Project",
      book: "Book Project",
      business: "Business Project",
      content: "Content Project",
      creative: "Creative Project",
      other: "Project"
    }[type] || "Project";
  }

  function defaultMilestone(type) {
    return {
      app: "Complete the next usable product flow",
      book: "Finish the next meaningful section",
      business: "Clarify the next customer-facing step",
      content: "Publish the next useful piece",
      creative: "Create the next visible version",
      other: "Move the project forward"
    }[type] || "Move the project forward";
  }

  function labelFor(field) {
    return field.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
  }

  const api = {
    STAGE_STATUSES,
    createUnderstandingFromStory,
    normalizeUnderstanding,
    migrateProjectToUnderstanding,
    selectNextQuestion,
    applyQuestionAnswer,
    confirmUnderstanding,
    applyProgressToUnderstanding,
    buildTimeline,
    readinessForRecommendation,
    nextReadyStage,
    buildRecommendationFromUnderstanding,
    summaryForConfirmation
  };

  global.IterNestUnderstanding = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
