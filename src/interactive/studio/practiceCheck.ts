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

const SUPERSCRIPT: Record<string, string> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };

/** Parse "12", "-3.5", "−3", "1/2", "2.5e3" and scientific notation written the way people write it:
 *  "3 × 10⁻⁶", "3×10^-6", "3 x 10^-6", "3*10**-6", "10⁻⁶". The power of ten must be explicit
 *  (superscript, ^ or **) — "3 × 10-6" is ambiguous and rejected. Nothing else (no expressions). */
export function parseNumber(raw: string): number | undefined {
  const s = raw.trim().replace(/−/g, '-').replace(/,/g, '').replace(/\s+/g, '')
    .replace(/[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => `^${[...m].map((c) => SUPERSCRIPT[c]).join('')}`);
  if (/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(s)) return Number(s);
  const f = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (f && Number(f[2]) !== 0) return Number(f[1]) / Number(f[2]);
  // a × 10^n — built as "aen" so the value is exactly what was written
  const sci = s.match(/^(?:(-?\d+(?:\.\d+)?)[×xX*·])?10(?:\^|\*\*)\(?([+-]?\d+)\)?$/);
  if (sci) return Number(`${sci[1] ?? '1'}e${sci[2]}`);
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
/** Rounded answers are fine: a learner who writes 0.64 for 0.6428 is right. Very small answers
 *  (e.g. 3 × 10⁻⁶) get only the relative 1% — an absolute 0.005 would accept 0 or 3 × 10⁻⁵. */
export const valueTolerance = (expected: number, tol?: number) =>
  Number.isInteger(expected) ? Math.max(tol ?? 0, 1e-9) : Math.max(tol ?? 0, Math.abs(expected) * 0.01, Math.abs(expected) >= 0.01 ? 0.005 : 0);
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
