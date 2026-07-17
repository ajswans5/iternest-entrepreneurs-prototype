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

Project Understanding v1

Goal: replace category-first setup with a project-understanding conversation before IterNest recommends work.

The prototype now asks for the founder's project story first, builds a structured Project Understanding model, asks one high-value clarifying question when needed, shows a "Here's what I understand" confirmation, and saves the confirmed model to local project memory.

## Deterministic now

- Project type is inferred from simple keywords, with optional shortcuts as examples.
- Missing information is selected with deterministic readiness rules.
- The internal project timeline starts from project-type templates, then preserves founder corrections.
- Recommendations are generated from the confirmed Project Understanding model and current timeline stage.
- Available time changes the size of the recommended work unit, not the logical project order.
- Existing beta projects are migrated into the new model instead of being discarded.

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
