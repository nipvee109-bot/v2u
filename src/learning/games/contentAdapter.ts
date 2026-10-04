/* V2UGameContentAdapter (Phase 70): V2U lesson knowledge → GameContent 1.1.
   Everything is read from the curriculum + knowledge layer; nothing is authored here
   except V2U's own narration phrases (UI voice, no curriculum facts). Missing data is
   listed in `missing`, never filled in. */

import { CURRICULUM } from '../../curriculum/data';
import { getLessonKnowledge } from '../../content/knowledge';
import type { KnowledgePractice, KnowledgeRule, LessonKnowledge } from '../../content/knowledge';
import { GAME_CONTENT_CONTRACT, GAME_CONTRACT_VERSION_1_1 } from './contracts';
import type { GameContent, GamePrediction, HintLadder } from './contracts';
import { GAME_REGISTRY } from './registry';

/** V2U teaching voice for trace narration (Thai around untouched Python words). */
export const TRACE_NARRATION: GameContent['narration'] = {
  conditionTrue: 'เงื่อนไขนี้เป็น True จึงทำบล็อกนี้ แล้วข้ามส่วนที่เหลือของ if / elif / else',
  conditionFalse: 'เงื่อนไขนี้เป็น False จึงข้ามไปตรวจ elif ต่อ (หรือไป else ถ้าไม่มี elif แล้ว)',
  skipped: 'ข้าม — มีเงื่อนไขก่อนหน้าที่เป็น True ไปแล้ว Python ทำได้แค่ทางเดียว',
  elseTaken: 'ไม่มีเงื่อนไขไหนเป็น True จึงทำ else',
  printed: 'print แสดงข้อความนี้ออกมา',
};

/** Pick the lesson rule a code sample is about (selection only — the rule text is the lesson's). */
function ruleFor(code: string, rules: KnowledgeRule[]): KnowledgeRule | undefined {
  const by = (id: string) => rules.find((r) => r.id === id);
  if (/\b(and|or|not)\b/.test(code)) return by('r-logic') ?? rules[0];
  if (/==|!=/.test(code) && !/\bif\b/.test(code)) return by('r-eq') ?? rules[0];
  if (/\bif\b/.test(code)) return by('r-if') ?? rules[0];
  return rules[0];
}

function hintLadder(p: KnowledgePractice, k: LessonKnowledge): HintLadder {
  const code = p.code ?? '';
  const rule = ruleFor(code, k.rules.filter((r) => r.skillId === p.skillId));
  // worked example on the same idea: and/or/not → an example that uses them; otherwise the first if/elif example
  const sameSkill = k.workedExamples.filter((e) => e.skillId === p.skillId);
  const logic = /\b(and|or|not)\b/.test(code);
  const ex = sameSkill.find((e) => logic === /\b(and|or|not)\b/.test(e.code ?? '')) ?? sameSkill[0];
  return {
    concept: rule ? `${rule.name}: ${rule.statement}` : '',
    focus: p.hint ?? null,
    guided: { exampleId: ex.id, steps: ex.steps },
  };
}

export interface AdapterResult {
  content: GameContent;
  /** Practice items left out, and why */
  excluded: { sourceId: string; reason: string }[];
}

export function buildGameContent(gameId: string, lessonId: string): AdapterResult {
  const game = GAME_REGISTRY.find((g) => g.gameId === gameId);
  if (!game || !game.lessonIds.includes(lessonId)) throw new Error(`game ${gameId} is not registered for ${lessonId}`);
  const lesson = CURRICULUM.lessons.find((l) => l.id === lessonId);
  const k = getLessonKnowledge(lessonId);
  if (!lesson || !k) throw new Error(`unknown lesson ${lessonId}`);
  const skills = new Set(lesson.skillIds);
  const excluded: AdapterResult['excluded'] = [];
  const missing: string[] = [];

  const predictions: GamePrediction[] = [];
  for (const p of [...k.guided, ...k.independent]) {
    if (!skills.has(p.skillId)) { excluded.push({ sourceId: p.id, reason: 'skill outside the lesson' }); continue; }
    if (!p.code || p.verify?.kind !== 'python' || !p.verify.output) { excluded.push({ sourceId: p.id, reason: 'no verified python output' }); continue; }
    // the answer text of “what is wrong” items is longer than the output — the game asks for the output only
    predictions.push({ sourceId: p.id, skillId: p.skillId, level: p.level, prompt: p.prompt, code: p.code, expectedOutput: p.verify.output, explanation: p.explanation, hints: hintLadder(p, k) });
  }
  const noFocus = predictions.filter((p) => !p.hints.focus).map((p) => p.sourceId);
  if (noFocus.length) missing.push(`hint level 2 (focus) for ${noFocus.join(', ')} — the lesson has no item hint`);

  const starterCode = k.workedExamples
    .filter((e) => e.code && skills.has(e.skillId))
    .map((e) => ({ sourceId: e.id, skillId: e.skillId, problem: e.problem, code: e.code as string, expectedOutput: e.verify?.kind === 'python' && e.verify.output ? e.verify.output : e.answer, steps: e.steps }));

  const debugging = (k.debugging ?? [])
    .filter((d) => skills.has(d.skillId))
    .map((d) => ({ sourceId: d.id, skillId: d.skillId, brokenCode: d.buggy, symptom: d.symptom, fixedCode: d.fixed, expectedOutput: d.output, explanation: d.explanation }));
  if (debugging.length < 2) missing.push(`debugging cases: the lesson has ${debugging.length} (a debug level may need more — add them to the knowledge layer first)`);
  missing.push('supportedActions: defined by the game itself (not curriculum)');
  missing.push('per-item misconception for practice items (only understanding-check choices carry misconception links)');

  const skillTitle = (id: string) => CURRICULUM.skills.find((s) => s.id === id)?.title ?? id;
  const content: GameContent = {
    contract: GAME_CONTENT_CONTRACT,
    version: GAME_CONTRACT_VERSION_1_1,
    gameId,
    lessonId,
    subjectId: lesson.subjectId,
    topicId: lesson.topicId,
    language: 'th',
    title: lesson.title,
    skills: lesson.skillIds.map((id) => ({ id, title: skillTitle(id) })),
    objectives: lesson.learningOutcomes,
    prerequisites: lesson.prerequisites.map((id) => ({ lessonId: id, title: CURRICULUM.lessons.find((l) => l.id === id)?.title ?? id })),
    readiness: k.audit.readiness,
    boundary: { allowedKnowledge: k.allowedKnowledge, notYetAllowed: k.notYetAllowed },
    teaching: {
      missionObjective: lesson.learningOutcomes[0],
      whyItMatters: k.whyItMatters,
      concepts: k.concepts.filter((c) => skills.has(c.skillId)),
      rules: k.rules.filter((r) => skills.has(r.skillId)).map((r) => ({ id: r.id, name: r.name, statement: r.statement, skillId: r.skillId })),
      starterCode,
      predictions,
      debugging,
      commonMistakes: k.mistakes,
      summary: k.summary,
    },
    narration: TRACE_NARRATION,
    missing,
  };
  return { content, excluded };
}
