/**
 * Test harness helper (Phase 72B): finds a PostgreSQL server runtime for the throwaway RLS test
 * cluster and decides how it listens. Used only by scripts/test-supabase-rls.mjs, never by the app.
 * Platform, environment and filesystem are injectable so the Windows rules are unit-tested on any OS.
 *
 *   PG_BIN                  folder containing initdb, pg_ctl and postgres (initdb.exe ... on Windows)
 *   V2U_RLS_PG_TRANSPORT    socket | tcp   (default: tcp on Windows, socket elsewhere)
 *   V2U_RLS_PG_PORT         cluster port (default 54329; PostgREST uses +1, the proxy +2)
 *   V2U_RLS_PG_AUTODETECT   0 = only use PG_BIN (no search of install folders)
 *   V2U_RLS_REQUIRED        1 = a run without PostgreSQL is BLOCKED (exit 2), never a silent SKIPPED
 */
import fs from 'node:fs';
import path from 'node:path';

export const SERVER_TOOLS = ['initdb', 'pg_ctl', 'postgres'];
// Historical search order on Linux, kept first so existing machines pick the same server as before.
const LEGACY_LINUX_VERSIONS = ['16', '17', '15'];

const pathFor = (platform) => (platform === 'win32' ? path.win32 : path.posix);
const listDirSafe = (dir) => {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
};
const versionParts = (name) => (name.match(/\d+/g) ?? []).map(Number);
const byVersionDesc = (a, b) => {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? -1) !== (y[i] ?? -1)) return (y[i] ?? -1) - (x[i] ?? -1);
  }
  return 0;
};

/** initdb -> initdb.exe on Windows (unchanged elsewhere, and never doubled). */
export function exeName(name, platform = process.platform) {
  return platform === 'win32' && !/\.exe$/i.test(name) ? `${name}.exe` : name;
}

/** True when `dir` holds every server tool the harness runs. */
export function hasServerTools(dir, { platform = process.platform, exists = fs.existsSync } = {}) {
  if (!dir) return false;
  const p = pathFor(platform);
  return SERVER_TOOLS.every((tool) => exists(p.join(dir, exeName(tool, platform))));
}

/** Folders to try, in priority order: PG_BIN, then known install locations (newest version first). */
export function candidateBinDirs({ env = process.env, platform = process.platform, listDir = listDirSafe } = {}) {
  const p = pathFor(platform);
  const out = [];
  const add = (dir, source) => {
    if (dir && !out.some((c) => c.dir.toLowerCase() === dir.toLowerCase())) out.push({ dir, source });
  };
  if (env.PG_BIN) add(env.PG_BIN, 'PG_BIN');
  if (env.V2U_RLS_PG_AUTODETECT === '0') return out;
  const versions = (base) => listDir(base).filter((v) => /^\d/.test(v)).sort(byVersionDesc);
  if (platform === 'win32') {
    const roots = [env.ProgramW6432, env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA && p.join(env.LOCALAPPDATA, 'Programs')];
    for (const r of roots.filter(Boolean)) {
      const base = p.join(r, 'PostgreSQL');
      for (const v of versions(base)) add(p.join(base, v, 'bin'), 'auto');
    }
    if (env.USERPROFILE) add(p.join(env.USERPROFILE, 'scoop', 'apps', 'postgresql', 'current', 'bin'), 'auto');
    return out;
  }
  for (const v of LEGACY_LINUX_VERSIONS) add(`/usr/lib/postgresql/${v}/bin`, 'auto');
  for (const v of versions('/usr/lib/postgresql')) add(`/usr/lib/postgresql/${v}/bin`, 'auto');
  if (platform === 'darwin') {
    for (const base of ['/opt/homebrew/opt', '/usr/local/opt']) {
      for (const v of listDir(base).filter((n) => /^postgresql@\d/.test(n)).sort(byVersionDesc)) add(`${base}/${v}/bin`, 'auto');
    }
  }
  return out;
}

/** First folder that really contains the server tools; `tried` lists everything that was checked. */
export function findServerBin(opts = {}) {
  const tried = [];
  for (const c of candidateBinDirs(opts)) {
    tried.push(c.dir);
    if (hasServerTools(c.dir, opts)) return { dir: c.dir, source: c.source, tried };
  }
  return { dir: null, source: null, tried };
}

/** Message for a missing runtime; names the exact files that are needed on this platform. */
export function missingRuntimeMessage({ env = process.env, platform = process.platform } = {}) {
  const tools = SERVER_TOOLS.map((t) => exeName(t, platform)).join(', ');
  const pgBin = env.PG_BIN ? `PG_BIN=${env.PG_BIN} does not contain ${tools}; ` : '';
  return `PostgreSQL server binaries not found (${pgBin}set PG_BIN to the folder containing ${tools})`;
}

/**
 * How the throwaway cluster listens and how clients reach it.
 * socket: the historical Unix-socket setup (socket file inside the throwaway folder, no TCP).
 * tcp:    127.0.0.1 only - the default on Windows, which has no usable Unix-socket path here.
 */
export function connectionFor({ dir, port, env = process.env, platform = process.platform }) {
  const transport = (env.V2U_RLS_PG_TRANSPORT || (platform === 'win32' ? 'tcp' : 'socket')).toLowerCase();
  if (transport === 'tcp') {
    // Off Windows the server still needs a writable socket folder (the default one may not be).
    const socketDir = platform === 'win32' ? '' : ` -k ${dir}`;
    return {
      transport: 'tcp',
      serverOptions: `-p ${port} -c listen_addresses=localhost${socketDir}`,
      clientHost: '127.0.0.1',
      dbUri: (user) => `postgres://${user}@127.0.0.1:${port}/postgres`,
    };
  }
  return {
    transport: 'socket',
    serverOptions: `-p ${port} -k ${dir} -c listen_addresses=''`,
    clientHost: dir,
    dbUri: (user) => `postgres://${user}@/postgres?host=${dir}&port=${port}`,
  };
}

/** initdb flags: a UTF8 cluster on Windows needs the C locale (the system code page is not UTF8). */
export function initdbArgs(dataDir, platform = process.platform) {
  const args = ['-D', dataDir, '-U', 'postgres', '--auth=trust', '-E', 'UTF8'];
  return platform === 'win32' ? [...args, '--locale=C'] : args;
}

export function rlsRequired(env = process.env) {
  return /^(1|true|yes)$/i.test(env.V2U_RLS_REQUIRED ?? '');
}
