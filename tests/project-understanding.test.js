const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Understanding = require("../project-understanding");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function answer(model, id, value) {
  return Understanding.applyQuestionAnswer(model, id, value);
}

function confirmedAfterOneAnswer(story, response, time = "30 minutes") {
  let model = Understanding.createUnderstandingFromStory(story);
  const question = Understanding.selectNextQuestion(model);
  model = answer(model, question.id, response);
  model = Understanding.confirmUnderstanding(model);
  return { model, question, recommendation: Understanding.buildRecommendationFromUnderstanding(model, { availableTime: time }) };
}

test("first use builds an unconfirmed project understanding from founder story", () => {
  const model = Understanding.createUnderstandingFromStory(
    "I'm creating a YouTube video for overwhelmed founders. I have the main idea but not the outline or script. I want to publish it in two weeks."
  );

  assert.equal(model.confirmed, false);
  assert.equal(model.projectDomain, "content_channel");
  assert.equal(model.projectType, "content");
  assert.ok(model.projectDescription.includes("YouTube video"));
  assert.ok(Array.isArray(model.projectTimeline));
  assert.ok(model.projectTimeline.length >= 5);
});

test("recommendation cannot be generated before understanding is confirmed", () => {
  const model = Understanding.createUnderstandingFromStory("I'm building an app. The first flow works, but I do not know what should come next.");
  const recommendation = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "90 minutes" });

  assert.equal(recommendation.confidence, "Low");
  assert.equal(recommendation.readiness, "Needs understanding first");
  assert.ok(recommendation.action.includes("Answer one project question"));
});

test("generic entrepreneur app does not receive homeschool-specific recommendation", () => {
  const { recommendation } = confirmedAfterOneAnswer(
    "I've been building this for six months. I don't know what comes next. I have 40 screens. It works but doesn't feel right.",
    "It's an app for small business owners, but the dashboard feels confusing and I don't know what to fix first."
  );

  const text = `${recommendation.action} ${recommendation.startHere} ${recommendation.whyThisComesNext}`;
  assert.ok(!/parent|lesson|teaching plan|curriculum/i.test(text));
  assert.ok(/flow|app|usable|screen|user/i.test(text));
});

test("migrated unconfirmed projects invalidate stale current recommendations", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

  assert.ok(appSource.includes("recommendationNeedsReconfirmation"));
  assert.ok(appSource.includes("currentRecommendation: recommendationNeedsReconfirmation ? null"));
});

test("corrections can update project domain and project description", () => {
  let model = Understanding.createUnderstandingFromStory("I'm writing a book about my coaching business.");
  model = answer(model, "correction", "Actually it is not a book. It is a landing page for my coaching offer.");
  const summary = Understanding.summaryForConfirmation(model);

  assert.equal(model.projectDomain, "marketing");
  assert.equal(model.projectType, "business");
  assert.ok(model.projectDescription.includes("landing page"));
  assert.ok(!summary.created.includes("book"));
});

test("business domain is detected from ordinary founder language", () => {
  const model = Understanding.createUnderstandingFromStory("I've been open two years. I make money. I'm overwhelmed. I don't know what to fix first.");
  const question = Understanding.selectNextQuestion(model);

  assert.equal(model.projectDomain, "business");
  assert.equal(question.id, "constraint");
  assert.ok(/business hard|delivery|pricing|customers/i.test(`${question.prompt} ${question.help}`));
});

test("audience extraction ignores duration and beta-readiness phrases", () => {
  const duration = Understanding.createUnderstandingFromStory("I've been building this for six months. I have 40 screens.");
  const beta = Understanding.createUnderstandingFromStory("I'm building an app. It's ready for beta, but none of the core screens connect.");

  assert.notEqual(duration.audience, "six months");
  assert.notEqual(beta.audience, "beta,");
});

