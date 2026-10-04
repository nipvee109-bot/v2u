/**
 * Export GameContent 1.1 payloads for registered games (Phase 71).
 *   node scripts/export-game-content.mjs [outDir]
 * Generated ONLY through the V2U adapter (src/learning/games/contentAdapter.ts) from
 * src/content/knowledge — never edit the JSON by hand. Output is deterministic:
 * same knowledge + same adapter ⇒ byte-identical files (no timestamps).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url);
const { buildGameContent } = await jiti.import(path.join(root, 'src/learning/games/contentAdapter.ts'));
const { validateGameContent } = await jiti.import(path.join(root, 'src/learning/games/contracts.ts'));
const { GAME_REGISTRY } = await jiti.import(path.join(root, 'src/learning/games/registry.ts'));

const outDir = path.resolve(process.argv[2] ?? path.join(root, 'integration/game-content'));
fs.mkdirSync(outDir, { recursive: true });

const files = [];
for (const game of GAME_REGISTRY) {
  for (const lessonId of game.lessonIds) {
    const { content, excluded } = buildGameContent(game.gameId, lessonId);
    const problems = validateGameContent(content);
    if (problems.length) throw new Error(`${game.gameId}/${lessonId}: ${problems.join('; ')}`);
    const name = `${lessonId}.gamecontent.json`;
    const text = `${JSON.stringify(content, null, 2)}\n`;
    fs.writeFileSync(path.join(outDir, name), text);
    files.push({
      path: `integration/game-content/${name}`,
      gameId: game.gameId,
      lessonId,
      contract: content.contract,
      version: content.version,
      registryStatus: game.status,
      learningEffectsActive: game.learningEffectsActive,
      sha256: crypto.createHash('sha256').update(text).digest('hex'),
      excludedPracticeItems: excluded,
    });
  }
}

const manifest = {
  generator: 'scripts/export-game-content.mjs',
  adapter: 'src/learning/games/contentAdapter.ts',
  source: 'src/content/knowledge (via the adapter only)',
  schemas: {
    gameContent: 'integration/contracts/gamecontent-1.1.schema.json',
    gameEvidence: 'integration/contracts/gameevidence-1.1.schema.json',
  },
  gameLab: {
    repository: 'v2u-game-lab',
    commit: '6ba7a91b6eb3f79311b02da118e423384f1e1bef',
    note: 'Target Game Lab commit as stated by the product owner. V2U did not open or modify the Game Lab; its contracts must be compared by Codex.',
  },
  files,
};
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`exported ${files.length} payload(s) to ${path.relative(root, outDir) || '.'}`);
