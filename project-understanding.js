(function (global) {
  const StrategyApi = global.IterNestDomainStrategies || (typeof require !== "undefined" ? require("./domain-strategies") : null);
  const DOMAIN_STRATEGIES = StrategyApi?.STRATEGIES || {};
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
    const projectDomain = StrategyApi?.resolveDomain(text, shortcutType) || normalizeDomain(shortcutType || inferProjectType(text));
    const type = legacyTypeForDomain(projectDomain);
    const targetDate = inferTargetDate(text);
    const currentStage = inferCurrentStage(text);
    const completedWork = inferList(text, ["already", "finished", "completed", "done", "have"]);
    const detectedBottleneck = detectBottleneck(text, projectDomain);
    const blockers = detectedBottleneck.currentBottleneck ? [detectedBottleneck.currentBottleneck] : inferList(text, ["stuck", "blocked", "blocker", "in the way", "unclear", "waiting"]);
    const constraints = inferList(text, ["deadline", "constraint", "limited", "only", "before", "by"]);
    const dependencies = inferList(text, ["waiting on", "depends", "need someone", "approval", "feedback"]);
    const intendedOutcome = inferOutcome(text);
    const audience = inferAudience(text);
    const currentMilestone = inferMilestone(text, type);

    const model = normalizeUnderstanding({
      version: "project-understanding-v1",
      projectId: `project-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      confirmed: false,
      projectName: inferProjectName(text, type),
      projectDomain,
      projectType: type,
      originalDescription: text,
      projectDescription: text,
      purpose: intendedOutcome,
      intendedOutcome,
      audience,
      definitionOfSuccess: intendedOutcome,
      currentMilestone,
      immediateMilestone: currentMilestone,
      longerTermMilestone: inferLongerMilestone(text),
      currentStage,
      completedWork,
      activeWork: inferList(text, ["working on", "currently", "right now"]),
      missingWork: inferMissingWork(text, projectDomain),
      importantWorkStillMissing: [],
      openDecisions: inferList(text, ["decide", "decision", "choose", "figure out"]),
      constraints,
      blockers,
      dependencies,
      currentBottleneck: detectedBottleneck.currentBottleneck,
      bottleneckEvidence: detectedBottleneck.evidence,
      bottleneckPrevents: detectedBottleneck.prevents,
      majorMilestones: [],
      smallerMilestones: [],
      targetDate,
      dateFlexibility: targetDate ? "unknown" : "unknown",
      typicalWorkSessionLength: inferSessionLength(text),
      projectTimeline: [],
      confirmedFacts: text ? [`Project description: ${text}`] : [],
      inferredFacts: [],
      reasonableInferences: [],
      assumptions: [],
      unverifiedAssumptions: [],
      unknowns: [],
      openQuestions: [],
      fieldStates: {},
      confidenceByField: {},
      confidenceLevel: "Low",
      userCorrections: [],
      dateLastConfirmed: "",
      versionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    setFieldState(model, "projectDomain", model.projectDomain, "inferred", shortcutType ? "chosen shortcut" : "detected from project words", "medium");
    setFieldState(model, "projectDescription", text, text ? "confirmed" : "unknown", "founder supplied", text ? "high" : "missing");
    setFieldState(model, "currentBottleneck", model.currentBottleneck, model.currentBottleneck ? "inferred" : "unknown", "detected from what appears stuck", model.currentBottleneck ? "medium" : "missing");
    addInference(model, "projectDomain", model.projectDomain, shortcutType ? "chosen shortcut" : "detected from project words");
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
      projectId: input.projectId || input.id || `project-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      confirmed: Boolean(input.confirmed),
      needsReview: Boolean(input.needsReview),
      projectName: input.projectName || "",
      projectDomain: input.projectDomain || normalizeDomain(input.projectType || "other"),
      projectType: input.projectType || legacyTypeForDomain(input.projectDomain || "other"),
      originalDescription: input.originalDescription || input.projectDescription || "",
      projectDescription: input.projectDescription || "",
      purpose: input.purpose || input.intendedOutcome || "",
      intendedOutcome: input.intendedOutcome || "",
      audience: input.audience || "",
      definitionOfSuccess: input.definitionOfSuccess || input.intendedOutcome || input.purpose || "",
      currentMilestone: input.currentMilestone || "",
      immediateMilestone: input.immediateMilestone || input.currentMilestone || "",
      longerTermMilestone: input.longerTermMilestone || "",
      currentStage: input.currentStage || "",
      completedWork: asArray(input.completedWork),
      activeWork: asArray(input.activeWork),
      missingWork: asArray(input.missingWork),
      importantWorkStillMissing: asArray(input.importantWorkStillMissing || input.missingWork),
      openDecisions: asArray(input.openDecisions),
      constraints: asArray(input.constraints),
      blockers: asArray(input.blockers),
      dependencies: asArray(input.dependencies),
      currentBottleneck: input.currentBottleneck || asArray(input.blockers)[0] || "",
      bottleneckEvidence: asArray(input.bottleneckEvidence),
      bottleneckPrevents: input.bottleneckPrevents || "",
      majorMilestones: asArray(input.majorMilestones),
      smallerMilestones: asArray(input.smallerMilestones),
      targetDate: input.targetDate || "",
      dateFlexibility: input.dateFlexibility || "unknown",
      typicalWorkSessionLength: input.typicalWorkSessionLength || "",
      projectTimeline: Array.isArray(input.projectTimeline) ? input.projectTimeline : [],
      confirmedFacts: asArray(input.confirmedFacts),
      inferredFacts: asArray(input.inferredFacts),
      reasonableInferences: asArray(input.reasonableInferences || input.inferredFacts),
      assumptions: asArray(input.assumptions),
      unverifiedAssumptions: asArray(input.unverifiedAssumptions || input.assumptions),
      unknowns: asArray(input.unknowns),
      openQuestions: asArray(input.openQuestions),
      askedQuestionIds: asArray(input.askedQuestionIds),
      fieldStates: input.fieldStates || {},
      confidenceByField: input.confidenceByField || {},
      confidenceLevel: input.confidenceLevel || "Low",
      userCorrections: asArray(input.userCorrections),
      dateLastConfirmed: input.dateLastConfirmed || "",
      versionHistory: asArray(input.versionHistory),
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

    if (!model.currentBottleneck && model.blockers.length) model.currentBottleneck = model.blockers[0];
    if (model.currentBottleneck && !model.bottleneckPrevents) model.bottleneckPrevents = preventsForBottleneck(model.currentBottleneck, model);
    if (!model.projectTimeline.length) model.projectTimeline = buildTimeline(model);
    model.majorMilestones = model.projectTimeline.map((stage) => stage.name);
    model.smallerMilestones = model.projectTimeline.map((stage) => stage.requiredOutput);
    model.importantWorkStillMissing = unique([
      ...model.missingWork,
      ...model.projectTimeline.filter((stage) => ["unknown", "active", "ready", "not started"].includes(stage.status)).map((stage) => stage.requiredOutput)
    ]).slice(0, 8);
    model.reasonableInferences = unique([...model.reasonableInferences, ...model.inferredFacts]);
    model.unverifiedAssumptions = unique([...model.unverifiedAssumptions, ...model.assumptions]);
    model.openQuestions = buildOpenQuestions(model);
    refreshUnknowns(model);
    model.confidenceLevel = confidenceForUnderstanding(model);
    return model;
  }

  function migrateProjectToUnderstanding(project = {}) {
    if (project.projectUnderstanding) return normalizeUnderstanding(project.projectUnderstanding);
    const type = project.type || "other";
    return normalizeUnderstanding({
      confirmed: false,
      needsReview: true,
      projectName: project.name || projectTypeLabel(type),
      projectDomain: normalizeDomain(type),
      projectType: type,
      originalDescription: project.milestone || "",
      projectDescription: project.milestone || "",
      purpose: project.milestone || "",
      intendedOutcome: project.milestone || "",
      definitionOfSuccess: project.milestone || "",
      audience: "",
      currentMilestone: project.milestone || defaultMilestone(type),
      immediateMilestone: project.milestone || defaultMilestone(type),
      currentStage: "unknown",
      completedWork: Array.isArray(project.progress) ? project.progress.map((item) => item.recommendationTitle || item.note).filter(Boolean) : [],
      activeWork: project.whereLeftOff && project.whereLeftOff !== "Ready to begin." ? [project.whereLeftOff] : [],
      openDecisions: [],
      constraints: project.targetDate ? [`Target date: ${project.targetDate}`] : [],
      blockers: Array.isArray(project.memory?.blockers) ? project.memory.blockers.map((item) => item.blockerType || item.problem).filter(Boolean) : [],
      currentBottleneck: Array.isArray(project.memory?.blockers) ? project.memory.blockers.map((item) => item.blockerType || item.problem).filter(Boolean)[0] : "",
      bottleneckEvidence: ["Migrated from existing saved project memory."],
      dependencies: [],
      targetDate: project.targetDate || "",
      dateFlexibility: project.targetDate ? "unknown" : "unknown",
      typicalWorkSessionLength: "",
      confirmedFacts: ["Existing project data was preserved."],
      inferredFacts: ["Some fields were reconstructed from the previous project format."],
      assumptions: ["Juniper should confirm where this project stands before making strong recommendations."],
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
    const strategy = getStrategy(model.projectDomain);
    const asked = new Set(model.askedQuestionIds || []);
    const domainQuestion = (strategy.questions || []).find((question) => !asked.has(question.id) && question.when(model));
    if (domainQuestion) {
      return { id: domainQuestion.id, prompt: domainQuestion.prompt, help: domainQuestion.help, domain: strategy.id };
    }

    const checks = [
      ["currentStage", "Where are you right now: planning, building, testing, launching, or something else?", "This helps me avoid recommending work from the wrong stage."],
      ["intendedOutcome", "What does finished look like for this project?", "For example: a published video, a usable beta, a finished chapter, or a first paying customer."],
      ["completedWork", "What have you already completed?", "A short answer is enough. I only need what should not be repeated."],
      ["targetDate", "Is there a date this needs to be finished?", "Say no date yet if the timing is flexible."],
      ["dependencies", "Is anything waiting on another person, tool, or decision?", "This keeps me from suggesting work that cannot move yet."]
    ];

    const missing = checks.find(([field]) => !asked.has(field) && isMissing(model, field));
    if (!missing) return null;
    return { id: missing[0], prompt: missing[1], help: missing[2] };
  }

  function applyQuestionAnswer(model, questionId, answer) {
    const next = normalizeUnderstanding(model);
    const value = clean(answer);
    next.askedQuestionIds = unique([...(next.askedQuestionIds || []), questionId].filter(Boolean));
    if (!value) return next;

    if (/^(i don'?t know|not sure|unknown|no idea)$/i.test(value)) {
      next.unknowns = unique([...next.unknowns, labelFor(questionId).toLowerCase()]);
      next.openQuestions = unique([...next.openQuestions, labelFor(questionId)]);
    } else if (questionId === "correction") {
      return applyCorrection(next, value);
    } else if (questionId === "completedWork" || questionId === "dependencies" || questionId === "workingCapability" || questionId === "existingContent" || questionId === "curriculumStatus") {
      next[questionId] = splitList(value);
      if (questionId !== "completedWork") next.completedWork = unique([...next.completedWork, ...splitList(value)]);
    } else if (["mobileBehavior", "userExperience", "middleChange", "protagonistPressure", "afterViewingPath", "productionConstraint", "learnerStuckPoint", "difficulty", "constraint"].includes(questionId)) {
      const bottleneck = simplifyBottleneck(value, next);
      next.currentBottleneck = bottleneck;
      next.blockers = unique([bottleneck, ...next.blockers].filter(Boolean));
      next.bottleneckEvidence = unique([...next.bottleneckEvidence, value]);
      next.bottleneckPrevents = preventsForBottleneck(bottleneck, next);
      if (["userExperience", "protagonistPressure"].includes(questionId)) {
        next.immediateMilestone = value;
        next.currentMilestone = value;
      }
    } else if (["desiredAction", "successDefinition", "audienceAction", "episodePurpose", "learnerResult", "storyPromise"].includes(questionId)) {
      next.definitionOfSuccess = value;
      next.intendedOutcome = value;
      next.purpose = value;
      next.immediateMilestone = value;
      next.currentMilestone = value;
    } else if (["customer", "audienceProblem", "readerProblem"].includes(questionId)) {
      next.audience = value;
      next.purpose = next.purpose || value;
    } else if (["currentScene", "episodeStage", "currentPosition"].includes(questionId)) {
      next.currentStage = value;
      next.activeWork = unique([...next.activeWork, value]);
    } else if (questionId === "offer" || questionId === "projectPurpose") {
      next.purpose = value;
      next.intendedOutcome = value;
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
    setFieldState(next, questionId, value, "confirmed", "Founder answered a follow-up question.", "high");
    next.confidenceByField[questionId] = "high";
    next.versionHistory.push({ at: new Date().toISOString(), event: "answered", note: `${labelFor(questionId)}: ${value}` });
    next.updatedAt = new Date().toISOString();
    next.projectTimeline = buildTimeline(next);
    refreshUnknowns(next);
    return next;
  }

  function applyCorrection(model, correction) {
    const next = normalizeUnderstanding(model);
    const value = clean(correction);
    if (!value) return next;
    const lower = value.toLowerCase();
    next.confirmed = false;
    next.dateLastConfirmed = "";
    next.userCorrections = unique([...next.userCorrections, value]);
    next.confirmedFacts.push(`Founder correction: ${value}`);

    if (/audience|reader|customer|parent|viewer|listener|learner|for /.test(lower)) {
      next.audience = value;
      setFieldState(next, "audience", value, "confirmed", "Founder corrected who this is for.", "high");
    } else if (/done|finished|success|ready|goal|milestone/.test(lower)) {
      next.definitionOfSuccess = value;
      next.intendedOutcome = value;
      next.immediateMilestone = value;
      next.currentMilestone = value;
      setFieldState(next, "definitionOfSuccess", value, "confirmed", "Founder corrected what success means.", "high");
    } else if (/stuck|blocking|problem|hard|difficult|wrong|missing|doesn'?t feel|unclear/.test(lower)) {
      next.currentBottleneck = simplifyBottleneck(value, next);
      next.blockers = unique([next.currentBottleneck, ...next.blockers].filter(Boolean));
      next.bottleneckEvidence = unique([...next.bottleneckEvidence, value]);
      next.bottleneckPrevents = preventsForBottleneck(next.currentBottleneck, next);
      setFieldState(next, "currentBottleneck", next.currentBottleneck, "confirmed", "Founder corrected what is getting in the way.", "high");
    } else {
      next.projectDescription = `${next.projectDescription} Correction: ${value}`.trim();
      setFieldState(next, "projectDescription", next.projectDescription, "confirmed", "Founder corrected the project picture.", "high");
    }

    next.versionHistory.push({ at: new Date().toISOString(), event: "corrected", note: value });
    next.updatedAt = new Date().toISOString();
    next.projectTimeline = buildTimeline(next);
    refreshUnknowns(next);
    return next;
  }

  function confirmUnderstanding(model, timelineUpdates = {}) {
    const next = normalizeUnderstanding(model);
    next.confirmed = true;
    next.needsReview = false;
    next.dateLastConfirmed = new Date().toISOString();
    next.confirmedFacts.push("Founder confirmed the project reflection.");
    next.versionHistory.push({ at: next.dateLastConfirmed, event: "confirmed", note: "Founder confirmed the reflected project understanding." });
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
    const strategy = getStrategy(model.projectDomain);
    const template = strategy?.stages?.length
      ? strategy.stages.map((stage) => [stage.name, stage.purpose, stage.requiredOutput])
      : (TIMELINE_TEMPLATES[model.projectType] || TIMELINE_TEMPLATES.other);
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
    if (!model.confirmed) {
      return {
        ready: false,
        question: selectNextQuestion(model),
        reason: "I should explain the project back and get your confirmation before recommending work.",
        gate: "unconfirmed"
      };
    }
    const nextQuestion = selectNextQuestion(model);
    if (isMissing(model, "currentStage")) {
      return { ready: false, question: nextQuestion, reason: "I need to know where the project is before choosing work.", gate: "needs-stage" };
    }
    if (!model.currentBottleneck) {
      return { ready: false, question: nextQuestion, reason: "I need to know what is getting in the way before choosing work.", gate: "needs-bottleneck" };
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
        readiness: readiness.gate === "unconfirmed" ? "Needs understanding first" : "Needs one answer",
        steps: []
      };
    }

    const stage = readiness.nextStage;
    const domainSpecific = domainRecommendation(model, stage, minutes);
    if (domainSpecific) return domainSpecific;
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

  function domainRecommendation(model, stage, minutes) {
    const domain = model.projectDomain;
    const text = `${model.projectDescription} ${model.currentBottleneck}`.toLowerCase();
    if (domain === "software_app") {
      const parentPlan = /parent|lesson|teaching|activities|not what|doesn'?t feel/.test(text);
      const mobile = /phone|mobile|laptop/.test(text);
      return shapedRecommendation(model, stage, minutes, {
        action: parentPlan
          ? "Define the parent teaching plan before building another screen."
          : mobile
            ? "Reproduce the phone upload problem and name the failing step."
            : `Create the next usable piece of ${stage.requiredOutput.toLowerCase()}.`,
        startHere: parentPlan
          ? "Start with one imported lesson and write what a parent should see, decide, and do next."
          : mobile
            ? "Start by comparing the same upload on laptop and phone, then write the first point where behavior differs."
            : "Start with the first user action this capability must support.",
        why: parentPlan
          ? "The import already produces material, but the next value comes from turning that material into a useful parent plan."
          : mobile
            ? "A device-specific failure can block realistic testing, so the next move is to isolate it before adding more product surface."
            : `${stage.name} is the next unfinished part of the app path.`,
        connectsTo: model.immediateMilestone || model.currentMilestone || "the next usable product flow",
        unlocks: parentPlan
          ? "Reliable lesson grouping, time estimates, and useful daily planning decisions."
          : mobile
            ? "Confidence that the app can be tested where people will actually use it."
            : stage.requiredOutput,
        doneWhen: parentPlan
          ? "One imported lesson has been translated into a parent-friendly teaching plan with a clear next action."
          : mobile
            ? "You know the exact step where phone upload fails and what must be fixed first."
            : `You have ${stage.requiredOutput.toLowerCase()}.`,
        avoid: parentPlan ? "Do not build another screen until the parent action is clear." : "Do not widen into unrelated app improvements."
      });
    }

    if (domain === "novel") {
      return shapedRecommendation(model, stage, minutes, {
        action: "Decide what new problem forces the main character to act before drafting another chapter.",
        startHere: "Write the moment where the current situation becomes impossible for the main character to ignore.",
        why: "The next scene is hard to find because the middle needs more change, pressure, or consequence before the ending can feel earned.",
        connectsTo: model.immediateMilestone || model.currentMilestone || "the next scene or chapter",
        unlocks: "A scene that moves the story toward the final conflict instead of simply adding more pages.",
        doneWhen: "You can name the new problem, the choice it forces, and the scene where that pressure appears.",
        avoid: "Do not simply write the next chapter until you know what changes in it."
      });
    }

    if (domain === "marketing") {
      return shapedRecommendation(model, stage, minutes, {
        action: "Make the next piece of attention lead to one clear action.",
        startHere: "Write the exact action someone should take after watching, then update the next video ending or profile link around that action.",
        why: "The evidence suggests attention exists, but the path from attention to signup is unclear.",
        connectsTo: model.immediateMilestone || model.currentMilestone || "turning interest into action",
        unlocks: "A way to learn whether people who watch are willing to take the next step.",
        doneWhen: "The next viewer has one obvious thing to do and one obvious place to do it.",
        avoid: "Do not just make more posts until the next action is clear."
      });
    }

    return null;
  }

  function shapedRecommendation(model, stage, minutes, parts) {
    return {
      title: parts.action,
      action: parts.action,
      startHere: parts.startHere,
      summary: parts.why,
      whyThisComesNext: parts.why,
      whatItConnectsTo: parts.connectsTo,
      whatThisUnlocks: parts.unlocks,
      doneWhen: parts.doneWhen,
      avoid: parts.avoid,
      save: `Save what changed, what remains open, and where to restart: ${parts.doneWhen}`,
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
    if (model.confirmed && model.currentStage && model.currentBottleneck) return "Medium";
    if (model.unknowns.length > 2) return "Low";
    if (stage.confidence === "low") return "Low";
    if (model.confirmed && model.currentStage && model.intendedOutcome) return "Medium";
    return "Low";
  }

  function assumptionForModel(model) {
    return model.assumptions[0] || (model.unknowns.length ? `I still need to confirm: ${model.unknowns[0]}.` : "");
  }

  function renderProjectReflection(model) {
    const path = (model.projectTimeline || []).map((stage) => stage.name).join(" -> ");
    return {
      title: "Here's how I understand your project.",
      summary: `${plainCreated(model)} ${model.currentStage ? `Right now, it appears to be ${model.currentStage}.` : ""} ${model.currentBottleneck ? `The current difficulty is ${lowerFirst(model.currentBottleneck)}.` : ""}`.replace(/\s+/g, " ").trim(),
      sections: [
        ["What you're creating", plainCreated(model)],
        ["Who it is for", model.audience || "I do not know that yet."],
        ["What it should accomplish", model.definitionOfSuccess || model.intendedOutcome || model.purpose || "I need one more detail to know that."],
        ["Where it stands", model.currentStage || "I still need to confirm where it stands."],
        ["Already true", model.completedWork.length ? model.completedWork.join("; ") : "I do not know what is already complete yet."],
        ["What is getting in the way", model.currentBottleneck || "I have not identified a clear bottleneck yet."],
        ["What that prevents", model.bottleneckPrevents || (model.currentBottleneck ? preventsForBottleneck(model.currentBottleneck, model) : "I need one more detail to know what this prevents.")],
        ["Next useful milestone", model.immediateMilestone || model.currentMilestone || "I need to confirm the next milestone."],
        ["Still uncertain", model.unknowns.length ? model.unknowns.join("; ") : "Nothing major from the current description."],
        ["The path I see", path || "Unknown"]
      ],
      facts: {
        confirmed: model.confirmedFacts,
        inferred: model.reasonableInferences || model.inferredFacts,
        unknown: model.unknowns
      }
    };
  }

  function summaryForConfirmation(model) {
    const reflection = renderProjectReflection(model);
    const sections = Object.fromEntries(reflection.sections);
    const path = (model.projectTimeline || []).map((stage) => stage.name).join(" -> ");
    return {
      created: sections["What you're creating"],
      intendedOutcome: sections["What it should accomplish"],
      audience: sections["Who it is for"],
      currentStage: sections["Where it stands"],
      completedWork: sections["Already true"],
      nextMilestone: sections["Next useful milestone"],
      targetDate: model.targetDate || "No date confirmed",
      constraints: model.constraints.length ? model.constraints.join(", ") : "None confirmed",
      likelyPath: path || "Unknown",
      currentBottleneck: sections["What is getting in the way"],
      bottleneckPrevents: sections["What that prevents"],
      unknowns: sections["Still uncertain"]
    };
  }

  function refreshUnknowns(model) {
    const unknowns = [];
    if (!model.projectDescription) unknowns.push("what the project is");
    if (!model.intendedOutcome && !model.definitionOfSuccess) unknowns.push("what finished looks like");
    if (!model.audience) unknowns.push("who this is for");
    if (!model.currentStage) unknowns.push("current stage");
    if (!model.completedWork.length) unknowns.push("what is already complete");
    if (!model.currentBottleneck) unknowns.push("what is getting in the way");
    if (!model.targetDate && model.dateFlexibility === "unknown") unknowns.push("whether timing matters");
    model.unknowns = unique(unknowns);
  }

  function hasEnoughForReflection(model) {
    const ready = normalizeUnderstanding(model);
    const hasFollowUp = Boolean((ready.askedQuestionIds || []).length);
    return Boolean(
      hasFollowUp &&
      ready.projectDescription &&
      (ready.currentStage || ready.completedWork.length || ready.activeWork.length) &&
      (ready.currentBottleneck || ready.intendedOutcome || ready.definitionOfSuccess)
    );
  }

  function applyReturningUpdate(model, update = {}) {
    const next = normalizeUnderstanding(model);
    const note = clean(typeof update === "string" ? update : update.note || update.whatChanged || "");
    if (!note) return next;
    const lower = note.toLowerCase();
    next.versionHistory.push({ at: new Date().toISOString(), event: "returning-update", note });
    next.confirmedFacts.push(`Returning update: ${note}`);
    if (/finished|completed|done|fixed|works now|resolved/.test(lower)) {
      next.completedWork = unique([...next.completedWork, note]);
      if (next.currentBottleneck && /fixed|works now|resolved|completed/.test(lower)) {
        next.blockers = next.blockers.filter((item) => item !== next.currentBottleneck);
        next.currentBottleneck = next.blockers[0] || "";
        next.bottleneckPrevents = next.currentBottleneck ? preventsForBottleneck(next.currentBottleneck, next) : "";
      }
    } else if (/stuck|blocked|not working|problem|difficult|unclear|wrong/.test(lower)) {
      next.currentBottleneck = simplifyBottleneck(note, next);
      next.blockers = unique([next.currentBottleneck, ...next.blockers].filter(Boolean));
      next.bottleneckEvidence = unique([...next.bottleneckEvidence, note]);
      next.bottleneckPrevents = preventsForBottleneck(next.currentBottleneck, next);
    } else {
      next.activeWork = unique([...next.activeWork, note]);
    }
    next.continuity = {
      ...(next.continuity || {}),
      whatChanged: note,
      whereWorkStopped: note,
      doNotForget: note,
      nextNaturalMove: nextReadyStage(next)?.requiredOutput || next.continuity?.nextNaturalMove || ""
    };
    next.updatedAt = new Date().toISOString();
    next.projectTimeline = buildTimeline(next);
    refreshUnknowns(next);
    return next;
  }
  function addInference(model, field, value, reason) {
    if (!value) return;
    const inference = `${labelFor(field)}: ${value} (${reason})`;
    model.inferredFacts.push(inference);
    model.reasonableInferences = unique([...(model.reasonableInferences || []), inference]);
  }

  function markField(model, field, confidence) {
    model.confidenceByField[field] = confidence;
  }

  function setFieldState(model, field, value, status, evidence, confidence) {
    model.fieldStates[field] = { value, status, evidence, confidence };
    model.confidenceByField[field] = confidence;
  }

  function getStrategy(domain) {
    return DOMAIN_STRATEGIES[domain] || DOMAIN_STRATEGIES[normalizeDomain(domain)] || DOMAIN_STRATEGIES.other || {};
  }

  function normalizeDomain(value) {
    return {
      app: "software_app",
      software_app: "software_app",
      book: "novel",
      novel: "novel",
      nonfiction_book: "nonfiction_book",
      marketing: "marketing",
      business: "business",
      content: "content_channel",
      content_channel: "content_channel",
      podcast: "podcast",
      course: "course",
      creative: "other",
      other: "other"
    }[value] || "other";
  }

  function legacyTypeForDomain(domain) {
    const strategy = getStrategy(domain);
    return strategy.legacyType || {
      software_app: "app",
      novel: "book",
      nonfiction_book: "book",
      marketing: "business",
      content_channel: "content",
      podcast: "content",
      course: "content",
      business: "business",
      other: "other"
    }[domain] || "other";
  }

  function buildOpenQuestions(model) {
    const strategy = getStrategy(model.projectDomain);
    return (strategy.questions || []).filter((question) => question.when(model)).map((question) => question.prompt);
  }

  function isMissing(model, field) {
    const value = model[field];
    return Array.isArray(value) ? value.length === 0 : !clean(value);
  }

  function detectBottleneck(text, domain) {
    const lower = text.toLowerCase();
    const result = { currentBottleneck: "", evidence: [], prevents: "" };
    if (domain === "software_app" && /parent|lesson|curriculum|activities/.test(lower) && /screen|plan|doesn'?t feel|not what/.test(lower)) {
      result.currentBottleneck = "The output is not yet translated into what the user actually needs to do.";
      result.evidence.push("The founder said the screen does not feel like what the user would actually do.");
      result.prevents = "It prevents reliable grouping, estimates, and a useful next step for the person using the app.";
    } else if (domain === "software_app" && /phone|mobile/.test(lower) && /laptop|desktop|works/.test(lower)) {
      result.currentBottleneck = "The same capability does not work reliably on the phone.";
      result.evidence.push("The founder said it works on a laptop but not on a phone.");
      result.prevents = "It prevents realistic testing on the device people may actually use.";
    } else if (domain === "novel" && /middle|boring|slow|scene|ending/.test(lower)) {
      result.currentBottleneck = "The middle does not yet create enough pressure or change.";
      result.evidence.push("The founder said the middle feels boring or the next scene is unclear.");
      result.prevents = "It makes the next scene hard to choose and weakens the path into the ending.";
    } else if (domain === "marketing" && /views|watch|tiktok|instagram/.test(lower) && /sign|click|customer|follow/.test(lower)) {
      result.currentBottleneck = "Attention is not yet connected to a clear next action.";
      result.evidence.push("The founder said people watch but do not sign up or take action.");
      result.prevents = "It prevents views from turning into signups, customers, or another useful response.";
    } else if (/stuck|blocked|unclear|doesn'?t feel|hard|difficult|not sure|don'?t know/.test(lower)) {
      result.currentBottleneck = simplifyBottleneck(text, { projectDomain: domain });
      result.evidence.push("The founder described uncertainty or friction.");
      result.prevents = "It prevents choosing the next move with confidence.";
    }
    return result;
  }

  function inferMissingWork(text, domain) {
    const lower = text.toLowerCase();
    const missing = [];
    if (/not my phone|not on my phone|phone/.test(lower) && /laptop/.test(lower)) missing.push("Phone behavior needs to work reliably.");
    if (/doesn'?t feel|doesnt feel|not what .* would actually do/.test(lower)) missing.push("The user-facing experience needs to match real behavior.");
    if (/boring|slow/.test(lower)) missing.push("The middle needs more change, pressure, or consequence.");
    if (/aren'?t signing|not signing|no one signs/.test(lower)) missing.push("The path from attention to signup needs to be clearer.");
    return missing;
  }

  function inferLongerMilestone(text) {
    return extractAfter(text, ["eventually", "long term", "longer term", "want it to become"]);
  }

  function simplifyBottleneck(text, model = {}) {
    const lower = clean(text).toLowerCase();
    if (/phone|mobile|laptop/.test(lower)) return "The work behaves differently on phone and laptop.";
    if (/parent|lesson|activity|screen doesn't|screen doesnt|not what/.test(lower)) return "The output is not yet translated into what the user actually needs to do.";
    if (/middle|boring|slow|scene/.test(lower)) return "The middle does not yet create enough pressure or change.";
    if (/views|watch|sign|click|conversion/.test(lower)) return "Attention is not yet connected to a clear next action.";
    if (/price|pricing/.test(lower)) return "Pricing is not clear enough to test with a customer.";
    if (/don't know|dont know|not sure|unclear|everything/.test(lower)) return "The next decision is unclear.";
    return clean(text).replace(/^i('| a)?m\s+/i, "").slice(0, 180);
  }

  function preventsForBottleneck(bottleneck, model) {
    const lower = clean(bottleneck).toLowerCase();
    if (/phone|mobile/.test(lower)) return "It prevents realistic use or testing on the device people may use.";
    if (/translated|output|user|parent/.test(lower)) return "It prevents the project from becoming useful to the person it is for.";
    if (/middle|pressure|scene/.test(lower)) return "It prevents the next scene from feeling necessary.";
    if (/attention|action|signup/.test(lower)) return "It prevents interest from turning into a measurable next step.";
    return "It prevents choosing the next move with confidence.";
  }

  function confidenceForUnderstanding(model) {
    if (model.confirmed && model.unknowns.length <= 1 && model.currentBottleneck) return "High";
    if (model.projectDescription && (model.currentStage || model.completedWork.length) && model.currentBottleneck) return "Medium";
    return "Low";
  }

  function plainCreated(model) {
    const desc = model.projectDescription || model.projectName || "a project";
    if (model.projectDomain === "software_app" && /homeschool/i.test(desc)) return "You are building a homeschool application.";
    if (model.projectDomain === "novel") return `You are writing ${/fantasy/i.test(desc) ? "a fantasy novel" : "a novel"}.`;
    if (model.projectDomain === "marketing") {
      if (/marketing my app/i.test(desc)) return "You are marketing your app.";
      return "You are marketing something you want people to act on.";
    }
    return `You are creating ${desc.replace(/^i('| a)?m\s+(building|writing|creating|marketing)\s+/i, "")}.`;
  }

  function lowerFirst(value) {
    const text = clean(value);
    return text ? text[0].toLowerCase() + text.slice(1) : text;
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
    if (/testing|feedback|validating|review|views|watch|signup|signing|click/.test(lower)) return "testing";
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
    renderProjectReflection,
    hasEnoughForReflection,
    applyCorrection,
    applyReturningUpdate,
    summaryForConfirmation
  };

  global.IterNestUnderstanding = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
