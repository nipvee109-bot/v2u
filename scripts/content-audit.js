/**
 * V2U content audit — every number is computed from the curriculum, the V2U
 * original lessons, the interactive checks and the resource registry.
 * Run: npm run audit:content
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url);
const A = await jiti.import(path.join(root, 'src/content/audit.ts'));
const { lessons, subjects, totals } = A.auditCurriculum();
const NAME = { math: 'Math', programming: 'Programming', physics: 'Physics' };

console.log('CONTENT AUDIT\n');
for (const s of subjects) console.log(`${NAME[s.subjectId]}\n- lesson: ${s.lessons}\n- complete: ${s.complete}\n- needs_content: ${s.needsContent}\n`);
console.log(`Practice: ${totals.practice}/${totals.lessons}`);
console.log(`Understanding Check: ${totals.check}/${totals.lessons}`);
console.log(`V2U Original Explanation: ${totals.original}/${totals.lessons}`);
console.log(`Reading 8-section: ${totals.reading}/${totals.lessons}`);
console.log(`Resources (any): ${totals.withResources}/${totals.lessons} · playable video in V2U: ${totals.withPlayableVideo}/${totals.lessons}`);
console.log(`Duplicated (generic) texts: ${totals.duplicatedTexts}\n`);
console.log('lesson | subject | topic | status | practice | check | examples | resources (videos/playable/checked) | next');
for (const l of lessons) {
  const miss = l.missing.length ? ` missing: ${l.missing.map((m) => A.CRITERION_LABEL[m]).join(', ')}` : '';
  console.log(`${l.lessonId} | ${l.subjectId} | ${l.topicId} | ${l.status}${miss} | ${l.practiceCount} | ${l.checkCount} | ${l.exampleCount} | ${l.resources.total} (${l.resources.videos}/${l.resources.playableInV2U}/${l.resources.checked}) | ${l.nextLessonIds.join(', ') || '—'}`);
}
