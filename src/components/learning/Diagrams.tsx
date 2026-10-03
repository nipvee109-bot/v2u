/* Diagrams drawn from lesson data (Phase 63): graphs, right triangles, vectors, force diagrams.
   Pure SVG, scales to the container, colours from the V2U tokens, readable by screen readers. */
import { useId } from 'react';
import type { Diagram } from '../../content/knowledge';

const W = 340;
const H = 240;
const PAD = 36;
const INK3 = 'var(--ink-3)';
const LINE_COLORS = ['var(--brand)', 'var(--dest)', 'var(--ok)'];
const fmt = (n: number) => String(Math.round(n * 100) / 100);

function Frame({ d, children }: { d: Diagram; children: React.ReactNode }) {
  const id = useId().replace(/:/g, '');
  return (
    <figure className="rounded-2xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }} data-testid="diagram" data-kind={d.kind} data-diagram={d.id}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t ${id}-d`} className="block h-auto w-full" style={{ maxHeight: 320, fontFamily: 'inherit' }}>
        <title id={`${id}-t`}>{d.title}</title>
        <desc id={`${id}-d`}>{d.caption}</desc>
        {children}
      </svg>
      <figcaption className="mt-2 text-xs text-[var(--ink-2)] break-words">
        <b className="font-semibold text-[var(--ink)]">{d.title}</b> — {d.caption}
      </figcaption>
    </figure>
  );
}

function Arrow({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill={color} />
    </marker>
  );
}

function GraphView({ d }: { d: Extract<Diagram, { kind: 'graph' }> }) {
  const clip = useId().replace(/:/g, '');
  const [x0, x1] = d.xRange;
  const [y0, y1] = d.yRange;
  const px = (x: number) => PAD + ((x - x0) / (x1 - x0)) * (W - 2 * PAD);
  const py = (y: number) => H - PAD - ((y - y0) / (y1 - y0)) * (H - 2 * PAD);
  const ax = Math.min(Math.max(0, x0), x1);
  const ay = Math.min(Math.max(0, y0), y1);
  const first = d.lines[0];
  return (
    <Frame d={d}>
      <defs>
        <clipPath id={clip}><rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} /></clipPath>
      </defs>
      {/* grid */}
      {Array.from({ length: Math.floor(x1) - Math.ceil(x0) + 1 }, (_, i) => Math.ceil(x0) + i)
        .filter((x) => (x1 - x0) <= 12 || x % 5 === 0)
        .map((x) => <line key={`gx${x}`} x1={px(x)} x2={px(x)} y1={PAD} y2={H - PAD} stroke="var(--line)" strokeWidth={1} />)}
      {Array.from({ length: Math.floor(y1) - Math.ceil(y0) + 1 }, (_, i) => Math.ceil(y0) + i)
        .filter((y) => (y1 - y0) <= 14 || y % 5 === 0)
        .map((y) => <line key={`gy${y}`} y1={py(y)} y2={py(y)} x1={PAD} x2={W - PAD} stroke="var(--line)" strokeWidth={1} />)}
      {/* axes */}
      <line x1={PAD} x2={W - PAD} y1={py(ay)} y2={py(ay)} stroke={INK3} strokeWidth={1.5} />
      <line y1={PAD} y2={H - PAD} x1={px(ax)} x2={px(ax)} stroke={INK3} strokeWidth={1.5} />
      <text x={W / 2} y={H - PAD + 16} textAnchor="middle" fontSize={11} fill="var(--ink-2)">{d.xLabel}</text>
      <text x={px(ax) + 4} y={PAD - 8} fontSize={11} fill="var(--ink-2)">{d.yLabel}</text>
      <text x={px(x0)} y={H - PAD + 14} fontSize={10} fill={INK3} textAnchor="middle">{fmt(x0)}</text>
      <text x={px(x1)} y={H - PAD + 14} fontSize={10} fill={INK3} textAnchor="middle">{fmt(x1)}</text>
      <text x={PAD - 6} y={py(y1) + 4} fontSize={10} fill={INK3} textAnchor="end">{fmt(y1)}</text>
      <text x={PAD - 6} y={py(y0) + 4} fontSize={10} fill={INK3} textAnchor="end">{fmt(y0)}</text>
      {d.shadeUnder && first && (
        <polygon
          clipPath={`url(#${clip})`}
          points={[
            [d.shadeUnder.x0, 0],
            [d.shadeUnder.x0, first.m * d.shadeUnder.x0 + first.c],
            [d.shadeUnder.x1, first.m * d.shadeUnder.x1 + first.c],
            [d.shadeUnder.x1, 0],
          ].map(([x, y]) => `${px(x)},${py(y)}`).join(' ')}
          fill="var(--ok-soft)"
          stroke="none"
        />
      )}
      {d.shadeUnder && first && (
        <text x={px(d.shadeUnder.x0 + 0.62 * (d.shadeUnder.x1 - d.shadeUnder.x0))} y={py((first.m * (d.shadeUnder.x0 + 0.62 * (d.shadeUnder.x1 - d.shadeUnder.x0)) + first.c) / 4)} textAnchor="middle" fontSize={11} fill="var(--ok)" fontWeight={600}>{d.shadeUnder.label}</text>
      )}
      <g clipPath={`url(#${clip})`}>
        {d.lines.map((l, i) => {
          const a = l.x0 ?? x0;
          const b = l.x1 ?? x1;
          return <line key={l.label} x1={px(a)} y1={py(l.m * a + l.c)} x2={px(b)} y2={py(l.m * b + l.c)} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2.5} strokeLinecap="round" />;
        })}
      </g>
      {d.lines.map((l, i) => {
        const a = Math.max(l.x0 ?? x0, x0);
        const b = Math.min(l.x1 ?? x1, x1);
        const xa = l.labelAt ?? a + 0.62 * (b - a);
        const ya = Math.min(Math.max(l.m * xa + l.c, y0), y1);
        return <text key={`t${l.label}`} x={px(xa) + 8} y={py(ya) + (l.m > 0 ? 16 : -8)} textAnchor="start" fontSize={11} fontWeight={600} fill={LINE_COLORS[i % LINE_COLORS.length]}>{l.label}</text>;
      })}
      {d.points?.map((p) => (
        <g key={p.label}>
          <circle cx={px(p.x)} cy={py(p.y)} r={4.5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
          <text x={px(p.x) + (px(p.x) > W - 110 ? -8 : 8)} y={py(p.y) + (p.y > (y0 + y1) / 2 ? 14 : -8)} textAnchor={px(p.x) > W - 110 ? 'end' : 'start'} fontSize={11} fill="var(--ink)">{p.label}</text>
        </g>
      ))}
    </Frame>
  );
}

