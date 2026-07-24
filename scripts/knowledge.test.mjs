import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptsRoot = dirname(fileURLToPath(import.meta.url));

function approvedManifest(overrides = {}) {
  return {
    $schema: './manifest.schema.json',
    schemaVersion: 1,
    status: 'approved',
    agent: {
      name: 'design-agent',
      description: 'Fixture',
      iconPath: null,
      designOwnerSlackId: 'U123ABC',
      allowGeneralGuidance: true,
      allowedChannelIds: [],
      allowedUserIds: [],
    },
    approval: {
      approvedBy: 'Design owner',
      approvedAt: '2026-07-24T00:00:00.000Z',
    },
    sources: [
      {
        id: 'core',
        title: 'Core guidelines',
        origin: 'https://example.com/design',
        capturedAt: '2026-07-24T00:00:00.000Z',
        snapshotPath: 'knowledge/sources/core/2026-07-24/source.md',
        owner: 'Design owner',
        priority: 100,
        status: 'approved',
        rightsConfirmed: true,
      },
    ],
    ...overrides,
  };
}

async function createFixture({
  manifest,
  guideline = '<!-- sources: core -->\n<!-- priority: 100 -->\n\n# Core\n',
  snapshot = '# Source\n',
}) {
  const root = await mkdtemp(resolve(tmpdir(), 'eve-design-knowledge-'));
  await mkdir(resolve(root, 'scripts'), { recursive: true });
  await mkdir(resolve(root, 'knowledge/guidelines'), { recursive: true });
  await mkdir(resolve(root, 'knowledge/sources/core/2026-07-24'), {
    recursive: true,
  });
  await copyFile(
    resolve(scriptsRoot, 'knowledge.mjs'),
    resolve(root, 'scripts/knowledge.mjs'),
  );
  await copyFile(
    resolve(scriptsRoot, 'verify-knowledge.mjs'),
    resolve(root, 'scripts/verify-knowledge.mjs'),
  );
  await copyFile(
    resolve(scriptsRoot, 'prepare-knowledge.mjs'),
    resolve(root, 'scripts/prepare-knowledge.mjs'),
  );
  await writeFile(
    resolve(root, 'knowledge/manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  await writeFile(resolve(root, 'knowledge/guidelines/core.md'), guideline);
  await writeFile(
    resolve(root, 'knowledge/sources/core/2026-07-24/source.md'),
    snapshot,
  );
  return root;
}

function verify(root) {
  return spawnSync('node', ['scripts/verify-knowledge.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('accepts the initial draft manifest', async (t) => {
  const manifest = approvedManifest({
    status: 'draft',
    approval: { approvedBy: null, approvedAt: null },
    sources: [],
  });
  const root = await createFixture({ manifest });
  t.after(() => rm(root, { force: true, recursive: true }));

  const result = verify(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Knowledge verified: draft, 0 sources/);
});

test('accepts a complete approved corpus', async (t) => {
  const root = await createFixture({ manifest: approvedManifest() });
  t.after(() => rm(root, { force: true, recursive: true }));

  const result = verify(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Knowledge verified: approved, 1 source/);
});

test('packages only design knowledge into the model workspace', async (t) => {
  const root = await createFixture({ manifest: approvedManifest() });
  t.after(() => rm(root, { force: true, recursive: true }));

  const result = spawnSync('node', ['scripts/prepare-knowledge.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const preparedManifest = JSON.parse(
    await readFile(
      resolve(root, 'agent/sandbox/workspace/knowledge/manifest.json'),
      'utf8',
    ),
  );
  assert.deepEqual(Object.keys(preparedManifest), [
    'schemaVersion',
    'status',
    'sources',
  ]);
  await assert.rejects(
    access(resolve(root, 'agent/sandbox/workspace/knowledge/.prepared.json')),
  );
});

test('rejects approved guidance without provenance metadata', async (t) => {
  const root = await createFixture({
    manifest: approvedManifest(),
    guideline: '# Core\n',
  });
  t.after(() => rm(root, { force: true, recursive: true }));

  const result = verify(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must declare sources and integer priority/);
});

test('rejects a missing snapshot path with a verification error', async (t) => {
  const manifest = approvedManifest();
  delete manifest.sources[0].snapshotPath;
  const root = await createFixture({ manifest });
  t.after(() => rm(root, { force: true, recursive: true }));

  const result = verify(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source entry core is invalid/);
  assert.doesNotMatch(result.stderr, /TypeError/);
});
