/* Subject identity data (V2U design reference): one colour + one icon per subject. */
import { Sigma, Atom, Code2, Brain, Cpu, Globe } from 'lucide-react';
import type { ComponentType } from 'react';
import type { SubjectId } from '../../types';

type Icon = ComponentType<{ className?: string }>;

export interface SubjectStyle {
  icon: Icon;
  /** text colour */
  text: string;
  /** soft tile background */
  soft: string;
  /** solid fill (bars, dots) */
  fill: string;
  /** ring/border accent */
  ring: string;
}

export const SUBJECT_STYLE: Record<SubjectId, SubjectStyle> = {
  math: { icon: Sigma, text: 'text-math', soft: 'bg-math-soft', fill: 'bg-math', ring: 'border-math/30' },
  physics: { icon: Atom, text: 'text-phy', soft: 'bg-phy-soft', fill: 'bg-phy', ring: 'border-phy/30' },
  programming: { icon: Code2, text: 'text-prog', soft: 'bg-prog-soft', fill: 'bg-prog', ring: 'border-prog/30' },
  tgat3: { icon: Brain, text: 'text-brand-700', soft: 'bg-brand-50', fill: 'bg-brand-600', ring: 'border-brand-200' },
  web: { icon: Globe, text: 'text-web', soft: 'bg-web-soft', fill: 'bg-web', ring: 'border-web/30' },
  ai: { icon: Cpu, text: 'text-brand-700', soft: 'bg-brand-50', fill: 'bg-brand-600', ring: 'border-brand-200' },
};

export const subjectStyle = (id: string): SubjectStyle => SUBJECT_STYLE[id as SubjectId] ?? SUBJECT_STYLE.tgat3;