function TriangleView({ d }: { d: Extract<Diagram, { kind: 'triangle' }> }) {
  const s = Math.min((W - 2 * PAD - 60) / d.adj, (H - 2 * PAD) / d.opp);
  const A = { x: PAD + 20, y: H - PAD }; // θ
  const B = { x: A.x + d.adj * s, y: A.y }; // right angle
  const C = { x: B.x, y: A.y - d.opp * s };
  const r = 26;
  const t = (d.angleDeg * Math.PI) / 180;
  return (
    <Frame d={d}>
      <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" />
      <path d={`M${B.x - 12} ${B.y} V${B.y - 12} H${B.x}`} fill="none" stroke="var(--ink-2)" strokeWidth={1.5} />
      <path d={`M${A.x + r} ${A.y} A${r} ${r} 0 0 0 ${A.x + r * Math.cos(t)} ${A.y - r * Math.sin(t)}`} fill="none" stroke="var(--dest)" strokeWidth={2} />
      <text x={A.x + r + 6} y={A.y - 6} fontSize={12} fontWeight={700} fill="var(--dest-ink)">θ = {fmt(d.angleDeg)}°</text>
      <text x={(A.x + B.x) / 2} y={A.y + 18} textAnchor="middle" fontSize={12} fill="var(--ink)">{d.labels.adj}</text>
      <text x={B.x + 8} y={(B.y + C.y) / 2} fontSize={12} fill="var(--ink)">{d.labels.opp}</text>
      <text x={(A.x + C.x) / 2 - 8} y={(A.y + C.y) / 2 - 8} textAnchor="end" fontSize={12} fontWeight={600} fill="var(--brand-ink)">{d.labels.hyp}</text>
    </Frame>
  );
}

