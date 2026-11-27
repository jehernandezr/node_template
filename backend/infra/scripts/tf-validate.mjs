import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EnvironmentMocks } from './environment-mocks.mjs';

/**
 * Validates the Terraform without touching AWS or the backends: init -backend=false, validate and terraform test (mocked providers) in each stack, each module with tests and each example; then it plans every stack of every environment with its real values (common.tfvars and the stack's terraform.tfvars; each service has its service-base values in services/<service>/base and its service values in services/<service>) through the stack's tests/environment, also with mocked providers; a stack without tests/environment fails, so a new stack cannot skip it. For the stacks in ENVIRONMENT_MOCKS, the remote states they read are mocked with EnvironmentMocks from the same environment's tfvars and topology.json. A run in KNOWN_GAPS must fail with exactly its listed errors until the cycle named there closes the gap, and fails the validation once it passes. It also checks that variables_common.tf is identical in all stacks and that each environment points to stacks that exist. Usage, from the repository root: node backend/infra/scripts/tf-validate.mjs.
 */
const terraformRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'terraform',
);
const terraform = process.env.TERRAFORM_BIN ?? 'terraform';
const failures = [];

function subdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort();
}

function run(dir, args) {
  const result = spawnSync(terraform, [`-chdir=${dir}`, ...args], {
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  return result.status === 0;
}

function runCaptured(dir, args) {
  const result = spawnSync(terraform, [`-chdir=${dir}`, ...args], {
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  const output = `${result.stdout}${result.stderr}`;
  process.stdout.write(output);
  return { ok: result.status === 0, output };
}

const ENVIRONMENT_TESTS = join('tests', 'environment');
const GENERATED_TESTS = join('tests', '.environment-generated');

/**
 * Remote states that each stack's environment test reads from EnvironmentMocks instead of fixed values.
 */
const ENVIRONMENT_MOCKS = Object.freeze({
  'service-base': [
    'network',
    'platform',
    'data',
    'messaging',
    'service',
    'service_base',
  ],
  service: ['network', 'platform', 'messaging', 'service_base'],
});

const REALTIME_WITHOUT_CERTIFICATE =
  'realtime needs realtime_alb_certificate_arn in the platform stack.';
const SES_WITHOUT_DOMAIN = 'ses_send needs ses_domain in the platform stack.';

/**
 * Environment runs that fail today on a contradiction a later cycle removes, with the errors they must show.
 */
const KNOWN_GAPS = Object.freeze(
  Object.fromEntries(
    ['dev', 'staging', 'prod'].flatMap((env) => [
      [
        `environments/${env}/services/notifications/base`,
        { cycle: 'F12-15', errors: [SES_WITHOUT_DOMAIN] },
      ],
      [
        `environments/${env}/services/notifications`,
        { cycle: 'F12-15', errors: [REALTIME_WITHOUT_CERTIFICATE] },
      ],
    ]),
  ),
);

function check(dir, withTests) {
  const label = relative(terraformRoot, dir);
  console.log(`::group::terraform validate ${label}`);
  const ok =
    run(dir, ['init', '-backend=false', '-input=false']) &&
    run(dir, ['validate']) &&
    (!withTests || !existsSync(join(dir, 'tests')) || run(dir, ['test']));
  console.log('::endgroup::');
  if (!ok) failures.push(label);
}

const stacksDir = join(terraformRoot, 'stacks');
const stacks = subdirs(stacksDir);

/**
 * variables_common.tf must be the same file in all stacks.
 */
const commons = stacks.map((stack) => ({
  stack,
  content: readFileSync(join(stacksDir, stack, 'variables_common.tf'), 'utf8'),
}));
for (const { stack, content } of commons) {
  if (content !== commons[0].content) {
    failures.push(
      `stacks/${stack}/variables_common.tf differs from stacks/${commons[0].stack}`,
    );
  }
}

/**
 * Each environment has its common.tfvars, uses existing stacks and has its backend.tfvars and its terraform.tfvars.
 */
const environmentsDir = join(terraformRoot, 'environments');
const environmentRuns = [];
for (const env of subdirs(environmentsDir)) {
  const common = join(environmentsDir, env, 'common.tfvars');
  if (!existsSync(common)) {
    failures.push(`environments/${env}/common.tfvars does not exist`);
  }
  for (const stack of subdirs(join(environmentsDir, env))) {
    const dirs =
      stack === 'services'
        ? subdirs(join(environmentsDir, env, stack)).flatMap((svc) => [
            { dir: join(stack, svc, 'base'), stack: 'service-base', svc },
            { dir: join(stack, svc), stack: 'service', svc },
          ])
        : [{ dir: stack, stack, svc: undefined }];
    for (const expected of new Set(dirs.map((d) => d.stack))) {
      if (!stacks.includes(expected))
        failures.push(
          `environments/${env}/${stack}: stacks/${expected} does not exist`,
        );
    }
    for (const { dir: d, stack: expected, svc } of dirs) {
      for (const file of ['backend.tfvars', 'terraform.tfvars']) {
        if (!existsSync(join(environmentsDir, env, d, file))) {
          failures.push(`environments/${env}/${d}/${file} does not exist`);
        }
      }
      environmentRuns.push({
        stack: expected,
        environment: env,
        service: svc,
        label: `environments/${env}/${d}`,
        varFiles: [common, join(environmentsDir, env, d, 'terraform.tfvars')],
      });
    }
  }
}

for (const stack of stacks) check(join(stacksDir, stack), true);
for (const module of subdirs(join(terraformRoot, 'modules'))) {
  const dir = join(terraformRoot, 'modules', module);
  if (existsSync(join(dir, 'tests'))) check(dir, true);
}
for (const example of subdirs(join(terraformRoot, 'examples'))) {
  check(join(terraformRoot, 'examples', example), false);
}

function environmentTestDirectory(dir, stack, environment, service) {
  const mocked = ENVIRONMENT_MOCKS[stack];
  if (mocked === undefined) return ENVIRONMENT_TESTS;
  const overrides = new EnvironmentMocks(
    terraformRoot,
    environment,
    service,
  ).overrides(mocked);
  rmSync(join(dir, GENERATED_TESTS), { recursive: true, force: true });
  mkdirSync(join(dir, GENERATED_TESTS), { recursive: true });
  for (const file of readdirSync(join(dir, ENVIRONMENT_TESTS))) {
    if (!file.endsWith('.tftest.hcl')) continue;
    writeFileSync(
      join(dir, GENERATED_TESTS, file),
      `${overrides}\n${readFileSync(join(dir, ENVIRONMENT_TESTS, file), 'utf8')}`,
    );
  }
  return GENERATED_TESTS;
}

function checkKnownGap(label, gap, { ok, output }) {
  if (ok) {
    failures.push(
      `${label} passes: remove it from KNOWN_GAPS (${gap.cycle} closed it)`,
    );
    return;
  }
  const errors = output.match(/^Error: /gm)?.length ?? 0;
  const missing = gap.errors.filter((error) => !output.includes(error));
  if (missing.length > 0 || errors !== gap.errors.length) {
    failures.push(
      `${label} with its real values: expected only the ${gap.cycle} gap (${gap.errors.join(' ')})`,
    );
    return;
  }
  console.log(`Known gap until ${gap.cycle}: ${label}`);
}

for (const {
  stack,
  environment,
  service,
  label,
  varFiles,
} of environmentRuns) {
  const dir = join(stacksDir, stack);
  if (!stacks.includes(stack)) continue;
  if (!existsSync(join(dir, ENVIRONMENT_TESTS))) {
    failures.push(`stacks/${stack}/${ENVIRONMENT_TESTS} does not exist`);
    continue;
  }
  console.log(`::group::terraform test ${label}`);
  const testDirectory = environmentTestDirectory(
    dir,
    stack,
    environment,
    service,
  );
  try {
    const result = runCaptured(dir, [
      'test',
      '-no-color',
      `-test-directory=${testDirectory}`,
      ...varFiles.map((file) => `-var-file=${file}`),
    ]);
    const gap = KNOWN_GAPS[label];
    if (gap !== undefined) checkKnownGap(label, gap, result);
    else if (!result.ok) failures.push(`${label} with its real values`);
  } finally {
    if (testDirectory === GENERATED_TESTS) {
      rmSync(join(dir, GENERATED_TESTS), { recursive: true, force: true });
    }
    console.log('::endgroup::');
  }
}

if (failures.length > 0) {
  console.error(`\nFailures:\n${failures.map((f) => `- ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('\nTerraform is valid.');
