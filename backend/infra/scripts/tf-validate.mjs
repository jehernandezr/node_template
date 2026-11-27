import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Validates the Terraform without touching AWS or the backends: init -backend=false, validate and terraform test (mocked providers) in each stack, each module with tests and each example; then it plans every stack of every environment with its real values (common.tfvars and the stack's terraform.tfvars) through the stack's tests/environment, also with mocked providers. It also checks that variables_common.tf is identical in all stacks and that each environment points to stacks that exist. Usage, from the repository root: node backend/infra/scripts/tf-validate.mjs.
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

const ENVIRONMENT_TESTS = join('tests', 'environment');

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
        ? subdirs(join(environmentsDir, env, stack)).map((svc) =>
            join(stack, svc),
          )
        : [stack];
    const expected = stack === 'services' ? 'service' : stack;
    if (!stacks.includes(expected))
      failures.push(
        `environments/${env}/${stack}: stacks/${expected} does not exist`,
      );
    for (const d of dirs) {
      for (const file of ['backend.tfvars', 'terraform.tfvars']) {
        if (!existsSync(join(environmentsDir, env, d, file))) {
          failures.push(`environments/${env}/${d}/${file} does not exist`);
        }
      }
      environmentRuns.push({
        stack: expected,
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

/**
 * Plans each stack with the real values of each environment. A stack without tests/environment fails, so a new stack cannot skip it.
 */
for (const { stack, label, varFiles } of environmentRuns) {
  const dir = join(stacksDir, stack);
  if (!stacks.includes(stack)) continue;
  if (!existsSync(join(dir, ENVIRONMENT_TESTS))) {
    failures.push(`stacks/${stack}/${ENVIRONMENT_TESTS} does not exist`);
    continue;
  }
  console.log(`::group::terraform test ${label}`);
  const ok = run(dir, [
    'test',
    `-test-directory=${ENVIRONMENT_TESTS}`,
    ...varFiles.map((file) => `-var-file=${file}`),
  ]);
  console.log('::endgroup::');
  if (!ok) failures.push(`${label} with its real values`);
}

if (failures.length > 0) {
  console.error(`\nFailures:\n${failures.map((f) => `- ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('\nTerraform is valid.');
