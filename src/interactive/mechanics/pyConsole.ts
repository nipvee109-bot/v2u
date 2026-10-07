/* Be-the-User console (prog-py-io).
   A tiny interpreter for the lesson's FIXED programs only — the learner supplies the input, never code.
   Supported (what the lesson's programs use):
     NAME = input("prompt") | int(input("prompt")) | int(NAME) | str(NAME) | expr
     print(expr, expr, ...)
     expr: "text" | f"text {NAME} {NAME + 1}" | NAME | INT | expr + expr | input("…")
   Output and errors are cross-checked against real python3 in scripts/test-phase-77.js. No eval. */

export type PyValue = { t: 'str'; v: string } | { t: 'int'; v: bigint };

export type ConsoleEvent =
  | { kind: 'input'; line: number; prompt: string; raw: string }
  | { kind: 'convert'; line: number; from: PyValue; to: PyValue; fn: 'int' | 'str' }
  | { kind: 'assign'; line: number; name: string; value: PyValue }
  | { kind: 'print'; line: number; text: string }
  | { kind: 'error'; line: number; error: string };

export interface ConsoleRun {
  /** stdout exactly as python3 would write it (prompts included, typed input NOT echoed) */
  stdout: string;
  events: ConsoleEvent[];
  vars: Record<string, PyValue>;
  /** the program is waiting at input(): this prompt is on screen */
  waitingFor?: { line: number; prompt: string };
  /** last line of the traceback, e.g. 'TypeError: can only concatenate str (not "int") to str' */
  error?: string;
  errorLine?: number;
  done: boolean;
}

class NeedInput { prompt: string; constructor(prompt: string) { this.prompt = prompt; } }
class PyError { message: string; constructor(message: string) { this.message = message; } }

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

/** Python's repr() of a str (quote choice as CPython). */
export function pyRepr(s: string): string {
  const q = s.includes("'") && !s.includes('"') ? '"' : "'";
  const body = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(new RegExp(q, 'g'), `\\${q}`);
  return `${q}${body}${q}`;
}

/** int(str) as CPython: surrounding whitespace, sign, underscores between digits; ASCII and Thai digits. */
export function pyInt(s: string): bigint {
  const t = s.trim();
  if (!/^[+-]?[0-9๐-๙](_?[0-9๐-๙])*$/.test(t)) throw new PyError(`ValueError: invalid literal for int() with base 10: ${pyRepr(s)}`);
  const ascii = t.replace(/_/g, '').replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));
  return BigInt(ascii);
}

export const showValue = (v: PyValue) => (v.t === 'str' ? pyRepr(v.v) : v.v.toString());
const asText = (v: PyValue) => (v.t === 'str' ? v.v : v.v.toString());

/* ── tokenizer / parser for one expression ── */
type Tok = { k: 'str' | 'fstr' | 'name' | 'int' | 'op'; v: string };
function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"' || ((ch === 'f' || ch === 'F') && src[i + 1] === '"')) {
      const f = ch !== '"';
      const start = f ? i + 2 : i + 1;
      const end = src.indexOf('"', start);
      if (end < 0) throw new Error('unterminated string');
      out.push({ k: f ? 'fstr' : 'str', v: src.slice(start, end) });
      i = end + 1;
      continue;
    }
    const num = src.slice(i).match(/^\d+/);
    if (num) { out.push({ k: 'int', v: num[0] }); i += num[0].length; continue; }
    const name = src.slice(i).match(/^[A-Za-z_]\w*/);
    if (name) { out.push({ k: 'name', v: name[0] }); i += name[0].length; continue; }
    if ('+(),'.includes(ch)) { out.push({ k: 'op', v: ch }); i++; continue; }
    throw new Error(`unsupported character ${ch}`);
  }
  return out;
}

interface Ctx { vars: Record<string, PyValue>; inputs: string[]; used: number; line: number; events: ConsoleEvent[]; out: string[] }

function add(a: PyValue, b: PyValue): PyValue {
  if (a.t === 'str' && b.t === 'str') return { t: 'str', v: a.v + b.v };
  if (a.t === 'int' && b.t === 'int') return { t: 'int', v: a.v + b.v };
  if (a.t === 'str') throw new PyError(`TypeError: can only concatenate str (not "int") to str`);
  throw new PyError(`TypeError: unsupported operand type(s) for +: 'int' and 'str'`);
}

