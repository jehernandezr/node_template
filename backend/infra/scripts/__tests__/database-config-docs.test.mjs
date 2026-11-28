import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
);
const terraformRoot = join(repoRoot, 'backend', 'infra', 'terraform');
const adrRoot = join(repoRoot, 'docs', 'adr');

describe('database variables in the docs', () => {
  it('names only the DB_* keys of databaseConfigSchema in the ADRs and the Terraform README', () => {
    const config = JSON.parse(
      readFileSync(join(terraformRoot, 'database-config.json'), 'utf8'),
    );
    const known = new Set(Object.values(config.keys).flat());
    const documents = [
      ...readdirSync(adrRoot)
        .filter((name) => name.endsWith('.md'))
        .map((name) => join(adrRoot, name)),
      join(terraformRoot, 'README.md'),
    ];

    const unknown = documents.flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/\bDB_[A-Z_]*[A-Z]\b/g)]
        .map(([name]) => name)
        .filter((name) => !known.has(name))
        .map((name) => `${path.slice(repoRoot.length + 1)}: ${name}`),
    );

    assert.deepEqual(unknown, []);
  });
});
