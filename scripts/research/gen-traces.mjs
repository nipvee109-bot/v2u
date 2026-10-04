/** Regenerates src/interactive/studio/traces.json from the knowledge code samples (real python3). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const K = await createJiti(import.meta.url).import(path.join(root, 'src/content/knowledge/index.ts'));
const { TRACE_SAMPLES } = await createJiti(import.meta.url).import(path.join(root, 'src/interactive/studio/traceSamples.ts'));
const samples = TRACE_SAMPLES.map((s) => {
  const k = K.getLessonKnowledge(s.lessonId);
  const src = s.exampleId ? k.workedExamples.find((e) => e.id === s.exampleId) : k.debugging.find((d) => d.id === s.debugId);
  return { id: s.id, code: s.exampleId ? src.code : src.buggy, stdin: s.stdin ?? '' };
});
const tmp = path.join(os.tmpdir(), 'v2u-trace-samples.json');
fs.writeFileSync(tmp, JSON.stringify(samples));
const out = process.argv[2] ?? path.join(root, 'src/interactive/studio/traces.json');
console.log(execFileSync('python3', [path.join(root, 'scripts/research/gen_traces.py'), tmp, out], { encoding: 'utf-8' }).trim());
