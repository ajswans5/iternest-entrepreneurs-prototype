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

test("first use builds an unconfirmed project understanding from the founder story", () => {
  const model = Understanding.createUnderstandingFromStory(
    "I'm creating a YouTube video for overwhelmed founders. I have the main idea but not the outline or script. I want to publish it in two weeks."
  );

  assert.equal(model.confirmed, false);
  assert.equal(model.projectDomain, "content_channel");
  assert.equal(model.projectType, "content");
  assert.ok(model.projectDescription.includes("YouTube video"));
  assert.ok(Array.isArray(model.projectTimeline));
  assert.ok(model.projectTimeline.length >= 5);
  assert.ok(model.confirmedFacts.some((fact) => fact.includes("Project description")));
});

test("recommendation cannot be generated before project understanding is confirmed", () => {
  const model = Understanding.createUnderstandingFromStory("I'm building an app. The first flow works, but I do not know what should come next.");
  const recommendation = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "90 minutes" });

  assert.equal(recommendation.confidence, "Low");
  assert.equal(recommendation.readiness, "Needs understanding first");
  assert.ok(recommendation.action.includes("Answer one project question"));
});

test("concise answers trigger targeted follow-up questions instead of generic recommendations", () => {
  const model = Understanding.createUnderstandingFromStory("Fantasy novel. Three quarters done. Middle is boring. Ending known.");
  const question = Understanding.selectNextQuestion(model);

  assert.equal(model.projectDomain, "novel");
  assert.ok(/middle|main character|pressure|change/i.test(question.prompt));
});

test("previously supplied information is not requested again", () => {
  let model = Understanding.createUnderstandingFromStory("I'm building a homeschool app. It works on my laptop, but not my phone.");
  const first = Understanding.selectNextQuestion(model);
  model = answer(model, first.id, "The same upload button does nothing on mobile.");
  const next = Understanding.selectNextQuestion(model);

  assert.notEqual(next?.id, first.id);
});

test("confirmation is explicit and timeline corrections are preserved", () => {
  const model = Understanding.createUnderstandingFromStory("I'm building an app. I am planning the onboarding and need a beta by August.");
  assert.equal(model.confirmed, false);

  const confirmed = Understanding.confirmUnderstanding(model, { 0: "complete", 1: "active" });
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.projectTimeline[0].status, "complete");
  assert.equal(confirmed.projectTimeline[1].status, "active");
  assert.ok(confirmed.confirmedFacts.includes("Founder confirmed the project reflection."));
});

test("existing beta projects migrate without losing saved data", () => {
  const migrated = Understanding.migrateProjectToUnderstanding({
    type: "book",
    name: "Children's Book",
    milestone: "Finish chapter 1",
    targetDate: "next Friday",
    whereLeftOff: "Opening scene",
    progress: [{ recommendationTitle: "Outline Chapter 1" }],
    memory: { blockers: [{ blockerType: "unclear ending" }] },
    createdAt: "2026-07-16T00:00:00.000Z"
  });

  assert.equal(migrated.confirmed, false);
  assert.equal(migrated.needsReview, true);
  assert.equal(migrated.projectType, "book");
  assert.equal(migrated.currentMilestone, "Finish chapter 1");
  assert.ok(migrated.completedWork.includes("Outline Chapter 1"));
  assert.ok(migrated.assumptions.some((item) => item.includes("confirm")));
});

test("user corrections update only the relevant understanding fields", () => {
  const model = Understanding.createUnderstandingFromStory("I'm making something for customers. I am testing it and the price feels wrong.");
  const beforeCompleted = model.completedWork.slice();
  const corrected = answer(model, "correction", "The customer is local bakery owners, not general customers.");

  assert.equal(corrected.audience, "The customer is local bakery owners, not general customers.");
  assert.deepEqual(corrected.completedWork, beforeCompleted);
  assert.ok(corrected.userCorrections.includes("The customer is local bakery owners, not general customers."));
});

