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

// Returns the content of each run block, whether single-line or literal block.
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

describe('workflows de despliegue', () => {
  it('toda acción usa un SHA completo con comentario de versión', () => {
    for (const file of WORKFLOW_FILES) {
      for (const line of read(file)
        .split('\n')
        .filter((item) => item.includes('uses:'))) {
        assert.match(line, USES_PATTERN, `${file}: ${line.trim()}`);
      }
    }
  });

  it('cada archivo declara id-token: write y ninguno usa claves de larga vida', () => {
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

  it('deploy.yml descubre los servicios con el CLI y fromJSON, sin lista fija', () => {
    const text = read('deploy.yml');
    assert.match(text, /service-catalog-cli\.mjs/);
    assert.match(text, /fromJSON/);
    for (const name of FORBIDDEN_NAMES) {
      assert.doesNotMatch(
        text,
        new RegExp(name),
        `deploy.yml contiene ${name}`,
      );
    }
  });

  it('deploy.yml referencia los roles de despliegue y de publicación', () => {
    const text = read('deploy.yml');
    assert.match(text, /vars\.AWS_DEPLOY_ROLE_ARN/);
    assert.match(text, /vars\.AWS_PUBLISH_ROLE_ARN/);
  });

  it('publish-web.yml referencia el rol de la web', () => {
    assert.match(read('publish-web.yml'), /vars\.AWS_WEB_ROLE_ARN/);
  });

  it('ningún bloque run interpola ${{ }}: los valores pasan por env', () => {
    for (const file of WORKFLOW_FILES) {
      for (const block of runBlocks(read(file))) {
        assert.doesNotMatch(block, /\$\{\{/, `${file}: ${block}`);
      }
    }
  });

  it('deploy.yml ejecuta las etapas publish, migrate, plan y apply en ese orden', () => {
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
});
