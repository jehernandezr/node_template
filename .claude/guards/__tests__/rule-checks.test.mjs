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

  it('has a row for every rule id of CLAUDE.md and the skills', () => {
    const listed = new Set(rows.map((row) => row.id));
    const missing = rules
      .filter((rule) => !listed.has(rule.id))
      .map((rule) => `| \`${rule.id}\` | ${rule.text} | review only |`);
    assert.deepEqual(
      missing,
      [],
      `Add these rows under their source:\n${missing.join('\n')}`,
    );
  });

  it('names only rule ids that still exist, each once', () => {
    const known = new Set(rules.map((rule) => rule.id));
    const ids = rows.map((row) => row.id);
    assert.deepEqual(
      ids.filter((id) => !known.has(id)),
      [],
    );
    assert.deepEqual(
      ids.filter((id, index) => ids.indexOf(id) !== index),
      [],
    );
  });

  it('gives each id the rule the source has at that place, so a moved rule moves its row', () => {
    const keys = new Map(rules.map((rule) => [rule.id, rule.key]));
    const shifted = rows
      .filter((row) => keys.has(row.id) && keys.get(row.id) !== row.key)
      .map((row) => `${row.id}: "${row.key}" is now "${keys.get(row.id)}"`);
    assert.deepEqual(shifted, []);
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

  it('numbers the rules of CLAUDE.md within each section and those of a skill through the file', () => {
    const claude = inventory.rulesOf(
      'CLAUDE.md',
      '## Language\n\n- One.\n\n## Code\n\n- Two.\n- Three.\n',
    );
    const skill = inventory.rulesOf(
      'backend-testing',
      '## Location\n\n- One.\n\n## Doubles\n\n- Two.\n',
    );
    assert.deepEqual(
      [...claude, ...skill].map((rule) => rule.id),
      [
        'claude.language.1',
        'claude.code.1',
        'claude.code.2',
        'backend-testing.1',
        'backend-testing.2',
      ],
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
