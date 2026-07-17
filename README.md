# IterNest for Entrepreneurs Prototype

Clickable HTML prototype for **IterNest for Entrepreneurs**.

This repo is the experience model for the entrepreneur product. It exists so AJ, Juniper, and Friday can work from the same visual and interaction source of truth.

## What this is

A living prototype for the coffee-coach experience:

- warm, low-clutter interface
- conversation-first home screen
- Need Help flow
- coach response screen
- prototype session flow
- project/history screens later

## What this is not

This is not the production app. Friday should not treat this as final architecture, backend logic, or the full engine implementation.

## Build rule

Do not redesign the UX unless AJ explicitly asks. Match the approved prototype experience.

## Current sprint

Understanding-First architecture

Goal: replace category-first setup with a project-understanding conversation before IterNest recommends work.

The prototype now asks for the founder's project story first, builds a structured Project Understanding model, asks adaptive domain-specific follow-up questions, shows a "Here's what I think I heard" confirmation, and saves the confirmed model to local project memory before recommendations are unlocked.

## Deterministic now

- Project domain is inferred from simple keywords, with optional shortcuts as examples. Domain strategies currently cover software applications, novels, nonfiction books, marketing projects, businesses, content channels, podcasts, courses, and other projects.
- Missing information is selected with deterministic discovery rules. Juniper asks one useful question at a time and avoids repeating questions that were already answered.
- The internal project timeline starts from project-type templates, then preserves founder corrections.
- Recommendations are locked until the founder confirms the reflected project understanding. After confirmation, recommendations are generated from the Project Understanding model, current timeline stage, bottleneck, and available time.
- Available time changes the size of the recommended work unit, not the logical project order.
- Existing beta projects are migrated into the new model instead of being discarded. Migrated projects keep saved notes, progress, milestones, blockers, and where the user left off, but Juniper asks the founder to confirm the reconstructed understanding before making strong recommendations.

## Later AI responsibility

An AI model should eventually improve natural-language extraction, summarize messy project stories, identify subtle dependencies, and propose better project-specific timelines. It should not bypass confirmation: inferred facts remain unconfirmed until the founder approves or corrects them.

## Juniper voice decisions

Juniper should sound like a thoughtful teammate sitting beside the founder. She asks one thing at a time, reflects what she thinks she heard, and avoids internal product language such as project model, readiness, inference, or confidence score.

Founder-facing screens should use plain phrases such as:

- "Let's figure this out together."
- "I have one question."
- "Here's what I think I heard."
- "I don't understand enough yet to recommend something I trust."
- "Start here."

Recommendation screens should show only the work the founder needs immediately: Action, Start here, and Done when. Supporting reasoning can be available behind "Why?" but should not compete with the next move.

## Local use

Open `index.html` in a browser.

No build step is required for the prototype. Run the deterministic model tests with:

```powershell
node tests/project-understanding.test.js
```