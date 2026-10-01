import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptsDir = __dirname;

const files = fs.readdirSync(scriptsDir)
  .filter(f => f.startsWith('test-phase-') && f.endsWith('.js'))
  .sort();

console.log(`Found ${files.length} Phase test files. Executing in sequence...\n`);

let passed = 0;
let failed = 0;

for (const file of files) {
  const fullPath = path.join(scriptsDir, file);
  process.stdout.write(`► [${file}] `);
  try {
    const out = execSync(`node "${fullPath}"`, { encoding: 'utf-8' });
    console.log('PASSED');
    passed++;
  } catch (err) {
    console.log('FAILED');
    console.error(err.stdout || err.message);
    failed++;
  }
}

console.log(`\n========================================`);
console.log(`Total: ${files.length} | Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
