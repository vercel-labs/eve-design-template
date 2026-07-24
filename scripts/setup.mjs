import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readManifest, repoRoot } from './knowledge.mjs';

const statePath = resolve(repoRoot, '.vercel/eve-design-template.json');
const projectPath = resolve(repoRoot, '.vercel/project.json');
const vercelExecutable = process.platform === 'win32' ? 'vercel.cmd' : 'vercel';

function run(args, options = {}) {
  const result = spawnSync(vercelExecutable, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      VERCEL_USE_EXPERIMENTAL_FRAMEWORKS: '1',
    },
    stdio: options.capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`vercel ${args.join(' ')} failed.`);
  }
  return options.capture ? result.stdout.trim() : result.status === 0;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readState() {
  try {
    return JSON.parse(await readFile(statePath, 'utf8'));
  } catch {
    return {};
  }
}

async function writeState(state) {
  await mkdir(resolve(repoRoot, '.vercel'), { recursive: true });
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function findConnectorUid(value) {
  if (typeof value === 'string') {
    const match = value.match(/(?:scl_[A-Za-z0-9]+|slack\/[A-Za-z0-9_-]+)/);
    return match?.[0];
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const match = findConnectorUid(item);
      if (match) return match;
    }
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      const match = findConnectorUid(item);
      if (match) return match;
    }
  }
  return undefined;
}

function connectorFromOutput(raw) {
  try {
    return findConnectorUid(JSON.parse(raw));
  } catch {
    return findConnectorUid(raw);
  }
}

async function createConnector(name, iconPath) {
  console.log('Slack authorization will open in your browser.');
  const args = [
    'connect',
    'create',
    'slack',
    '--name',
    name,
    '--triggers',
    '--format=json',
  ];
  if (iconPath) args.push('--icon', resolve(repoRoot, iconPath));
  const raw = run(args, { capture: true });
  const connectorUid = connectorFromOutput(raw);
  if (!connectorUid) {
    throw new Error(
      'Slack connector was created, but its UID could not be read. Re-run setup and paste the UID from Vercel Connect.',
    );
  }
  return connectorUid;
}

function vercelCurl(path, deploymentUrl, curlArgs = []) {
  const output = run(
    [
      'curl',
      path,
      '--deployment',
      deploymentUrl,
      '--yes',
      '--',
      '--silent',
      '--show-error',
      ...curlArgs,
      '--write-out',
      '\n%{http_code}',
    ],
    { capture: true },
  );
  const match = output.match(/\n(\d{3})\s*$/);
  if (!match) {
    throw new Error(`Could not read the status for ${path}.`);
  }
  return {
    body: output.slice(0, match.index).trim(),
    status: Number(match[1]),
  };
}

function validateRoutes(deploymentUrl) {
  const health = vercelCurl('/eve/v1/health', deploymentUrl);
  if (health.status !== 200) {
    throw new Error(
      `Expected the Eve health route to return 200; received ${health.status}.`,
    );
  }
  let healthPayload;
  try {
    healthPayload = JSON.parse(health.body);
  } catch {
    throw new Error('The Eve health route did not return JSON.');
  }
  if (healthPayload.ok !== true || healthPayload.status !== 'ready') {
    throw new Error('The Eve health route did not report ready.');
  }

  const slack = vercelCurl('/eve/v1/slack', deploymentUrl, [
    '--request',
    'POST',
    '--header',
    'Content-Type: application/json',
    '--data',
    '{}',
  ]);
  if (slack.status !== 401 || slack.body !== 'unauthorized') {
    throw new Error(
      `Expected the unsigned Slack route to return 401 unauthorized; received ${slack.status} ${slack.body || '(empty body)'}.`,
    );
  }
}

if (process.argv.includes('--help')) {
  console.log(`Usage: pnpm run setup

Links a Vercel project, creates or reuses a Slack connector, attaches its
production trigger, deploys production, and validates the Eve health and Slack
routes.`);
  process.exit(0);
}

console.log('Setting up the production design agent.');
run(['--version']);
if (!run(['whoami'], { allowFailure: true })) {
  console.log('Vercel authentication is required. A browser will open.');
  run(['login']);
  run(['whoami']);
}

if (!(await exists(projectPath))) {
  run(['link']);
}

const state = await readState();
const manifest = await readManifest();
const terminal = createInterface({ input, output });
let connectorUid =
  process.env.SLACK_CONNECTOR ?? state.connectorUid ?? undefined;

if (!connectorUid) {
  const existing = (
    await terminal.question(
      'Existing Slack connector UID (leave blank to create one): ',
    )
  ).trim();
  connectorUid =
    existing ||
    (await createConnector(manifest.agent.name, manifest.agent.iconPath));
}
terminal.close();

await writeState({ connectorUid });

run(['connect', 'detach', connectorUid, '--yes'], { allowFailure: true });
run([
  'connect',
  'attach',
  connectorUid,
  '--triggers',
  '--trigger-path',
  '/eve/v1/slack',
  '--environment',
  'production',
  '--yes',
]);
run([
  'env',
  'add',
  'SLACK_CONNECTOR',
  'production',
  '--value',
  connectorUid,
  '--force',
  '--yes',
]);

const deploymentOutput = run(
  ['deploy', '--prod', '--yes', '--format=json'],
  { capture: true },
);
const deploymentUrl = deploymentOutput.match(/https:\/\/[^\s"]+/)?.[0];
if (!deploymentUrl) {
  throw new Error('Production deployed, but its URL could not be read.');
}

validateRoutes(deploymentUrl);
console.log(`Production ready: ${deploymentUrl}`);
