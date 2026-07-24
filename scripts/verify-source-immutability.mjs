import { spawnSync } from 'node:child_process';

const base = process.argv.slice(2).find((argument) => argument !== '--');
if (!base) {
  console.log('Source immutability check skipped: no base ref provided.');
  process.exit(0);
}

const result = spawnSync(
  'git',
  [
    'diff',
    '--no-renames',
    '--diff-filter=MD',
    '--name-only',
    `${base}...HEAD`,
    '--',
    'knowledge/sources',
  ],
  { encoding: 'utf8' },
);
if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(result.stderr.trim() || `Could not compare against ${base}.`);
}

const changedSnapshots = result.stdout
  .split('\n')
  .map((path) => path.trim())
  .filter(
    (path) => path && path !== 'knowledge/sources/README.md',
  );

if (changedSnapshots.length > 0) {
  throw new Error(
    `Source snapshots are immutable. Add a new dated snapshot instead of modifying or deleting:\n${changedSnapshots.join('\n')}`,
  );
}

console.log('Source snapshots are immutable.');
