/* A tiny, visible tracer for the if / elif / else programs used in the
   programming lessons (Phase 64). It only understands what those programs use:
     name = <int>
     if / elif <name> <op> <int>:   (op: >= <= > < == !=)
     else:
         print("<text>")
   Its output is cross-checked against real python3 in scripts/test-phase-64.js. */

export interface BranchStep {
  /** 0-based line index in the source */
  line: number;
  kind: 'assign' | 'test' | 'enter' | 'skip' | 'print';
  /** e.g. "95 >= 80 → True" */
  note: string;
  value?: boolean;
}

export interface BranchRun {
  output: string;
  steps: BranchStep[];
  /** Index (0-based) of the branch that ran: 0 = if, 1 = first elif, …, or -1 when nothing ran */
  branch: number;
  /** Line of the condition that decided it (or the else line) */
  decidedAt: number;
}

const OPS: Record<string, (a: number, b: number) => boolean> = {
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
};

/** Replace the value of the first `name = <int>` line. */
export function withValue(code: string, value: number): string {
  return code.replace(/^(\s*\w+\s*=\s*)-?\d+/m, `$1${value}`);
}

/** Swap the conditions of the `if` line and the first `elif` line (debugging a wrong order). */
export function swapFirstTwoBranches(code: string): string {
  const lines = code.split('\n');
  const i = lines.findIndex((l) => /^if\s/.test(l));
  const j = lines.findIndex((l) => /^elif\s/.test(l));
  if (i < 0 || j < 0) return code;
  const cond = (l: string) => l.replace(/^(if|elif)\s+/, '').replace(/:\s*$/, '');
  const bodyI = lines[i + 1], bodyJ = lines[j + 1];
  const out = [...lines];
  out[i] = `if ${cond(lines[j])}:`;
  out[i + 1] = bodyJ;
  out[j] = `elif ${cond(lines[i])}:`;
  out[j + 1] = bodyI;
  return out.join('\n');
}

export function runBranches(code: string): BranchRun {
  const lines = code.split('\n');
  const vars: Record<string, number> = {};
  const steps: BranchStep[] = [];
  let output = '';
  let branch = -1;
  let decidedAt = -1;
  let taken = false;
  let blockIndex = -1;
  let inTaken = false;
  for (let n = 0; n < lines.length; n++) {
    const raw = lines[n];
    const line = raw.trim();
    if (!line) continue;
    const indented = /^\s+/.test(raw);
    if (indented) {
      if (!inTaken) continue;
      const m = line.match(/^print\("(.*)"\)$/);
      if (!m) throw new Error(`unsupported body: ${line}`);
      output += (output ? '\n' : '') + m[1];
      steps.push({ line: n, kind: 'print', note: `พิมพ์ "${m[1]}"` });
      continue;
    }
    inTaken = false;
    let m = line.match(/^(\w+)\s*=\s*(-?\d+)$/);
    if (m) {
      vars[m[1]] = Number(m[2]);
      steps.push({ line: n, kind: 'assign', note: `${m[1]} = ${m[2]}` });
      continue;
    }
    m = line.match(/^(if|elif)\s+(\w+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+):$/);
    if (m) {
      if (m[1] === 'if') { taken = false; blockIndex = 0; } else blockIndex++;
      if (taken) {
        steps.push({ line: n, kind: 'skip', note: 'ข้าม — มีเงื่อนไขก่อนหน้าที่จริงไปแล้ว' });
        continue;
      }
      const left = vars[m[2]];
      if (left === undefined) throw new Error(`unknown name ${m[2]}`);
      const ok = OPS[m[3]](left, Number(m[4]));
      steps.push({ line: n, kind: 'test', note: `${left} ${m[3]} ${m[4]} → ${ok ? 'True' : 'False'}`, value: ok });
      if (ok) { taken = true; inTaken = true; branch = blockIndex; decidedAt = n; }
      continue;
    }
    if (line === 'else:') {
      blockIndex++;
      if (taken) { steps.push({ line: n, kind: 'skip', note: 'ข้าม else — มีเงื่อนไขที่จริงไปแล้ว' }); continue; }
      steps.push({ line: n, kind: 'enter', note: 'ไม่มีเงื่อนไขไหนจริง → ทำ else' });
      taken = true; inTaken = true; branch = blockIndex; decidedAt = n;
      continue;
    }
    throw new Error(`unsupported line: ${line}`);
  }
  return { output, steps, branch, decidedAt };
}