function VectorsView({ d }: { d: Extract<Diagram, { kind: 'vectors' }> }) {
  const mid = useId().replace(/:/g, '');
  // Tip-to-tail positions (or all from the origin when drawing components)
  const tails: { x: number; y: number }[] = [];
  let cx = 0;
  let cy = 0;
  for (const v of d.vectors) {
    tails.push({ x: d.components ? 0 : cx, y: d.components ? 0 : cy });
    if (!d.components) {
      cx += v.x;
      cy += v.y;
    }
  }
  const tips = d.vectors.map((v, i) => ({ x: tails[i].x + v.x, y: tails[i].y + v.y }));
  const xs = [0, ...tips.map((p) => p.x)];
  const ys = [0, ...tips.map((p) => p.y)];
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.min((W - 2 * PAD - 40) / Math.max(maxX - minX, 1), (H - 2 * PAD) / Math.max(maxY - minY, 1));
  const ox = PAD + 20 - minX * s;
  const oy = H - PAD + minY * s;
  const P = (p: { x: number; y: number }) => ({ X: ox + p.x * s, Y: oy - p.y * s });
  const end = { x: cx, y: cy };
  return (
    <Frame d={d}>
      <defs>
        <Arrow id={`${mid}-a`} color="var(--brand)" />
        <Arrow id={`${mid}-r`} color="var(--dest)" />
        <Arrow id={`${mid}-c`} color="var(--ink-3)" />
      </defs>
      <line x1={PAD} x2={W - PAD} y1={oy} y2={oy} stroke="var(--line-2)" strokeWidth={1} />
      <line y1={PAD} y2={H - PAD} x1={ox} x2={ox} stroke="var(--line-2)" strokeWidth={1} />
      {d.components && (() => {
        const v = d.vectors[0];
        const O = P({ x: 0, y: 0 }), X = P({ x: v.x, y: 0 }), T = P(v);
        return (
          <g>
            <line x1={O.X} y1={O.Y} x2={X.X} y2={X.Y} stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="6 4" markerEnd={`url(#${mid}-c)`} />
            <line x1={X.X} y1={X.Y} x2={T.X} y2={T.Y} stroke="var(--ink-3)" strokeWidth={2} strokeDasharray="6 4" markerEnd={`url(#${mid}-c)`} />
            <text x={(O.X + X.X) / 2} y={O.Y + 16} textAnchor="middle" fontSize={11} fill="var(--ink-2)">แนวราบ {fmt(v.x)} {d.unit}</text>
            <text x={X.X + 6} y={(X.Y + T.Y) / 2} fontSize={11} fill="var(--ink-2)">แนวดิ่ง {fmt(v.y)} {d.unit}</text>
          </g>
        );
      })()}
      {d.vectors.map((v, i) => {
        const a = P(tails[i]), b = P(tips[i]);
        return (
          <g key={v.label}>
            <line x1={a.X} y1={a.Y} x2={b.X} y2={b.Y} stroke="var(--brand)" strokeWidth={3} markerEnd={`url(#${mid}-a)`} />
            <text x={(a.X + b.X) / 2 + (v.y === 0 ? 0 : 8)} y={(a.Y + b.Y) / 2 + (v.y === 0 ? 16 : 0)} textAnchor={v.y === 0 ? 'middle' : 'start'} fontSize={12} fontWeight={600} fill="var(--brand-ink)">{v.label}</text>
          </g>
        );
      })}
      {d.resultant && (() => {
        const a = P({ x: 0, y: 0 }), b = P(end);
        return (
          <g>
            <line x1={a.X} y1={a.Y} x2={b.X} y2={b.Y} stroke="var(--dest)" strokeWidth={3} markerEnd={`url(#${mid}-r)`} />
            <text x={(a.X + b.X) / 2 - 8} y={(a.Y + b.Y) / 2 - 6} textAnchor="end" fontSize={12} fontWeight={700} fill="var(--dest-ink)">{d.resultant}</text>
          </g>
        );
      })()}
    </Frame>
  );
}

function ForcesView({ d }: { d: Extract<Diagram, { kind: 'forces' }> }) {
  const mid = useId().replace(/:/g, '');
  const cx = W / 2, cy = H / 2, bw = 64, bh = 44;
  const max = Math.max(...d.forces.map((f) => f.newtons));
  const len = (n: number) => 28 + (n / max) * 48;
  const V = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;
  return (
    <Frame d={d}>
      <defs><Arrow id={`${mid}-f`} color="var(--brand)" /></defs>
      <rect x={cx - bw / 2} y={cy - bh / 2} width={bw} height={bh} rx={8} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink)">{d.body}</text>
      {d.forces.map((f) => {
        const [ux, uy] = V[f.dir];
        const sx = cx + ux * (bw / 2), sy = cy + uy * (bh / 2);
        const L = uy === 0 ? 22 + (f.newtons / max) * 34 : len(f.newtons);
        const ex = sx + ux * L, ey = sy + uy * L;
        // horizontal arrows: label just beyond the tip; vertical arrows: label beside the tip
        const lx = uy === 0 ? ex + ux * 8 : ex + 8;
        const ly = uy === 0 ? cy + 4 : ey + (uy > 0 ? 4 : 8);
        return (
          <g key={f.label}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="var(--brand)" strokeWidth={3} markerEnd={`url(#${mid}-f)`} />
            <text x={lx} y={ly} textAnchor={ux > 0 ? 'start' : ux < 0 ? 'end' : 'start'} fontSize={11} fontWeight={600} fill="var(--brand-ink)">{f.label}</text>
          </g>
        );
      })}
    </Frame>
  );
}

export function DiagramView({ d }: { d: Diagram }) {
  if (d.kind === 'graph') return <GraphView d={d} />;
  if (d.kind === 'triangle') return <TriangleView d={d} />;
  if (d.kind === 'vectors') return <VectorsView d={d} />;
  return <ForcesView d={d} />;
}
