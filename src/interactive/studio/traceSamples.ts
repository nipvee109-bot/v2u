/* Which knowledge code samples get a step-by-step trace (Phase 69).
   The trace itself is produced by running the code in real python3
   (scripts/research/gen-traces.mjs → traces.json) and re-checked by the tests. */
export interface TraceSample {
  id: string;
  lessonId: string;
  exampleId?: string;
  debugId?: string;
  /** What the user types, taken from the example's own problem text */
  stdin?: string;
}

export const TRACE_SAMPLES: TraceSample[] = [
  { id: 'var-we-1', lessonId: 'prog-py-variables', exampleId: 'we-1' },
  { id: 'var-we-2', lessonId: 'prog-py-variables', exampleId: 'we-2' },
  { id: 'var-d-1', lessonId: 'prog-py-variables', debugId: 'd-1' },
  { id: 'io-we-1', lessonId: 'prog-py-io', exampleId: 'we-1', stdin: 'Mali\n' },
  { id: 'io-we-2', lessonId: 'prog-py-io', exampleId: 'we-2' },
  { id: 'loop-we-1', lessonId: 'prog-ctrl-loops', exampleId: 'we-1' },
  { id: 'loop-we-2', lessonId: 'prog-ctrl-loops', exampleId: 'we-2' },
  { id: 'loop-d-1', lessonId: 'prog-ctrl-loops', debugId: 'd-1' },
  { id: 'fn-we-1', lessonId: 'prog-fn-functions', exampleId: 'we-1' },
  { id: 'fn-we-2', lessonId: 'prog-fn-functions', exampleId: 'we-2' },
];
