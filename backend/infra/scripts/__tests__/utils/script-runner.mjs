import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const UTILS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(UTILS_DIR, '../../../../..');
const SCRIPTS_DIR = join(REPO_ROOT, 'backend', 'infra', 'scripts');
const FIXTURE_TERRAFORM_ROOT = join(UTILS_DIR, 'fixtures', 'terraform');
const DRY_RUN_PREFIX = '+ ';

// Runs a backend/infra/scripts script in dry-run mode. The environment does not inherit the test
// process's: AWS credentials never reach the scripts.
export class ScriptRunner {
  static fixtureTerraformRoot = FIXTURE_TERRAFORM_ROOT;
  static scriptsDir = SCRIPTS_DIR;

  run(script, args = [], env = {}) {
    const result = spawnSync('bash', [join(SCRIPTS_DIR, script), ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        DRY_RUN: '1',
        TF_ROOT: FIXTURE_TERRAFORM_ROOT,
        GIT_SHA: 'abc1234',
        ARTIFACTS_BUCKET: 'fixture-artifacts',
        ECR_PREFIX: 'fixture-dev',
        AWS_REGION: 'us-east-1',
        ...env,
      },
    });
    const lines = result.stdout
      .split('\n')
      .filter((line) => line.startsWith(DRY_RUN_PREFIX));
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      lines,
    };
  }
}
