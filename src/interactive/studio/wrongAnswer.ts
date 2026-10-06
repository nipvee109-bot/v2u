/* Targeted feedback for a wrong practice answer (Phase 68).
   Recognises common error PATTERNS by comparing the learner's input with the item's
   verified answer — it never invents lesson content. Returns undefined when the
   wrong answer matches no known pattern (the item's own hint is shown instead). */

import type { KnowledgePractice } from '../../content/knowledge';
import { parseNumber, valueTolerance } from './practiceCheck';
import { checkHtml } from '../../web/html';

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const FLIP: Record<string, string> = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };
const normLines = (s: string) => s.replace(/\r/g, '').trim().split('\n').map((l) => l.trim());

export function diagnoseWrong(p: KnowledgePractice, input: Record<string, string>): string | undefined {
  const v = p.verify;
  if (!v) return undefined;
  switch (v.kind) {
    case 'value': {
      const got = parseNumber(input.v ?? '');
      if (got === undefined) return 'ตอบเป็นตัวเลข เช่น 12, −3.5 หรือ 1/4 (ไม่ต้องใส่หน่วย)';
      const e = v.expected;
      const tol = valueTolerance(e, v.tol);
      if (e !== 0 && near(got, -e, tol)) return 'ตัวเลขถูก แต่เครื่องหมายกลับ — ตรวจทิศ/เครื่องหมายลบอีกครั้ง';
      for (const k of [10, 100, 1000, 3.6, 60, 3600])
        if (e !== 0 && (near(got, e * k, tol * k) || near(got, e / k, tol / k))) return 'ขนาดผิดไปเป็นทวีคูณ — มักเกิดจากการแปลงหน่วยหรือคูณ/หารกลับด้าน ลองดูหน่วยของแต่ละค่าอีกครั้ง';
      return undefined;
    }
    case 'holds': {
      const keys = Object.keys(v.vars);
      const got = keys.map((k) => parseNumber(input[k] ?? ''));
      if (got.some((x) => x === undefined)) return 'ใส่ค่าให้ครบทุกช่อง เป็นตัวเลข';
      const want = keys.map((k) => v.vars[k]);
      if (keys.length === 2 && near(got[0]!, want[1], 1e-6) && near(got[1]!, want[0], 1e-6) && want[0] !== want[1]) return 'ได้ค่าถูกทั้งคู่ แต่สลับกัน — ดูว่าค่าไหนเป็นของตัวแปรใด';
      const right = keys.filter((_, i) => near(got[i]!, want[i], 1e-6));
      if (keys.length > 1 && right.length > 0) return `ค่า ${right.join(', ')} ถูกแล้ว — แทนค่านี้กลับเพื่อหาตัวที่เหลือ แล้วตรวจกับทุกสมการ`;
      if (keys.length === 1 && near(got[0]!, -want[0], 1e-6) && want[0] !== 0) return 'ตัวเลขถูก แต่เครื่องหมายกลับ — ตอนย้ายข้าง พจน์ต้องเปลี่ยนเครื่องหมาย';
      return undefined;
    }
    case 'inequality': {
      const b = parseNumber(input.bound ?? '');
      if (b === undefined) return 'ใส่ค่าขอบเขตเป็นตัวเลข';
      if (near(b, v.bound, 1e-6) && input.op === FLIP[v.op]) return 'ค่าขอบเขตถูก แต่ทิศกลับ — ถ้าคูณหรือหารด้วยจำนวนลบ ต้องกลับทิศเครื่องหมายด้วย';
      if (near(b, v.bound, 1e-6)) return 'ค่าขอบเขตถูก ตรวจอีกทีว่ารวมจุดปลายหรือไม่ (< กับ ≤)';
      if (near(b, -v.bound, 1e-6) && v.bound !== 0) return 'ขนาดถูกแต่เครื่องหมายกลับ — ตรวจตอนย้ายข้าง';
      return undefined;
    }
    case 'python': {
      if (!v.output) return undefined;
      const got = normLines(input.out ?? '');
      const want = normLines(v.output);
      if (got.join('') === want.join('') && got.length !== want.length) return 'ข้อความถูก แต่การขึ้นบรรทัดไม่ตรง — print() แต่ละครั้งขึ้นบรรทัดใหม่ (เว้นแต่กำหนด end)';
      if (got.join('\n').replace(/["']/g, '') === want.join('\n') && /["']/.test(got.join(''))) return 'print() ไม่แสดงเครื่องหมายคำพูด — แสดงเฉพาะข้อความข้างใน';
      if (got.length === want.length && got.every((l, i) => l.replace(/\.0$/, '') === want[i].replace(/\.0$/, ''))) return 'เกือบถูก — สังเกตชนิดข้อมูล: / ให้ผลเป็นทศนิยม (float) เช่น 4.0 ส่วน // ให้จำนวนเต็ม';
      if (got.length < want.length) return `โปรแกรมพิมพ์ ${want.length} บรรทัด — ไล่ทุกคำสั่ง print ให้ครบ`;
      return undefined;
    }
    case 'html':
      // The first requirement the learner's own HTML misses, explained in terms of structure
      return checkHtml(input.html ?? '', v.require).results.find((r) => !r.ok)?.message;
  }
}
