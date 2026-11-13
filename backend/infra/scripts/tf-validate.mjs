// Valida el Terraform sin tocar AWS ni los backends: init -backend=false, validate y
// terraform test (proveedores simulados) en cada stack y ejemplo; además comprueba que
// variables_common.tf sea idéntico en todos los stacks y que cada ambiente apunte a stacks
// que existen. Uso, desde la raíz del repositorio: node backend/infra/scripts/tf-validate.mjs
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// variables_common.tf debe ser el mismo archivo en todos los stacks.
const commons = stacks.map((stack) => ({
  stack,
  content: readFileSync(join(stacksDir, stack, 'variables_common.tf'), 'utf8'),
}));
for (const { stack, content } of commons) {
  if (content !== commons[0].content) {
    failures.push(
      `stacks/${stack}/variables_common.tf difiere de stacks/${commons[0].stack}`,
    );
  }
}

// Cada ambiente usa stacks existentes y trae su backend.tfvars y su terraform.tfvars.
const environmentsDir = join(terraformRoot, 'environments');
for (const env of subdirs(environmentsDir)) {
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
        `environments/${env}/${stack}: no existe stacks/${expected}`,
      );
    for (const d of dirs) {
      for (const file of ['backend.tfvars', 'terraform.tfvars']) {
        if (!existsSync(join(environmentsDir, env, d, file))) {
          failures.push(`environments/${env}/${d}/${file} no existe`);
        }
      }
    }
  }
}

for (const stack of stacks) check(join(stacksDir, stack), true);
for (const example of subdirs(join(terraformRoot, 'examples'))) {
  check(join(terraformRoot, 'examples', example), false);
}

if (failures.length > 0) {
  console.error(`\nFallas:\n${failures.map((f) => `- ${f}`).join('\n')}`);
  process.exit(1);
}
console.log('\nTerraform válido.');
