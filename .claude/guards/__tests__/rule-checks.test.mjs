import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { RuleChecksDocument } from '../rule-checks-document.mjs';
import { RuleInventory } from '../rule-inventory.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const DOCUMENT = join(ROOT, 'docs/quality/rule-checks.md');

describe('docs/quality/rule-checks.md', () => {
  const rules = new RuleInventory(ROOT).rules();
  const rows = RuleChecksDocument.read(DOCUMENT).rows();

  it('has a row for every rule of CLAUDE.md and the skills', () => {
    const listed = new Set(rows.map((row) => row.id));
    const missing = rules
      .filter((rule) => !listed.has(`${rule.source}|${rule.key}`))
      .map((rule) => `| ${rule.source} | ${rule.text} | review only |`);
    assert.deepEqual(
      missing,
      [],
      `Add these rows under their source:\n${missing.join('\n')}`,
    );
  });

  it('names only rules that still exist', () => {
    const known = new Set(rules.map((rule) => `${rule.source}|${rule.key}`));
    const stale = rows.filter((row) => !known.has(row.id)).map((row) => row.id);
    assert.deepEqual(stale, []);
  });

  it('gives every row a check or marks it review only', () => {
    assert.deepEqual(
      rows.filter((row) => row.check === '').map((row) => row.id),
      [],
    );
  });
});

describe('RuleInventory', () => {
  const inventory = new RuleInventory(ROOT);

  it('reads the bullets of rule sections and skips sections that only point elsewhere', () => {
    const rules = inventory.rulesOf(
      'sample',
      '# Sample\n\n## Skill map\n\n- Folders: `backend-structure`.\n\n## Rules\n\n- No `new` of dependencies.\n  - a nested note\n\n```md\n- not a rule\n```\n',
    );
    assert.deepEqual(
      rules.map((rule) => rule.text),
      ['No `new` of dependencies.'],
    );
  });

  it('keys a rule by its first words without Markdown', () => {
    assert.equal(
      RuleInventory.keyOf(
        'No `new` of [dependencies](a.md) in **business** code: they are wired in the module',
      ),
      'no new of dependencies in business code they are wired',
    );
  });
});
