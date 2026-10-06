/* Checking knowledge practice in "เรียนกับ V2U" (no eval of learner input).
   The learner's answer is compared with the item's VERIFIED answer (`verify`),
   which the test suite already checks against the maths / real python3. */

import type { KnowledgePractice } from '../../content/knowledge';
import { checkHtml } from '../../web/html';
import type { DomParserLike } from '../../web/html';

export type PracticeField = { key: string; label: string; kind: 'number' | 'op' | 'text' };
export type PracticeVerdict = 'correct' | 'wrong' | 'unchecked';

const OPS = ['<', '>', '<=', '>='] as const;
export const INEQ_OPS = OPS;

/** Parse "12", "-3.5", "−3", "1/2", "2.5e3" — nothing else. */
export function parseNumber(raw: string): number | undefined {
  const s = raw.trim().replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '');
  if (/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(s)) return Number(s);
  const f = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (f && Number(f[2]) !== 0) return Number(f[1]) / Number(f[2]);
  return undefined;
}

export function practiceFields(p: KnowledgePractice): PracticeField[] {
  const v = p.verify;
  if (!v) return [];
  switch (v.kind) {
    case 'holds':
      return Object.keys(v.vars).map((k) => ({ key: k, label: `${k} =`, kind: 'number' }));
    case 'value':
      return [{ key: 'v', label: v.unit ? `คำตอบ (${v.unit})` : 'คำตอบ', kind: 'number' }];
    case 'inequality':
      return [{ key: 'op', label: 'x', kind: 'op' }, { key: 'bound', label: 'ค่า', kind: 'number' }];
    case 'python':
      return v.error ? [] : [{ key: 'out', label: 'ผลลัพธ์ที่แสดง', kind: 'text' }];
    case 'html':
      return [{ key: 'html', label: 'โค้ด HTML ของคุณ', kind: 'text' }];
  }
}

const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
/** Rounded answers are fine: a learner who writes 0.64 for 0.6428 is right. */
export const valueTolerance = (expected: number, tol?: number) =>
  Number.isInteger(expected) ? Math.max(tol ?? 0, 1e-9) : Math.max(tol ?? 0, Math.abs(expected) * 0.01, 0.005);
const normOut = (s: string) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').trim();

export function checkPractice(p: KnowledgePractice, input: Record<string, string>, parser?: DomParserLike): PracticeVerdict {
  const v = p.verify;
  if (!v || practiceFields(p).length === 0) return 'unchecked';
  switch (v.kind) {
    case 'holds':
      return Object.entries(v.vars).every(([k, want]) => {
        const got = parseNumber(input[k] ?? '');
        return got !== undefined && close(got, want, 1e-6 + Math.abs(want) * 1e-9);
      })
        ? 'correct'
        : 'wrong';
    case 'value': {
      const got = parseNumber(input.v ?? '');
      return got !== undefined && close(got, v.expected, valueTolerance(v.expected, v.tol)) ? 'correct' : 'wrong';
    }
    case 'inequality': {
      const got = parseNumber(input.bound ?? '');
      return input.op === v.op && got !== undefined && close(got, v.bound, 1e-6) ? 'correct' : 'wrong';
    }
    case 'python':
      return normOut(input.out ?? '') === normOut(v.output ?? '') ? 'correct' : 'wrong';
    case 'html':
      // Any HTML that meets the requirements is right — structure, not the exact text of the model answer
      return checkHtml(input.html ?? '', v.require, parser).passed ? 'correct' : 'wrong';
  }
}
