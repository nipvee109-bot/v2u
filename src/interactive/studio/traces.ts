/* Code traces produced by running the lessons' own code in real python3
   (scripts/research/gen-traces.mjs). The tests regenerate and compare them. */
import data from './traces.json';

export interface TraceStep {
  event: 'line' | 'call' | 'return' | 'input' | 'end';
  /** 1-based line (0 for the end state) */
  line: number;
  func: string;
  /** Variable values as Python repr() */
  vars: Record<string, string>;
  /** Everything printed so far */
  out: string;
  ret?: string;
  typed?: string;
  error?: string;
}
export interface CodeTraceData {
  code: string;
  stdin: string;
  output: string;
  error: string | null;
  steps: TraceStep[];
}

export const TRACE_PYTHON_VERSION: string = data.python;
export const getTrace = (id: string): CodeTraceData | undefined => (data.traces as Record<string, CodeTraceData>)[id];
