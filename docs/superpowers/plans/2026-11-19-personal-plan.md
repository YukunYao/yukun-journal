# Personal Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors create and edit an optional self-written plan in their current journal.

**Architecture:** Add a small plan value and a pure setter to `domain.ts`; the existing journal persistence saves it. Render a dedicated form on AI Plan and a short summary on My Day. Backup restore validates the new value.

**Tech Stack:** React, TypeScript, IndexedDB, Vitest, existing CSS.

**Spec:** `docs/superpowers/specs/2026-11-19-personal-plan-design.md`

## Global Constraints

- English only; journal first; no required account or questionnaire for a self-written plan.
- No health advice, scoring, or automatic tracking of plan completion.

## Review Focus

- Empty save clears the plan; whitespace-only fields do not create a plan.
- Old journals without this field load normally.
- Invalid plan fields in a backup are rejected before replacement.
- Cloud save failure keeps the editable draft and does not claim it was saved.
- My Day shows a short focus only when a plan exists.

---

### Task 1: Plan data and backup validation

**Files:** `src/domain.ts`, `src/domain.test.ts`, `src/storage.ts`, `src/storage.test.ts`

**Interfaces:** `PersonalPlan` with four text sections and `updatedAt`; `setPersonalPlan(state, sections, now): JournalState` trims fields, returns null plan when all are blank, and rejects fields over 500 characters.

- [ ] Write tests for save/clear, old journal normalization, and invalid backup content.
- [ ] Run targeted tests and observe the expected failure.
- [ ] Implement the data and validation with no change to other journal rewards.
- [ ] Run targeted tests until green.

### Task 2: Self-written plan interface

**Files:** `src/ServicePages.tsx`, `src/App.tsx`, `src/services.css`, `README.md`

**Interfaces:** `AiPlanPage` receives the current journal and an async save callback using the existing `commit` path.

- [ ] Add the editable form and clear action, with visible save/error feedback.
- [ ] Show the plan focus on My Day without completion pressure.
- [ ] Keep gated AI generation separate and explain its availability.
- [ ] Check desktop and mobile appearance; run tests, lint, build, diff check.
- [ ] Publish only to `YukunYao/yukun-journal` and verify the live page.
