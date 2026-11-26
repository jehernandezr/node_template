import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ScriptRunner } from './utils/script-runner.mjs';

const WORKFLOWS_DIR = join(
  ScriptRunner.scriptsDir,
  '..',
  '..',
  '..',
  '.github',
  'workflows',
);
const WORKFLOW_FILES = ['deploy.yml', 'publish-web.yml', 'publish-mobile.yml'];
const USES_PATTERN = /uses: [^@\s]+@[0-9a-f]{40} # v\d/;
const FORBIDDEN_NAMES = [
  'identity',
  'tasks',
  'notifications',
  'reports',
  'billing',
];

function read(file) {
  return readFileSync(join(WORKFLOWS_DIR, file), 'utf8');
}

function runBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index++) {
    const match = /^(\s*)(- )?run:\s*(.*)$/.exec(lines[index]);
    if (match === null) continue;
    if (match[3].startsWith('|') || match[3].startsWith('>')) {
      const indent = match[1].length + (match[2] ? 2 : 0);
      const body = [];
      let next = index + 1;
      while (
        next < lines.length &&
        (lines[next].trim() === '' || lines[next].search(/\S/) > indent)
      ) {
        body.push(lines[next]);
        next++;
      }
      blocks.push(body.join('\n'));
    } else {
      blocks.push(match[3]);
    }
  }
  return blocks;
}

describe('deployment workflows', () => {
  it('every action uses a full SHA with a version comment', () => {
    for (const file of WORKFLOW_FILES) {
      for (const line of read(file)
        .split('\n')
        .filter((item) => item.includes('uses:'))) {
        assert.match(line, USES_PATTERN, `${file}: ${line.trim()}`);
      }
    }
  });

  it('every file declares id-token: write and none uses long-lived keys', () => {
    for (const file of WORKFLOW_FILES) {
      const text = read(file);
      assert.match(text, /id-token: write/, file);
      assert.doesNotMatch(
        text,
        /AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|secrets\.AWS/,
        file,
      );
    }
  });

  it('deploy.yml discovers the services with the CLI and fromJSON, without a fixed list', () => {
    const text = read('deploy.yml');
    assert.match(text, /service-catalog-cli\.mjs/);
    assert.match(text, /fromJSON/);
    for (const name of FORBIDDEN_NAMES) {
      assert.doesNotMatch(
        text,
        new RegExp(name),
        `deploy.yml contains ${name}`,
      );
    }
  });

  it('deploy.yml publishes the services on a native ARM64 runner by default', () => {
    const services = read('deploy.yml').split('\n  services:\n')[1] ?? '';
    assert.match(
      services,
      /runs-on: \$\{\{ vars\.DEPLOY_RUNNER \|\| 'ubuntu-24\.04-arm' \}\}/,
    );
  });

  it('deploy.yml references the deploy and publish roles', () => {
    const text = read('deploy.yml');
    assert.match(text, /vars\.AWS_DEPLOY_ROLE_ARN/);
    assert.match(text, /vars\.AWS_PUBLISH_ROLE_ARN/);
  });

  it('publish-web.yml references the web role', () => {
    assert.match(read('publish-web.yml'), /vars\.AWS_WEB_ROLE_ARN/);
  });

  it('no run block interpolates ${{ }}: values go through env', () => {
    for (const file of WORKFLOW_FILES) {
      for (const block of runBlocks(read(file))) {
        assert.doesNotMatch(block, /\$\{\{/, `${file}: ${block}`);
      }
    }
  });

  it('deploy.yml runs the publish, migrate, plan and apply stages in that order', () => {
    const text = read('deploy.yml');
    const indexes = ['publish', 'migrate', 'plan', 'apply'].map((stage) =>
      text.indexOf(`"$SERVICE" ${stage}`),
    );
    for (const index of indexes) assert.notEqual(index, -1);
    assert.deepEqual(
      indexes,
      [...indexes].sort((a, b) => a - b),
    );
  });

  it('the ci.yml terraform filter covers the infrastructure, every workflow and .nvmrc', () => {
    const ci = read('ci.yml');
    const filter =
      ci.split('\n            terraform:\n')[1]?.split(/\n {12}\S/)[0] ?? '';
    for (const path of [
      "'backend/infra/**'",
      "'.github/workflows/**'",
      "'.nvmrc'",
    ]) {
      assert.ok(
        filter.includes(`- ${path}`),
        `terraform filter misses ${path}`,
      );
    }
  });
});
