# V2U Subject Expansion Audit (Phase 67)

Status: **audit + proposal only. No new curriculum was added.**
English and Reasoning exist only as `proposed` entries in `src/subjects/registry.ts`
(no lessons, skills, diagnostic items or learner-facing screens).

## 1. Hard-coded three-subject assumptions found

| Where | Assumption | Phase 67 change |
|---|---|---|
| `src/diagnostic/engine.ts` | `SUBJECT_ORDER = ['math','physics','programming']`, fixed label/emoji maps | Derived from the subject registry ∩ curriculum subjects (same values today) |
| `src/components/v2u/tokens.ts` | `SubKey` union + fixed `SUB` map (colour/icon) | `subOf()` reads `subjectIdentity()`; unknown ids get a neutral identity |
| `src/components/pathway/PathwayBits.tsx` | subject cards in `lg:grid-cols-3` | auto-fit grid (any number of subjects) |
| `src/pages/DiagnosticPage.tsx` | subject status cards in `lg:grid-cols-3` | auto-fit grid |
| `src/curriculum/types.ts` | `CurriculumSubjectId = 'math' \| 'programming' \| 'physics'` | **Kept** (type safety). Adding a subject = add it to this union + curriculum data + registry status `active`; the compiler then lists every exhaustive map to fill |
| Legacy store pages (`Dashboard`, `DailyLearningChoice`, `TodayPlanSection`, `SubjectDistributionChart`, `PlannerPage`) | `Record<SubjectId, …>` colour maps | Kept — exhaustive by type, so a new `SubjectId` is a compile error until styled (safe, not silent) |
| `src/components/ui/subjectStyle.ts` | style map | Already falls back for unknown ids |
| `src/content/audit.ts` | programming / physics / else-math criteria | Kept (content rules per subject); a new subject needs its own criteria |
| `src/interactive/studio/*` | studio scripts for math/physics/programming | Kept; other subjects fall back to the existing interactive player |
| `src/pages/hubs/LearnHub.tsx` | already auto-fit grids over `SUBJECT_ORDER` | none needed |

Learning business rules (diagnostic scoring, mastery, review, `getNextStep`, pathway) were not changed;
they iterate `SUBJECT_ORDER`, which now comes from the registry.

## 2. How a subject supports the university-preparation pathway

V2U's pathway today: Goal → Subject → Topic → Lesson → Skill, driven by diagnostic + mastery.
Later: University → Faculty → Major → Admission requirements will choose the subjects a learner needs.
A subject is worth adding only if (a) admission or first-year study actually requires it and
(b) V2U can teach it with the same loop (learn → practice → check → review) and verified sources.

## 3. Recommended next subjects (proposal)

### English (priority 1)
- **Why:** required by almost every admission route and by first-year engineering/CS study (reading English textbooks, documentation, technical terms).
- **Candidate areas:** grammar for accuracy · academic vocabulary · reading comprehension (main idea, inference, reference) · technical English for STEM (reading formulas/specs/docs).
- **Fits the loop:** yes — items are auto-checkable (choice, cloze), mistakes are well known (tense, articles, prepositions).
- **Open questions before building:** which admission tests' English sections to align with (verify the official test blueprints first); Thai-medium explanations.

### Aptitude / Analytical Reasoning (priority 2)
- **Why:** general aptitude (numerical, logical, analytical) is part of selection and overlaps strongly with existing Math skills.
- **Candidate areas:** numerical reasoning (ratios, percentages, data reading) · logical reasoning (conditions, sequences, deduction) · pattern & problem solving.
- **Fits the loop:** yes — fully auto-checkable; can reuse Math skills as prerequisites.
- **Open questions:** align to the official aptitude test specification before writing items.

## 4. Steps to enable a new subject (when approved)
1. Verify the official curriculum / test blueprint (opened, not search-only).
2. Add knowledge-layer lessons with skills, prerequisites, allowed/not-yet knowledge and verified practice.
3. Add the id to `CurriculumSubjectId`, curriculum data, diagnostic items; set registry status to `active`.
4. Design tokens (colour/icon) and fill the compile-time style maps.
5. Tests: knowledge integrity, diagnostic, browser at all widths.

## 5. Research still blocked
Official admission/test blueprints (e.g. mytcas.com) and Thai curriculum sites could not be opened from the research environment, so no subject content was drafted.