test("confirmed facts, inferences, and unknowns remain distinct", () => {
  const model = Understanding.createUnderstandingFromStory("I'm writing a fantasy novel and the middle feels slow.");

  assert.ok(model.confirmedFacts.some((fact) => fact.includes("Project description")));
  assert.ok(model.reasonableInferences.some((fact) => fact.includes("Project Domain")));
  assert.ok(model.unknowns.length > 0);
  assert.equal(model.fieldStates.projectDescription.status, "confirmed");
  assert.equal(model.fieldStates.projectDomain.status, "inferred");
});

test("app strategy understands a project already in progress", () => {
  const model = Understanding.createUnderstandingFromStory(
    "I'm building a homeschool app. Curriculum upload works on my laptop, but not my phone. It also pulls out the lessons, but what it puts on the screen doesn't feel like what a parent would actually do."
  );
  const question = Understanding.selectNextQuestion(model);
  const confirmed = Understanding.confirmUnderstanding(answer(model, question.id, "The parent needs a teaching plan, not a pile of extracted activities."));
  const recommendation = Understanding.buildRecommendationFromUnderstanding(confirmed, { availableTime: "45 minutes" });

  assert.equal(model.projectDomain, "software_app");
  assert.ok(/phone|parent|lesson|screen|import/i.test(question.prompt));
  assert.ok(/parent teaching plan|phone upload/i.test(recommendation.action));
  assert.ok(!/build another screen/i.test(recommendation.action));
});

test("novel strategy does not produce generic write more advice", () => {
  let model = Understanding.createUnderstandingFromStory(
    "I'm writing a fantasy novel. I'm about three-quarters done. I know the ending, but the middle feels boring and I don't know which scene should come next."
  );
  const question = Understanding.selectNextQuestion(model);
  model = Understanding.confirmUnderstanding(answer(model, question.id, "The hero has learned the truth, but nothing forces her to act yet."));
  const recommendation = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "30 minutes" });

  assert.equal(model.projectDomain, "novel");
  assert.ok(/main character|scene|problem|act/i.test(recommendation.action));
  assert.ok(!/^write the next chapter/i.test(recommendation.action));
});

test("marketing strategy does not produce generic post consistently advice", () => {
  let model = Understanding.createUnderstandingFromStory(
    "I'm marketing my app. The story videos get views, especially on TikTok, but people aren't signing up."
  );
  const question = Understanding.selectNextQuestion(model);
  model = Understanding.confirmUnderstanding(answer(model, question.id, "They can click the profile link, but it does not clearly invite them into the beta."));
  const recommendation = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "25 minutes" });

  assert.equal(model.projectDomain, "marketing");
  assert.ok(/action|signup|attention/i.test(recommendation.action + recommendation.summary));
  assert.ok(!/post consistently/i.test(recommendation.action + recommendation.summary));
});

test("returning-user updates can change the next recommendation", () => {
  let model = Understanding.createUnderstandingFromStory("I'm marketing my app. Videos get views, but nobody signs up.");
  const question = Understanding.selectNextQuestion(model);
  model = Understanding.confirmUnderstanding(answer(model, question.id, "The link after watching is unclear."));
  const before = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "25 minutes" });
  const updated = Understanding.applyReturningUpdate(model, "I fixed the profile link and now the page explains the beta clearly.");
  const after = Understanding.buildRecommendationFromUnderstanding(updated, { availableTime: "25 minutes" });

  assert.ok(updated.completedWork.some((item) => item.includes("fixed the profile link")));
  assert.notEqual(after.importantAssumption, before.importantAssumption);
});

test("available time changes work size, not the logical stage order", () => {
  let model = Understanding.createUnderstandingFromStory("I'm creating a YouTube video. I am outlining it for overwhelmed founders, but the outline is unclear.");
  model = answer(model, "audienceAction", "A complete video outline ready to become a script");
  model = answer(model, "difficulty", "The opening and sections are not in a useful order yet.");
  model = Understanding.confirmUnderstanding(model);

  const short = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "10 minutes" });
  const long = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "90 minutes" });

  assert.notEqual(short.action, long.action);
  assert.ok(short.whyThisComesNext.includes("Available time changes the size"));
  assert.ok(long.whyThisComesNext.includes("Available time changes the size"));
  assert.equal(short.readiness, "Ready for next move");
  assert.equal(long.readiness, "Ready for next move");
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