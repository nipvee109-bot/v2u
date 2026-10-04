/**
 * Test/tooling helper: lets the same test suite run on Windows, macOS and Linux. Never used by the app.
 *
 * - findPython / python(): a real Python 3 - `py -3` (the Windows launcher) first on Windows, then `python`,
 *   then `python3`. Every candidate is actually executed, so the Microsoft Store "python3" alias (which only
 *   prints an install hint and exits 9009) is never picked. V2U_PYTHON overrides the choice.
 * - readText(): file contents with LF line endings (Git for Windows checks files out with CRLF by default).
 * - relPosix(): repository-relative paths with "/" (path.relative() returns "\" on Windows).
 * - importFile(): dynamic import of an absolute path (a raw C:\... path is not a valid ESM specifier).
 * - execPython(): run Python with UTF-8 I/O (Windows defaults to cp1252, which cannot print Thai) and return
 *   stdout with LF line endings (Python on Windows writes CRLF). Errors carry normalized stdout/stderr too.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const readText = (file) => fs.readFileSync(file, 'utf-8').replace(/\r\n/g, '\n');

export const toPosix = (p) => p.replace(/\\/g, '/');

export const relPosix = (root, file) => toPosix(path.relative(root, file));

export const importFile = (file) => import(pathToFileURL(file).href);

/** Candidate commands, in order. `version` ('3.11') asks for that exact minor version. */
export function pythonCandidates({ version, platform = process.platform, env = process.env } = {}) {
  const out = [];
  if (env.V2U_PYTHON) out.push({ cmd: env.V2U_PYTHON, args: [] });
  if (platform === 'win32') {
    out.push({ cmd: 'py', args: [version ? `-${version}` : '-3'] }, { cmd: 'python', args: [] }, { cmd: 'python3', args: [] });
  } else {
    if (version) out.push({ cmd: `python${version}`, args: [] });
    out.push({ cmd: 'python3', args: [] }, { cmd: 'python', args: [] });
  }
  return out;
}

const VERSION_PROBE = 'import sys; print(sys.version.split()[0])';
const defaultRun = (cmd, args) => spawnSync(cmd, [...args, '-c', VERSION_PROBE], { encoding: 'utf-8', windowsHide: true });
const cache = new Map();

/** First candidate that really runs Python 3 (and the requested minor version, if any); null if none. */
export function findPython({ version, platform = process.platform, env = process.env, run = defaultRun } = {}) {
  const key = `${version ?? ''}|${platform}|${env.V2U_PYTHON ?? ''}`;
  if (run === defaultRun && cache.has(key)) return cache.get(key);
  const tried = [];
  let found = null;
  for (const c of pythonCandidates({ version, platform, env })) {
    const r = run(c.cmd, c.args);
    const v = r && r.status === 0 ? String(r.stdout ?? '').trim() : '';
    tried.push(`${[c.cmd, ...c.args].join(' ')} -> ${v || `unusable (exit ${r?.status ?? 'n/a'})`}`);
    if (/^3\.\d+/.test(v) && (!version || v === version || v.startsWith(`${version}.`))) {
      found = { ...c, version: v, tried };
      break;
    }
  }
  const result = found ?? { cmd: null, args: [], version: null, tried };
  if (run === defaultRun) cache.set(key, result);
  return result;
}

/** Like findPython but throws a message that says exactly what was tried. */
export function python(opts = {}) {
  const p = findPython(opts);
  if (!p.cmd) {
    const want = opts.version ? `Python ${opts.version}` : 'Python 3';
    throw new Error(`${want} not found (tried: ${p.tried.join('; ')}). Install it or set V2U_PYTHON to the interpreter path.`);
  }
  return p;
}

/** Parent environment plus UTF-8 for Python's stdin/stdout/stderr and file I/O. */
export const pythonEnv = (env = process.env) => ({ ...env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' });

/** CRLF and lone CR -> LF. Nothing else is touched (no trimming). */
export const normalizeNewlines = (s) => String(s ?? '').replace(/\r\n?/g, '\n');

/** execFileSync for Python: resolved interpreter, UTF-8, LF output. `py` defaults to python(). */
export function execPython(args, { py, env, ...opts } = {}) {
  const p = py ?? python();
  try {
    const out = execFileSync(p.cmd, [...p.args, ...args], { maxBuffer: 64 * 1024 * 1024, ...opts, encoding: 'utf-8', env: pythonEnv(env) });
    return normalizeNewlines(out);
  } catch (err) {
    if (err.stdout != null) err.stdout = normalizeNewlines(err.stdout);
    if (err.stderr != null) err.stderr = normalizeNewlines(err.stderr);
    throw err;
  }
}