function evalTokens(toks: Tok[], ctx: Ctx): PyValue {
  let p = 0;
  const peek = () => toks[p];
  const expect = (v: string) => { if (toks[p]?.v !== v) throw new Error(`expected ${v}`); p++; };
  const primary = (): PyValue => {
    const t = toks[p++];
    if (!t) throw new Error('unexpected end');
    if (t.k === 'str') return { t: 'str', v: t.v };
    if (t.k === 'fstr') return { t: 'str', v: t.v.replace(/\{([^}]*)\}/g, (_, inner) => asText(evalTokens(tokenize(inner), ctx))) };
    if (t.k === 'int') return { t: 'int', v: BigInt(t.v) };
    if (t.k === 'name') {
      if (peek()?.v === '(') {
        p++;
        if (t.v === 'input') {
          const prompt = peek()?.k === 'str' ? toks[p++].v : '';
          expect(')');
          if (ctx.used >= ctx.inputs.length) throw new NeedInput(prompt);
          const raw = ctx.inputs[ctx.used++];
          ctx.out.push(prompt);
          ctx.events.push({ kind: 'input', line: ctx.line, prompt, raw });
          return { t: 'str', v: raw };
        }
        if (t.v === 'int' || t.v === 'str') {
          const arg = expr();
          expect(')');
          const to: PyValue = t.v === 'int' ? (arg.t === 'int' ? arg : { t: 'int', v: pyInt(arg.v) }) : { t: 'str', v: asText(arg) };
          ctx.events.push({ kind: 'convert', line: ctx.line, from: arg, to, fn: t.v });
          return to;
        }
        throw new Error(`unsupported call ${t.v}`);
      }
      const v = ctx.vars[t.v];
      if (!v) throw new PyError(`NameError: name '${t.v}' is not defined`);
      return v;
    }
    throw new Error(`unexpected ${t.v}`);
  };
  const expr = (): PyValue => {
    let v = primary();
    while (peek()?.v === '+') { p++; v = add(v, primary()); }
    return v;
  };
  const v = expr();
  if (p !== toks.length && toks[p].v !== ')' && toks[p].v !== ',') throw new Error('trailing tokens');
  return v;
}

/** Split top-level commas of print(...) arguments. */
function splitArgs(src: string): string[] {
  const parts: string[] = [];
  let depth = 0, inStr = false, cur = '';
  for (const ch of src) {
    if (ch === '"') inStr = !inStr;
    if (!inStr && ch === '(') depth++;
    if (!inStr && ch === ')') depth--;
    if (!inStr && depth === 0 && ch === ',') { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

/** Run the program with the inputs typed so far. Stops (waitingFor) at the first input() without a typed value. */
export function runConsole(program: string, inputs: string[]): ConsoleRun {
  const ctx: Ctx = { vars: {}, inputs, used: 0, line: 0, events: [], out: [] };
  const lines = program.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const src = lines[i].trim();
    if (!src) continue;
    ctx.line = i + 1;
    try {
      const pr = src.match(/^print\((.*)\)$/);
      if (pr) {
        const text = splitArgs(pr[1]).map((a) => asText(evalTokens(tokenize(a), ctx))).join(' ');
        ctx.out.push(text + '\n');
        ctx.events.push({ kind: 'print', line: ctx.line, text });
        continue;
      }
      const as = src.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
      if (!as) throw new Error(`unsupported line: ${src}`);
      const value = evalTokens(tokenize(as[2]), ctx);
      ctx.vars[as[1]] = value;
      ctx.events.push({ kind: 'assign', line: ctx.line, name: as[1], value });
    } catch (e) {
      if (e instanceof NeedInput) {
        ctx.out.push(e.prompt);
        return { stdout: ctx.out.join(''), events: ctx.events, vars: ctx.vars, waitingFor: { line: ctx.line, prompt: e.prompt }, done: false };
      }
      if (e instanceof PyError) {
        ctx.events.push({ kind: 'error', line: ctx.line, error: e.message });
        return { stdout: ctx.out.join(''), events: ctx.events, vars: ctx.vars, error: e.message, errorLine: ctx.line, done: true };
      }
      throw e;
    }
  }
  return { stdout: ctx.out.join(''), events: ctx.events, vars: ctx.vars, done: true };
}
