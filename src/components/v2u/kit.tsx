/* =========================================================================
   V2U design kit (ported from the design reference v2u-kit.js) — VISUALS ONLY.
   Icon paths, logo mark, status + subject identity. No sample data is used:
   every value shown in the app comes from the real engines.
   ========================================================================= */
import { useId, createElement } from 'react';
import type { CSSProperties, ReactNode } from 'react';

type Part = string | [string, Record<string, unknown>];
const P: Record<string, Part[]> = {
    home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
    book: ['M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z', 'M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z'],
    refresh: ['M3 12a9 9 0 1 0 2.6-6.4L3 8', 'M3 3v5h5'],
    map: ['M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z', 'M9 4v14', 'M15 6v14'],
    user: [['circle', { cx: 12, cy: 8, r: 4 }], 'M4 21a8 8 0 0 1 16 0'],
    chevR: ['m9 6 6 6-6 6'], chevL: ['m15 6-6 6 6 6'], chevD: ['m6 9 6 6 6-6'], chevU: ['m6 15 6-6 6 6'],
    arrowR: ['M5 12h14', 'm13 6 6 6-6 6'], arrowD: ['M12 5v14', 'm6 13 6 6 6-6'],
    check: ['m5 12.5 4.5 4.5L19 7'], x: ['M6 6l12 12', 'M18 6 6 18'], plus: ['M12 5v14', 'M5 12h14'],
    play: [['path', { d: 'M8 5.5v13l10.5-6.5z', fill: 'currentColor' }]],
    pause: [['rect', { x: 6, y: 5, width: 4, height: 14, rx: 1, fill: 'currentColor', stroke: 'none' }], ['rect', { x: 14, y: 5, width: 4, height: 14, rx: 1, fill: 'currentColor', stroke: 'none' }]],
    sigma: ['M18 4H6l6 8-6 8h12'],
    atom: [['circle', { cx: 12, cy: 12, r: 1.4 }], ['ellipse', { cx: 12, cy: 12, rx: 10, ry: 4 }], ['ellipse', { cx: 12, cy: 12, rx: 10, ry: 4, transform: 'rotate(60 12 12)' }], ['ellipse', { cx: 12, cy: 12, rx: 10, ry: 4, transform: 'rotate(120 12 12)' }]],
    code: ['m8 7-5 5 5 5', 'm16 7 5 5-5 5', 'm14 4-4 16'],
    cap: ['M2 9.5 12 5l10 4.5L12 14z', 'M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5', 'M22 9.5V15'],
    flag: ['M5 21V4', 'M5 4h11l-2 4 2 4H5'],
    sun: [['circle', { cx: 12, cy: 12, r: 4 }], 'M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
    moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
    clock: [['circle', { cx: 12, cy: 12, r: 9 }], 'M12 7v5l3 2'],
    calendar: [['rect', { x: 3, y: 5, width: 18, height: 16, rx: 3 }], 'M3 10h18', 'M8 3v4', 'M16 3v4'],
    gauge: ['M12 14l4-4', 'M3.3 19a10 10 0 1 1 17.4 0'],
    nav: ['M3 11l18-8-8 18-2-8z'],
    pen: ['M4 20h4L19 9l-4-4L4 16z'],
    download: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'],
    practice: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
    quiz: [['rect', { x: 4, y: 3, width: 16, height: 18, rx: 3 }], 'm8 12 2.5 2.5L16 9'],
    sparkle: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', 'M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z'],
    target: [['circle', { cx: 12, cy: 12, r: 9 }], ['circle', { cx: 12, cy: 12, r: 5 }], ['circle', { cx: 12, cy: 12, r: 1, fill: 'currentColor' }]],
    lock: [['rect', { x: 5, y: 11, width: 14, height: 10, rx: 2.5 }], 'M8 11V8a4 4 0 0 1 8 0v3'],
    alert: ['M12 3 2 20h20z', 'M12 10v4', 'M12 17h.01'],
    info: [['circle', { cx: 12, cy: 12, r: 9 }], 'M12 11v6', 'M12 7.5h.01'],
    help: [['circle', { cx: 12, cy: 12, r: 9 }], 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4', 'M12 17h.01'],
    mic: [['rect', { x: 9, y: 3, width: 6, height: 11, rx: 3 }], 'M5 11a7 7 0 0 0 14 0', 'M12 18v3'],
    note: ['M5 3h10l4 4v14H5z', 'M15 3v4h4', 'M9 12h6', 'M9 16h4'],
    bulb: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z'],
    star: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z'],
    wifi: ['M2 8.5a15 15 0 0 1 20 0', 'M5 12a10 10 0 0 1 14 0', 'M8.5 15.5a5 5 0 0 1 7 0', 'M12 19h.01'],
    external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'],
    wifiOff: ['M2 8.5a15 15 0 0 1 4.5-2.8', 'M10 5.1A15 15 0 0 1 22 8.5', 'M5 12a10 10 0 0 1 3.5-2', 'M15 10.5a10 10 0 0 1 4 1.5', 'M8.5 15.5a5 5 0 0 1 7 0', 'M12 19h.01', 'M3 3l18 18'],
    video: [['rect', { x: 2, y: 5, width: 14, height: 14, rx: 3 }], 'm16 10 6-3.5v11L16 14'],
    videoOff: ['M16 16v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1', 'M10 5h4a2 2 0 0 1 2 2v3l6-3.5v11', 'M3 3l18 18'],
    search: [['circle', { cx: 11, cy: 11, r: 7 }], 'm20 20-4-4'],
    settings: [['circle', { cx: 12, cy: 12, r: 3 }], 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
    skip: ['m5 5 9 7-9 7z', 'M19 5v14'],
    send: ['M4 12 20 4l-6 16-3-7z'],
    trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
    cloudOff: ['M3 3l18 18', 'M7 18H6a4 4 0 0 1-.5-8', 'M10.5 6.5A6 6 0 0 1 18 10a3.5 3.5 0 0 1 3 5', 'M17 18H11'],
    file: ['M6 3h8l5 5v13H6z', 'M14 3v5h5'],
    sOk: [['circle', { cx: 12, cy: 12, r: 9, fill: 'currentColor', stroke: 'none' }], ['path', { d: 'm8 12.3 2.7 2.7L16 9.5', stroke: '#fff', strokeWidth: 2.4 }]],
    sDev: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 3.5a8.5 8.5 0 0 1 0 17z', fill: 'currentColor', stroke: 'none' }]],
    sRev: ['M4 12a8 8 0 1 0 2.4-5.7L4 8.6', 'M4 4v4.6h4.6'],
    sNone: [['circle', { cx: 12, cy: 12, r: 8.5, strokeDasharray: '3 3.2' }]],
  };

export type IconName = keyof typeof P;

/** Icon from the design kit (stroke icons, 24 grid). */
export function KIcon({ name, size = 20, w = 2, className, style }: { name: IconName; size?: number; w?: number; className?: string; style?: CSSProperties }) {
  const parts = P[name] ?? [];
  return createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className, style: { display: 'block', flexShrink: 0, ...style } },
    parts.map((e, i) => (typeof e === 'string' ? createElement('path', { key: i, d: e }) : createElement(e[0], { key: i, ...e[1] })))
  );
}

/** Logo symbol: a route that starts low-left, dips, then climbs to a gold destination. */
export function Mark({ size = 40, variant = 'tile' }: { size?: number; variant?: 'tile' | 'mono' | 'light' | 'dark' }) {
  const tile = variant === 'tile';
  const stroke = tile ? '#fff' : variant === 'dark' ? '#eef1ff' : variant === 'light' ? '#16207a' : 'currentColor';
  const id = `v2u-mark-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      {tile && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3247e6" />
              <stop offset="1" stopColor="#0b1135" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="14" fill={`url(#${id})`} />
        </>
      )}
      <path d="M11 15.5 21.5 34 36.5 12.5" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="15.5" r="4.4" fill={tile ? '#0b1135' : variant === 'dark' ? '#090c1c' : variant === 'light' ? '#fff' : 'var(--bg)'} stroke={stroke} strokeWidth="3" />
      <circle cx="37.2" cy="11.4" r="5.2" fill="#f5c04d" />
    </svg>
  );
}

/** Pill with status icon + label (design: height 26, radius 99, soft bg). */

export function Pill({ c, soft, icon, children, bd, size = 'md' }: { c: string; soft: string; icon?: IconName; children: ReactNode; bd?: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap"
      style={{ height: size === 'sm' ? 24 : 26, padding: '0 10px 0 7px', background: soft, color: c, border: bd ?? 'none', fontSize: 12 }}
    >
      {icon && <KIcon name={icon} size={14} />}
      {children}
    </span>
  );
}
