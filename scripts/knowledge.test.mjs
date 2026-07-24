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
const defaultGuideline =
  '<!-- sources: core -->\n<!-- priority: 100 -->\n\n# Core\n';

function coreSource(overrides = {}) {
  return {
    id: 'core',
    title: 'Core guidelines',
    origin: 'https://example.com/design',
    capturedAt: '2026-07-24T00:00:00.000Z',
    snapshotPath: 'knowledge/sources/core/2026-07-24/source.md',
    owner: 'Design owner',
    priority: 100,
    status: 'approved',
    rightsConfirmed: true,
    ...overrides,
  };
}

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
    sources: [coreSource()],
    ...overrides,
  };
}

async function createFixture({
  manifest,
  guideline = defaultGuideline,
  extraFiles = [],
}) {
  const root = await mkdtemp(resolve(tmpdir(), 'eve-design-knowledge-'));
  await mkdir(resolve(root, 'scripts'), { recursive: true });
  await mkdir(resolve(root, 'knowledge/guidelines'), { recursive: true });
  await mkdir(resolve(root, 'knowledge/sources'), { recursive: true });
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
  await writeFile(resolve(root, 'knowledge/manifest.schema.json'), '{}\n');
  await writeFile(resolve(root, 'knowledge/guidelines/README.md'), '# Rules\n');
  await writeFile(resolve(root, 'knowledge/sources/README.md'), '# Sources\n');

  if (guideline !== null) {
    await writeFile(resolve(root, 'knowledge/guidelines/core.md'), guideline);
  }
  for (const source of manifest.sources ?? []) {
    if (
      typeof source.snapshotPath !== 'string' ||
      !source.snapshotPath.startsWith('knowledge/sources/') ||
      source.snapshotPath.includes('..')
    ) {
      continue;
    }
    const path = resolve(root, source.snapshotPath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `# ${source.title ?? 'Source'}\n`);
  }
  for (const [path, contents] of extraFiles) {
    const destination = resolve(root, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }

  return root;
}

function verify(root) {
  return spawnSync('node', ['scripts/verify-knowledge.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
}

async function expectRejected(t, fixture, pattern) {
  const root = await createFixture(fixture);
  t.after(() => rm(root, { force: true, recursive: true }));
  const result = verify(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, pattern);
  return result;
}

test('accepts the initial draft manifest', async (t) => {
  const manifest = approvedManifest({
    status: 'draft',
    approval: { approvedBy: null, approvedAt: null },
    sources: [],
  });
  const root = await createFixture({ manifest, guideline: null });
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

test('packages only active reviewed design knowledge', async (t) => {
  const oldSource = coreSource({
    id: 'old',
    title: 'Old guidelines',
    snapshotPath: 'knowledge/sources/old/2026-01-01/source.md',
    status: 'superseded',
    priority: 90,
  });
  const root = await createFixture({
    manifest: approvedManifest({ sources: [coreSource(), oldSource] }),
  });
  t.after(() => rm(root, { force: true, recursive: true }));

  const result = spawnSync('node', ['scripts/prepare-knowledge.mjs'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const workspace = resolve(root, 'agent/sandbox/workspace/knowledge');
  const preparedManifest = JSON.parse(
    await readFile(resolve(workspace, 'manifest.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(preparedManifest), [
    'schemaVersion',
    'status',
    'sources',
  ]);
  assert.deepEqual(
    preparedManifest.sources.map((source) => source.id),
    ['core'],
  );
  await assert.rejects(access(resolve(workspace, 'manifest.schema.json')));
  await assert.rejects(access(resolve(workspace, 'guidelines/README.md')));
  await assert.rejects(
    access(resolve(workspace, 'sources/old/2026-01-01/source.md')),
  );
});

test('rejects guidance without provenance before approval', async (t) => {
  await expectRejected(
    t,
    {
      manifest: approvedManifest({
        status: 'draft',
        approval: { approvedBy: null, approvedAt: null },
        sources: [
          coreSource({ status: 'draft', rightsConfirmed: false }),
        ],
      }),
      guideline: '# Core\n',
    },
    /must start with sources and integer priority metadata/,
  );
});

test('rejects mixed-priority guideline sources', async (t) => {
  const writingSource = coreSource({
    id: 'writing',
    title: 'Writing guide',
    snapshotPath: 'knowledge/sources/writing/2026-07-24/source.md',
    priority: 90,
  });
  await expectRejected(
    t,
    {
      manifest: approvedManifest({
        sources: [coreSource(), writingSource],
      }),
      guideline:
        '<!-- sources: core, writing -->\n<!-- priority: 100 -->\n\n# Mixed\n',
    },
    /references sources with different priorities/,
  );
});

test('rejects files outside the reviewed corpus', async (t) => {
  await expectRejected(
    t,
    {
      manifest: approvedManifest(),
      extraFiles: [['knowledge/guidelines/notes.txt', 'unreviewed']],
    },
    /knowledge contains files that are not reviewed corpus entries/,
  );
});

test('rejects a missing snapshot path with a verification error', async (t) => {
  const manifest = approvedManifest();
  delete manifest.sources[0].snapshotPath;
  const result = await expectRejected(
    t,
    { manifest },
    /source entry core is invalid/,
  );
  assert.doesNotMatch(result.stderr, /TypeError/);
});

const governanceCases = [
  {
    name: 'missing design owner',
    manifest: () => {
      const manifest = approvedManifest();
      manifest.agent.designOwnerSlackId = null;
      return manifest;
    },
    pattern: /require a designOwnerSlackId/,
  },
  {
    name: 'draft source in an approved corpus',
    manifest: () =>
      approvedManifest({ sources: [coreSource({ status: 'draft' })] }),
    guideline: null,
    pattern: /require at least one active approved source/,
  },
  {
    name: 'unconfirmed source rights',
    manifest: () =>
      approvedManifest({
        sources: [coreSource({ rightsConfirmed: false })],
      }),
    pattern: /must be rights-confirmed/,
  },
  {
    name: 'approval metadata on a draft corpus',
    manifest: () => approvedManifest({ status: 'draft' }),
    pattern: /draft corpora cannot carry approval metadata/,
  },
  {
    name: 'guideline priority mismatch',
    manifest: approvedManifest,
    guideline:
      '<!-- sources: core -->\n<!-- priority: 99 -->\n\n# Core\n',
    pattern: /priority must match its sources/,
  },
  {
    name: 'unknown guideline source',
    manifest: approvedManifest,
    guideline:
      '<!-- sources: unknown -->\n<!-- priority: 100 -->\n\n# Core\n',
    pattern: /references an unknown source/,
  },
  {
    name: 'superseded guideline source',
    manifest: () =>
      approvedManifest({
        status: 'draft',
        approval: { approvedBy: null, approvedAt: null },
        sources: [coreSource({ status: 'superseded' })],
      }),
    pattern: /references an inactive source/,
  },
  {
    name: 'approved corpus without guidelines',
    manifest: approvedManifest,
    guideline: null,
    pattern: /require at least one normalized guideline file/,
  },
  {
    name: 'duplicate source IDs',
    manifest: () =>
      approvedManifest({ sources: [coreSource(), coreSource()] }),
    pattern: /source IDs must be unique/,
  },
  {
    name: 'snapshot path traversal',
    manifest: () =>
      approvedManifest({
        sources: [
          coreSource({
            snapshotPath: 'knowledge/sources/core/../../outside.md',
          }),
        ],
      }),
    pattern: /escapes its allowed directory/,
  },
  {
    name: 'duplicate guideline source references',
    manifest: approvedManifest,
    guideline:
      '<!-- sources: core, core -->\n<!-- priority: 100 -->\n\n# Core\n',
    pattern: /contains duplicate source references/,
  },
];

for (const scenario of governanceCases) {
  test(`rejects ${scenario.name}`, async (t) => {
    await expectRejected(
      t,
      {
        manifest: scenario.manifest(),
        guideline:
          scenario.guideline === undefined
            ? defaultGuideline
            : scenario.guideline,
      },
      scenario.pattern,
    );
  });
}
