(function (global) {
  const STRATEGIES = {
    software_app: {
      id: "software_app",
      legacyType: "app",
      label: "software application",
      keywords: ["app", "software", "website", "dashboard", "prototype", "mobile", "screen", "upload", "import", "bug", "beta", "phone"],
      stages: [
        stage("Clarify the user path", "Know who uses it, what they are trying to do, and what success looks like.", "A plain-language user path from start to useful result."),
        stage("Make the foundation solid", "Stabilize the capability that later work depends on.", "A working foundation that does not collapse when the user tries it."),
        stage("Shape the usable flow", "Connect capabilities into a clear experience.", "A flow someone can follow without the builder explaining it."),
        stage("Test with a real person", "Find what breaks, confuses, or fails to matter.", "Notes from one guided walkthrough."),
        stage("Prepare to share", "Remove the rough edges that block a first beta or launch.", "A shareable version with the next risk named.")
      ],
      questions: [
        q("mobileBehavior", "What happens differently on the phone than on your laptop?", "I want to separate device problems from product problems.", hasAny("phone", "mobile", "laptop")),
        q("userExperience", "What should the person be able to do when this part works well?", "Say it like you would explain it to the person using the app.", hasAny("screen", "doesn't feel", "doesnt feel", "parent", "user", "experience")),
        q("workingCapability", "What part already works well enough that we should not repeat it?", "A short answer is fine.", missing("completedWork")),
        q("successDefinition", "What would make this feel ready for the next real user?", "This keeps the next move tied to a useful milestone.", missing("definitionOfSuccess"))
      ],
      commonBottlenecks: ["foundation", "data", "user experience", "mobile", "testing", "beta readiness"],
      reflectionNouns: { audience: "user", output: "usable flow" }
    },
    novel: {
      id: "novel",
      legacyType: "book",
      label: "novel",
      keywords: ["novel", "fantasy", "romance", "mystery", "thriller", "character", "scene", "chapter", "draft", "villain", "ending", "middle"],
      stages: [
        stage("Find the story promise", "Know what kind of story this is and what readers are waiting to experience.", "A clear story promise, main character, and direction."),
        stage("Shape the story path", "Know how the important turns connect.", "A sequence of story moments that creates pressure and change."),
        stage("Draft the current section", "Turn the next necessary story moment into pages.", "A scene or chapter that changes the story situation."),
        stage("Revise for story movement", "Make the draft clearer, stronger, and more connected.", "A revised section where cause and effect are visible."),
        stage("Prepare to share or publish", "Get the work ready for readers, feedback, querying, or publishing.", "A readable package with the next feedback question named.")
      ],
      questions: [
        q("middleChange", "What changes during the middle chapters right now?", "If nothing important changes, that may be why the story feels slow.", hasAny("middle", "boring", "slow")),
        q("protagonistPressure", "What is pushing the main character to act next?", "This helps find the next scene without using story jargon.", hasAny("scene", "next", "ending", "character", "middle")),
        q("storyPromise", "What kind of experience should the reader get from this story?", "For example: wonder, danger, romance, mystery, comfort, or suspense.", missing("purpose")),
        q("currentScene", "Where are you in the story right now?", "A chapter, scene, or rough place in the draft is enough.", missing("currentStage"))
      ],
      commonBottlenecks: ["story pressure", "scene purpose", "character motivation", "pacing", "continuity"],
      reflectionNouns: { audience: "reader", output: "story movement" }
    },
    nonfiction_book: {
      id: "nonfiction_book",
      legacyType: "book",
      label: "nonfiction book",
      keywords: ["nonfiction", "memoir", "guide", "manual", "reader", "research", "chapter", "argument", "expertise"],
      stages: [
        stage("Clarify the reader promise", "Know who the reader is and what the book should help them understand or do.", "A clear reader, promise, and point of view."),
        stage("Shape the argument", "Put the ideas in an order that will make sense to the reader.", "A chapter or section map with a reason for the order."),
        stage("Draft the current section", "Turn the next idea into readable pages.", "A rough section with examples or support."),
        stage("Revise for clarity", "Remove repetition and make the logic easier to follow.", "A revised section that delivers one clear idea."),
        stage("Prepare to share or publish", "Get the work ready for feedback, editing, proposal, or publishing.", "A readable draft package with next feedback needs.")
      ],
      questions: [
        q("readerProblem", "What problem is the reader hoping this book will help with?", "This keeps the book from becoming only a collection of ideas.", missing("audience")),
        q("chapterPurpose", "What should the current chapter or section accomplish?", "A plain answer is enough.", hasAny("chapter", "section", "outline")),
        q("evidenceNeeded", "Do you already have the examples, research, or stories this part needs?", "This helps separate writing from gathering material.", missing("dependencies"))
      ],
      commonBottlenecks: ["reader promise", "logical order", "evidence", "clarity", "publishing path"],
      reflectionNouns: { audience: "reader", output: "clear section" }
    },
    marketing: {
      id: "marketing",
      legacyType: "business",
      label: "marketing project",
      keywords: ["marketing", "campaign", "ads", "tiktok", "instagram", "views", "followers", "sign up", "signup", "conversion", "website", "landing", "content"],
      stages: [
        stage("Clarify the offer and audience", "Know what is being promoted and who should care.", "A clear offer, audience, and desired action."),
        stage("Shape the message", "Make the reason to act simple and specific.", "A message that connects the audience problem to the offer."),
        stage("Connect attention to action", "Make it obvious what interested people should do next.", "One clear path from attention to the next action."),
        stage("Test the response", "Use real behavior to learn what is working.", "Evidence from one post, page, email, or campaign test."),
        stage("Improve and repeat", "Keep what is working and remove what blocks action.", "A clearer repeatable marketing move.")
      ],
      questions: [
        q("desiredAction", "What do you want someone to do after they see it?", "This separates getting attention from getting the right next action.", hasAny("views", "watch", "sign", "click", "follow")),
        q("afterViewingPath", "What do people currently see or do after watching?", "I want to understand the path from attention to action.", hasAny("views", "tiktok", "instagram", "videos")),
        q("offer", "What are you asking people to try, buy, join, or believe?", "A simple description is enough.", missing("purpose")),
        q("audienceProblem", "What problem does this audience already recognize?", "This keeps the message grounded.", missing("audience"))
      ],
      commonBottlenecks: ["unclear action", "message", "audience", "offer", "evidence"],
      reflectionNouns: { audience: "audience", output: "clear next action" }
    },
    business: {
      id: "business",
      legacyType: "business",
      label: "business",
      keywords: ["business", "customer", "client", "offer", "pricing", "service", "sales", "revenue", "operations"],
      stages: [
        stage("Clarify the offer", "Know who you help and what they get.", "A plain offer and target customer."),
        stage("Validate demand", "Learn whether a real person wants it.", "One real customer signal or conversation."),
        stage("Shape the sales path", "Make the next step to saying yes clear.", "A simple path from first contact to next action."),
        stage("Deliver the first version", "Help one customer with the smallest useful version.", "A deliverable that works for one customer."),
        stage("Improve and repeat", "Use evidence to make selling or delivery easier.", "One improvement from real feedback.")
      ],
      questions: [
        q("customer", "Who is the customer you most want to help first?", "Specific beats broad here.", missing("audience")),
        q("salesStatus", "Have you already sold, tested, or delivered any part of this?", "This tells me whether the next move is learning, selling, or improving delivery.", missing("completedWork")),
        q("constraint", "What is making the business hard to move forward right now?", "It could be time, money, customers, delivery, pricing, or something else.", missing("currentBottleneck"))
      ],
      commonBottlenecks: ["offer", "customer", "sales", "delivery", "capacity", "pricing"],
      reflectionNouns: { audience: "customer", output: "customer-facing step" }
    },
    content_channel: {
      id: "content_channel",
      legacyType: "content",
      label: "content channel",
      keywords: ["youtube", "tiktok", "instagram", "newsletter", "content", "channel", "post", "video", "publish", "record"],
      stages: [
        stage("Clarify the audience and promise", "Know who the content is for and why they return.", "A clear topic, audience, and reason to watch or read."),
        stage("Shape the next piece", "Choose the angle and order before producing.", "An opening, main sections, and ending."),
        stage("Create the piece", "Turn the idea into a real draft or recording.", "A rough piece of content."),
        stage("Edit and publish", "Make the piece clear enough to share.", "A finished version with title and next action."),
        stage("Learn from response", "Use audience behavior to improve the next piece.", "One lesson from reach, retention, replies, or action.")
      ],
      questions: [
        q("audienceAction", "What should someone do or understand after this content?", "This keeps the piece from being content for content's sake.", missing("definitionOfSuccess")),
        q("existingContent", "What have you already published or created?", "I do not want to recommend repeating work.", missing("completedWork")),
        q("productionConstraint", "What makes producing this content hard right now?", "Time, editing, confidence, ideas, or platform fit all count.", missing("currentBottleneck"))
      ],
      commonBottlenecks: ["audience", "angle", "production", "publishing", "response"],
      reflectionNouns: { audience: "viewer or reader", output: "content piece" }
    },
    podcast: {
      id: "podcast",
      legacyType: "content",
      label: "podcast",
      keywords: ["podcast", "episode", "guest", "interview", "recording", "audio"],
      stages: [
        stage("Clarify the listener promise", "Know who listens and why this show matters.", "A clear listener and episode promise."),
        stage("Shape the episode", "Decide the question, story, or outcome for the episode.", "A usable episode outline."),
        stage("Record", "Capture the episode or interview.", "A usable recording."),
        stage("Edit and publish", "Make the episode ready to share.", "A published or publish-ready episode."),
        stage("Promote and learn", "Help the right listener find it and learn from response.", "One promotion move and one learning signal.")
      ],
      questions: [
        q("episodePurpose", "What should this episode give the listener?", "A takeaway, story, or useful question is enough.", missing("definitionOfSuccess")),
        q("episodeStage", "Is this episode being planned, recorded, edited, or promoted?", "This keeps me from suggesting the wrong kind of work.", missing("currentStage"))
      ],
      commonBottlenecks: ["episode purpose", "guest", "recording", "editing", "promotion"],
      reflectionNouns: { audience: "listener", output: "episode" }
    },
    course: {
      id: "course",
      legacyType: "content",
      label: "course",
      keywords: ["course", "lesson", "module", "students", "curriculum", "exercise", "assessment"],
      stages: [
        stage("Clarify the learner result", "Know who the learner is and what they should be able to do.", "A learner, promise, and success outcome."),
        stage("Shape the curriculum", "Put the lessons in an order that supports learning.", "A module and lesson map."),
        stage("Create the current lesson", "Make the next lesson usable.", "A lesson with practice or next action."),
        stage("Test with learners", "Find where learners get confused or stuck.", "Feedback from one learner or pilot."),
        stage("Prepare to launch", "Make the course ready to deliver.", "A shareable course path with open risks named.")
      ],
      questions: [
        q("learnerResult", "What should the learner be able to do after this?", "This is the anchor for the course.", missing("definitionOfSuccess")),
        q("curriculumStatus", "What lessons or modules already exist?", "A rough list is enough.", missing("completedWork")),
        q("learnerStuckPoint", "Where might a learner get stuck right now?", "This helps decide what to build or test next.", missing("currentBottleneck"))
      ],
      commonBottlenecks: ["learner result", "lesson order", "practice", "feedback", "delivery"],
      reflectionNouns: { audience: "learner", output: "lesson or module" }
    },
    other: {
      id: "other",
      legacyType: "other",
      label: "project",
      keywords: [],
      stages: [
        stage("Name the destination", "Know what is being created and why it matters.", "A concrete outcome and who it serves."),
        stage("Find where it stands", "Identify what exists and what is unfinished.", "A plain current position and next dependency."),
        stage("Create the next useful piece", "Make one visible piece of progress.", "One finished artifact, decision, or test."),
        stage("Review what changed", "Check whether the work moved the project forward.", "A saved result and next natural move."),
        stage("Prepare the next handoff", "Make the next session easy to start.", "A clear place to pick up.")
      ],
      questions: [
        q("projectPurpose", "What are you creating, in plain language?", "A sentence fragment is fine.", missing("purpose")),
        q("successDefinition", "What would make it feel meaningfully further along?", "This helps me choose a useful next move.", missing("definitionOfSuccess")),
        q("currentPosition", "What currently exists, and what still feels unfinished?", "A short answer is enough.", missing("currentStage")),
        q("difficulty", "What feels difficult or unclear right now?", "This helps me find the real bottleneck.", missing("currentBottleneck"))
      ],
      commonBottlenecks: ["destination", "current position", "missing piece", "decision", "constraint"],
      reflectionNouns: { audience: "person it serves", output: "useful next piece" }
    }
  };

  function stage(name, purpose, requiredOutput) {
    return { name, purpose, requiredOutput };
  }

  function q(id, prompt, help, when) {
    return { id, prompt, help, when };
  }

  function missing(field) {
    return (model) => !fieldValue(model, field);
  }

  function hasAny(...words) {
    return (model) => words.some((word) => (model.originalDescription || model.projectDescription || "").toLowerCase().includes(word));
  }

  function fieldValue(model, field) {
    if (!model) return "";
    const direct = model[field];
    if (Array.isArray(direct)) return direct.length ? direct.join(" ") : "";
    if (direct) return String(direct);
    const state = model.fieldStates?.[field];
    if (Array.isArray(state?.value)) return state.value.length ? state.value.join(" ") : "";
    return state?.value ? String(state.value) : "";
  }

  function resolveDomain(text = "", shortcut = "") {
    const normalizedShortcut = shortcutMap(shortcut);
    const lower = String(text || "").toLowerCase();
    if (normalizedShortcut && normalizedShortcut !== "other") {
      if (normalizedShortcut === "book" && /novel|fantasy|romance|mystery|thriller|fiction|character|scene/.test(lower)) return "novel";
      if (normalizedShortcut === "book" && /nonfiction|guide|manual|memoir|reader|research/.test(lower)) return "nonfiction_book";
      if (normalizedShortcut === "content" && /podcast|episode|guest/.test(lower)) return "podcast";
      if (normalizedShortcut === "content" && /course|lesson|module|student/.test(lower)) return "course";
      if (normalizedShortcut === "content") return "content_channel";
      if (normalizedShortcut === "app") return "software_app";
      return normalizedShortcut;
    }

    if (/marketing|campaign|ads|views|followers|sign up|signup|conversion/.test(lower)) return "marketing";
    if (/app|software|prototype|dashboard|mobile|phone|upload|import|screen/.test(lower)) return "software_app";
    const ordered = ["novel", "nonfiction_book", "podcast", "course", "content_channel", "business", "software_app"];
    return ordered.find((id) => STRATEGIES[id].keywords.some((keyword) => lower.includes(keyword))) || "other";
  }

  function shortcutMap(shortcut = "") {
    return {
      app: "app",
      software_app: "software_app",
      book: "book",
      novel: "novel",
      nonfiction_book: "nonfiction_book",
      marketing: "marketing",
      business: "business",
      content: "content",
      content_channel: "content_channel",
      podcast: "podcast",
      course: "course",
      creative: "other",
      other: "other"
    }[shortcut] || "";
  }

  const api = { STRATEGIES, resolveDomain };
  global.IterNestDomainStrategies = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);