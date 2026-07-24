import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const knowledgeRoot = resolve(repoRoot, 'knowledge');
export const manifestPath = resolve(knowledgeRoot, 'manifest.json');

function fail(message) {
  throw new Error(`Knowledge verification failed: ${message}`);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value) {
  return (
    isNonEmptyString(value) &&
    Number.isFinite(Date.parse(value)) &&
    value === new Date(value).toISOString()
  );
}

function hasDuplicates(values) {
  return new Set(values).size !== values.length;
}

function validateSlackIds(values, pattern, label) {
  if (!Array.isArray(values) || values.some((value) => !pattern.test(value))) {
    fail(`${label} must be an array of valid Slack IDs.`);
  }
  if (hasDuplicates(values)) fail(`${label} contains duplicate IDs.`);
}

function resolveWithin(root, path, label) {
  const resolved = resolve(repoRoot, path);
  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
    fail(`${label} escapes its allowed directory: ${path}`);
  }
  return resolved;
}

async function requireRegularFile(path, label) {
  let stats;
  try {
    stats = await lstat(path);
  } catch {
    fail(`${label} does not exist.`);
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail(`${label} must be a regular file.`);
  }
}

async function filesUnder(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      fail(`knowledge cannot contain symlinks: ${displayPath(path)}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await filesUnder(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

export async function guidelineFiles() {
  return (await filesUnder(resolve(knowledgeRoot, 'guidelines'))).filter(
    (path) =>
      path.endsWith('.md') && !path.endsWith(`${sep}README.md`),
  );
}

export async function readManifest() {
  let contents;
  try {
    contents = await readFile(manifestPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') fail('manifest.json does not exist.');
    fail('manifest.json could not be read.');
  }

  let manifest;
  try {
    manifest = JSON.parse(contents);
  } catch {
    fail('manifest.json must contain valid JSON.');
  }
  return manifest;
}

export async function verifyKnowledge() {
  const manifest = await readManifest();

  if (manifest.schemaVersion !== 1) fail('schemaVersion must be 1.');
  if (!['draft', 'approved'].includes(manifest.status)) {
    fail('status must be draft or approved.');
  }

  const agent = manifest.agent;
  if (
    !agent ||
    !isNonEmptyString(agent.name) ||
    !isNonEmptyString(agent.description) ||
    typeof agent.allowGeneralGuidance !== 'boolean'
  ) {
    fail('agent configuration is incomplete.');
  }
  if (agent.iconPath !== null && !agent.iconPath?.startsWith('branding/')) {
    fail('iconPath must point into branding/ or be null.');
  }
  if (agent.iconPath !== null) {
    const brandingRoot = resolve(repoRoot, 'branding');
    await requireRegularFile(
      resolveWithin(brandingRoot, agent.iconPath, 'agent icon'),
      'agent icon',
    );
  }
  if (
    agent.designOwnerSlackId !== null &&
    !/^[UW][A-Z0-9]+$/.test(agent.designOwnerSlackId)
  ) {
    fail('designOwnerSlackId must be a Slack member ID or null.');
  }
  validateSlackIds(
    agent.allowedChannelIds,
    /^[CG][A-Z0-9]+$/,
    'allowedChannelIds',
  );
  validateSlackIds(
    agent.allowedUserIds,
    /^[UW][A-Z0-9]+$/,
    'allowedUserIds',
  );

  if (!manifest.approval || !Array.isArray(manifest.sources)) {
    fail('approval and sources are required.');
  }

  const sourceIds = [];
  const sourceById = new Map();
  const sourcesRoot = resolve(knowledgeRoot, 'sources');
  for (const source of manifest.sources) {
    if (
      !source ||
      !/^[a-z0-9][a-z0-9-]*$/.test(source.id) ||
      !isNonEmptyString(source.title) ||
      !isNonEmptyString(source.origin) ||
      !isNonEmptyString(source.snapshotPath) ||
      !isNonEmptyString(source.owner) ||
      !Number.isInteger(source.priority) ||
      !['draft', 'approved', 'superseded'].includes(source.status) ||
      typeof source.rightsConfirmed !== 'boolean'
    ) {
      fail(`source entry ${source?.id ?? '(unknown)'} is invalid.`);
    }
    if (!isIsoDate(source.capturedAt)) {
      fail(
        `source ${source.id} capturedAt must use canonical ISO format, such as 2026-07-24T00:00:00.000Z.`,
      );
    }
    if (!source.snapshotPath.startsWith(`knowledge/sources/${source.id}/`)) {
      fail(
        `source ${source.id} must point into knowledge/sources/${source.id}/.`,
      );
    }
    await requireRegularFile(
      resolveWithin(
        sourcesRoot,
        source.snapshotPath,
        `snapshot for ${source.id}`,
      ),
      `snapshot for ${source.id}`,
    );
    sourceIds.push(source.id);
    sourceById.set(source.id, source);
  }
  if (hasDuplicates(sourceIds)) fail('source IDs must be unique.');

  const guidelines = await guidelineFiles();
  for (const guideline of guidelines) {
    const contents = await readFile(guideline, 'utf8');
    const metadata = contents.match(
      /^<!--\s*sources:\s*([a-z0-9,\s-]+)\s*-->\r?\n<!--\s*priority:\s*(-?\d+)\s*-->/i,
    );
    const sources = metadata?.[1];
    const priority = metadata?.[2];
    if (!sources || priority === undefined) {
      fail(
        `${displayPath(guideline)} must start with sources and integer priority metadata.`,
      );
    }
    const referencedSources = sources
      .split(',')
      .map((source) => source.trim())
      .filter(Boolean);
    if (hasDuplicates(referencedSources)) {
      fail(`${displayPath(guideline)} contains duplicate source references.`);
    }
    if (
      referencedSources.length === 0 ||
      referencedSources.some((source) => !sourceIds.includes(source))
    ) {
      fail(`${displayPath(guideline)} references an unknown source.`);
    }
    const referencedEntries = referencedSources.map((source) =>
      sourceById.get(source),
    );
    if (
      referencedEntries.some(
        (source) =>
          source.status === 'superseded' ||
          (manifest.status === 'approved' && source.status !== 'approved'),
      )
    ) {
      fail(`${displayPath(guideline)} references an inactive source.`);
    }
    const priorities = new Set(
      referencedEntries.map((source) => source.priority),
    );
    if (priorities.size > 1) {
      fail(
        `${displayPath(guideline)} references sources with different priorities; split it into one file per priority.`,
      );
    }
    const [expectedPriority] = priorities;
    if (Number(priority) !== expectedPriority) {
      fail(`${displayPath(guideline)} priority must match its sources.`);
    }
  }

  const allowedFiles = new Set([
    manifestPath,
    resolve(knowledgeRoot, 'manifest.schema.json'),
    resolve(knowledgeRoot, 'guidelines/README.md'),
    resolve(knowledgeRoot, 'sources/README.md'),
    ...guidelines,
    ...manifest.sources.map((source) => resolve(repoRoot, source.snapshotPath)),
  ]);
  const unexpectedFiles = (await filesUnder(knowledgeRoot)).filter(
    (path) => !allowedFiles.has(path),
  );
  if (unexpectedFiles.length > 0) {
    fail(
      `knowledge contains files that are not reviewed corpus entries:\n${unexpectedFiles
        .map(displayPath)
        .join('\n')}`,
    );
  }

  if (manifest.status === 'approved') {
    if (!agent.designOwnerSlackId) {
      fail('approved corpora require a designOwnerSlackId.');
    }
    if (
      !isNonEmptyString(manifest.approval.approvedBy) ||
      !isIsoDate(manifest.approval.approvedAt)
    ) {
      fail(
        'approved corpora require approver identity and a canonical ISO approval time, such as 2026-07-24T00:00:00.000Z.',
      );
    }
    if (manifest.sources.length === 0) {
      fail('approved corpora require at least one source.');
    }
    if (manifest.sources.every((source) => source.status !== 'approved')) {
      fail('approved corpora require at least one active approved source.');
    }
    if (
      manifest.sources.some(
        (source) => source.status === 'draft' || !source.rightsConfirmed,
      )
    ) {
      fail('sources cannot be draft and must be rights-confirmed.');
    }
    if (guidelines.length === 0) {
      fail('approved corpora require at least one normalized guideline file.');
    }
  } else if (
    manifest.approval.approvedBy !== null ||
    manifest.approval.approvedAt !== null
  ) {
    fail('draft corpora cannot carry approval metadata.');
  }

  return manifest;
}

export function displayPath(path) {
  return relative(repoRoot, path).split(sep).join('/');
}
