const assert = require("assert");
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

test("first use builds an unconfirmed project understanding from the founder story", () => {
  const model = Understanding.createUnderstandingFromStory(
    "I'm creating a YouTube video for overwhelmed founders. I have the main idea but not the outline or script. I want to publish it in two weeks."
  );

  assert.equal(model.confirmed, false);
  assert.equal(model.projectType, "content");
  assert.equal(model.currentStage, "shaping");
  assert.ok(model.projectDescription.includes("YouTube video"));
  assert.ok(Array.isArray(model.projectTimeline));
  assert.ok(model.projectTimeline.length >= 5);
  assert.ok(model.confirmedFacts.some((fact) => fact.includes("Project description")));
});

test("natural language story drives project type without a selected shortcut", () => {
  const model = Understanding.createUnderstandingFromStory(
    "I'm writing a children's book. I have the idea and want to finish the first chapter for young readers."
  );

  assert.equal(model.projectType, "book");
  assert.ok(model.projectDescription.includes("children's book"));
});

test("confirmation is explicit and timeline corrections are preserved", () => {
  const model = Understanding.createUnderstandingFromStory("I'm building an app. I am planning the onboarding and need a beta by August.");
  assert.equal(model.confirmed, false);

  const confirmed = Understanding.confirmUnderstanding(model, { 0: "complete", 1: "active" });
  assert.equal(confirmed.confirmed, true);
  assert.equal(confirmed.projectTimeline[0].status, "complete");
  assert.equal(confirmed.projectTimeline[1].status, "active");
  assert.ok(confirmed.confirmedFacts.includes("Founder confirmed the project summary."));
});

test("timeline stage edits are saved during confirmation", () => {
  const model = Understanding.createUnderstandingFromStory("I'm building an app and planning the first user flow.");
  const confirmed = Understanding.confirmUnderstanding(model, {
    0: {
      name: "Choose the first founder journey",
      requiredOutput: "One named journey from opening the app to saving progress.",
      status: "active"
    }
  });

  assert.equal(confirmed.projectTimeline[0].name, "Choose the first founder journey");
  assert.equal(confirmed.projectTimeline[0].requiredOutput, "One named journey from opening the app to saving progress.");
  assert.equal(confirmed.projectTimeline[0].status, "active");
});

test("correction updates the relevant field without pretending it was inferred", () => {
  const model = Understanding.createUnderstandingFromStory("I'm making something for customers.");
  const corrected = Understanding.applyQuestionAnswer(model, "currentStage", "testing with two customers");

  assert.equal(corrected.currentStage, "testing with two customers");
  assert.equal(corrected.confidenceByField.currentStage, "high");
  assert.ok(corrected.confirmedFacts.some((fact) => fact.includes("Current Stage: testing with two customers")));
});

test("return flow migrates existing beta projects into the understanding model", () => {
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

  assert.equal(migrated.confirmed, true);
  assert.equal(migrated.projectType, "book");
  assert.equal(migrated.currentMilestone, "Finish chapter 1");
  assert.ok(migrated.completedWork.includes("Outline Chapter 1"));
  assert.ok(migrated.assumptions.some((item) => item.includes("Current stage")));
});

test("readiness gate withholds a strong recommendation when current stage is unknown", () => {
  const model = Understanding.createUnderstandingFromStory("I'm creating a new project for local parents.");
  const recommendation = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "90 minutes" });

  assert.equal(recommendation.confidence, "Low");
  assert.ok(recommendation.action.includes("Answer one project question"));
  assert.ok(recommendation.startHere.includes("Where are you right now"));
});

test("available time changes work size, not the logical stage order", () => {
  const model = Understanding.confirmUnderstanding(
    Understanding.applyQuestionAnswer(
      Understanding.createUnderstandingFromStory("I'm creating a YouTube video. I am outlining it for overwhelmed founders."),
      "intendedOutcome",
      "A complete video outline ready to become a script"
    )
  );

  const short = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "10 minutes" });
  const long = Understanding.buildRecommendationFromUnderstanding(model, { availableTime: "90 minutes" });

  assert.notEqual(short.action, long.action);
  assert.ok(short.whyThisComesNext.includes("Available time changes the size"));
  assert.ok(long.whyThisComesNext.includes("Available time changes the size"));
  assert.equal(short.readiness, "Ready for next move");
  assert.equal(long.readiness, "Ready for next move");
});

test("progress updates refine understanding without adding a task pile", () => {
  const model = Understanding.confirmUnderstanding(
    Understanding.applyQuestionAnswer(
      Understanding.createUnderstandingFromStory("I'm building an app and shaping the onboarding flow."),
      "intendedOutcome",
      "A usable onboarding flow"
    )
  );
  const updated = Understanding.applyProgressToUnderstanding(model, {
    status: "done",
    recommendationTitle: "Create a focused draft of a complete flow outline.",
    note: "The first three screens are decided."
  });

  assert.ok(updated.completedWork.includes("Create a focused draft of a complete flow outline."));
  assert.equal(updated.continuity.whereWorkStopped, "The first three screens are decided.");
  assert.ok(!updated.completedWork.includes("Task"));
});