test("completed work extraction captures bounded work, not entire paragraphs", () => {
  const model = Understanding.createUnderstandingFromStory("I have 40 screens. It works but doesn't feel right. I don't know what comes next.");

  assert.ok(model.completedWork.includes("40 screens"));
  assert.ok(model.completedWork.includes("It works"));
  assert.ok(model.completedWork.every((item) => item.length < 80));
  assert.ok(!model.completedWork.some((item) => /I don't know what comes next/i.test(item)));
});

test("contradictions are clarified before normal discovery questions", () => {
  const model = Understanding.createUnderstandingFromStory("I'm building an app. It's ready for beta, but none of the core screens connect and I don't know what users should do first.");
  const question = Understanding.selectNextQuestion(model);

  assert.equal(question.id, "contradictionBetaReadiness");
  assert.ok(/ready for beta|not connected|more accurate/i.test(question.prompt));
  assert.equal(Understanding.hasEnoughForReflection(model), false);
});

test("resolved bottleneck produces next unlock instead of generic clarification", () => {
  let model = Understanding.createUnderstandingFromStory("I'm marketing my app. Videos get views, but nobody signs up.");
  const question = Understanding.selectNextQuestion(model);
  model = Understanding.confirmUnderstanding(answer(model, question.id, "The bio link was unclear."));
  const updated = Understanding.applyReturningUpdate(model, "I fixed the bio link and two people joined the beta.");
  const recommendation = Understanding.buildRecommendationFromUnderstanding(updated, { availableTime: "30 minutes" });

  assert.equal(recommendation.readiness, "Ready for next move");
  assert.equal(recommendation.confidence, "Medium");
  assert.ok(/previous blocker appears resolved|next useful unlock/i.test(recommendation.whyThisComesNext));
  assert.ok(!recommendation.action.includes("Answer one project question"));
});

test("reflection cleanup avoids raw fragment repetition", () => {
  let model = Understanding.createUnderstandingFromStory("making a thing for my cousin idk it kinda works but feels off lol");
  model = answer(model, "projectPurpose", "It should help her plan a party without texting me ten times.");
  const summary = Understanding.summaryForConfirmation(model);

  assert.ok(!summary.created.includes("idk"));
  assert.ok(!summary.created.includes("lol"));
  assert.ok(!summary.created.includes("You are creating making"));
});

test("low-confidence understanding continues clarification instead of allowing confirmation", () => {
  let model = Understanding.createUnderstandingFromStory("Book. messy. don't know.");
  let question = Understanding.selectNextQuestion(model);
  model = answer(model, question.id, "I don't know");
  question = Understanding.selectNextQuestion(model);

  assert.equal(Understanding.hasEnoughForReflection(model), false);
  assert.ok(question);
  assert.notEqual(question.id, undefined);
});

test("previously supplied information is not requested again", () => {
  let model = Understanding.createUnderstandingFromStory("I'm building a homeschool app. It works on my laptop, but not my phone.");
  const first = Understanding.selectNextQuestion(model);
  model = answer(model, first.id, "The same upload button does nothing on mobile.");
  const next = Understanding.selectNextQuestion(model);

  assert.notEqual(next?.id, first.id);
});

test("app strategy understands a homeschool app already in progress", () => {
  const { model, question, recommendation } = confirmedAfterOneAnswer(
    "I'm building a homeschool app. Curriculum upload works on my laptop, but not my phone. It also pulls out the lessons, but what it puts on the screen doesn't feel like what a parent would actually do.",
    "The parent needs a teaching plan, not a pile of extracted activities.",
    "45 minutes"
  );

  assert.equal(model.projectDomain, "software_app");
  assert.ok(/phone|parent|lesson|screen|import/i.test(question.prompt));
  assert.ok(/parent teaching plan|phone upload/i.test(recommendation.action));
});

test("novel strategy does not produce generic write-more advice", () => {
  const { model, recommendation } = confirmedAfterOneAnswer(
    "I'm writing a fantasy novel. I'm about three-quarters done. I know the ending, but the middle feels boring and I don't know which scene should come next.",
    "The hero has learned the truth, but nothing forces her to act yet."
  );

  assert.equal(model.projectDomain, "novel");
  assert.ok(/main character|scene|problem|act/i.test(recommendation.action));
  assert.ok(!/^write the next chapter/i.test(recommendation.action));
});

test("marketing strategy does not produce generic post-consistently advice", () => {
  const { model, recommendation } = confirmedAfterOneAnswer(
    "I'm marketing my app. The story videos get views, especially on TikTok, but people aren't signing up.",
    "They can click the profile link, but it does not clearly invite them into the beta."
  );

  assert.equal(model.projectDomain, "marketing");
  assert.ok(/action|signup|attention/i.test(recommendation.action + recommendation.summary));
  assert.ok(!/post consistently/i.test(recommendation.action + recommendation.summary));
});

test("available time changes work size, not logical stage order", () => {
  let model = Understanding.createUnderstandingFromStory("I'm creating a YouTube video. I am outlining it for overwhelmed founders, but the outline is unclear.");
  model = answer(model, "audienceAction", "A complete video outline ready to become a script");
  model = answer(model, "difficulty", "The opening and sections are not in a useful order yet.");
  model = Understanding.confirmUnderstanding(model);

  const short = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "10 minutes" });
  const long = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "90 minutes" });

  assert.notEqual(short.action, long.action);
  assert.ok(short.whyThisComesNext.includes("Available time changes the size"));
  assert.ok(long.whyThisComesNext.includes("Available time changes the size"));
});

test("progress updates refine understanding without adding a task pile", () => {
  let model = Understanding.createUnderstandingFromStory("I'm building an app and shaping the onboarding flow. The next step is unclear.");
  model = answer(model, "successDefinition", "A usable onboarding flow");
  model = answer(model, "difficulty", "The first three screens need a clearer order.");
  model = Understanding.confirmUnderstanding(model);
  const updated = Understanding.applyProgressToUnderstanding(model, {
    status: "done",
    recommendationTitle: "Create a focused draft of a complete flow outline.",
    note: "The first three screens are decided."
  });

  assert.ok(updated.completedWork.includes("Create a focused draft of a complete flow outline."));
  assert.equal(updated.continuity.whereWorkStopped, "The first three screens are decided.");
  assert.ok(!updated.completedWork.includes("Task"));
});

test("user-facing UI does not display raw engine diagnostics", () => {
  const root = path.join(__dirname, "..");
  const visibleFiles = ["index.html", "app.js"].map((file) => fs.readFileSync(path.join(root, file), "utf8"));
  const visibleText = visibleFiles.join("\n");

  assert.ok(!/50 reasoning items|confidence score|parser output|chain-of-thought|timeline object/i.test(visibleText));
});