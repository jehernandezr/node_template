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

  it('stores an id with every rule, under the prefix of its source and section, never twice and never a retired one', () => {
    const ids = rules.map((rule) => rule.id);
    const retired = new Set(RuleChecksDocument.read(DOCUMENT).retired());
    assert.deepEqual(
      rules
        .filter((rule) => rule.id === undefined)
        .map((rule) => `${rule.source}: ${rule.text}`),
      [],
    );
    assert.deepEqual(
      rules
        .filter((rule) => {
          const prefix = `${RuleInventory.prefixOf(rule.source, rule.section)}.`;
          return !(
            rule.id.startsWith(prefix) &&
            /^\d+$/.test(rule.id.slice(prefix.length))
          );
        })
        .map((rule) => rule.id),
      [],
    );
    assert.deepEqual(
      ids.filter((id, index) => ids.indexOf(id) !== index),
      [],
    );
    assert.deepEqual(
      ids.filter((id) => retired.has(id)),
      [],
    );
  });

  it('gives every row a check or marks it review only', () => {
    assert.deepEqual(
      rows.filter((row) => row.check === '').map((row) => row.id),
      [],
    );
  });
});

describe('RuleChecksDocument', () => {
  it('reads the retired ids and treats a missing line as none', () => {
    assert.deepEqual(
      new RuleChecksDocument(
        'Retired ids: `claude.code.4`, `backend-testing.9`.\n',
      ).retired(),
      ['claude.code.4', 'backend-testing.9'],
    );
    assert.deepEqual(new RuleChecksDocument('# Rule checks\n').retired(), []);
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

  it('reads the id stored with each bullet, so a rule added in the middle shifts no other id', () => {
    const before = inventory.rulesOf(
      'backend-testing',
      '## Location\n\n- One. <!-- id: backend-testing.1 -->\n- Two. <!-- id: backend-testing.2 -->\n',
    );
    const after = inventory.rulesOf(
      'backend-testing',
      '## Location\n\n- One. <!-- id: backend-testing.1 -->\n- New. <!-- id: backend-testing.3 -->\n- Two. <!-- id: backend-testing.2 -->\n',
    );
    const idOf = (rules, text) => rules.find((rule) => rule.text === text).id;
    assert.equal(idOf(after, 'Two.'), idOf(before, 'Two.'));
    assert.deepEqual(
      after.map((rule) => rule.id),
      ['backend-testing.1', 'backend-testing.3', 'backend-testing.2'],
    );
  });

  it('leaves the id undefined on a bullet that stores none', () => {
    assert.deepEqual(
      inventory
        .rulesOf('CLAUDE.md', '## Code\n\n- Bare rule.\n')
        .map((rule) => [rule.text, rule.id]),
      [['Bare rule.', undefined]],
    );
  });

  it('prefixes the ids of CLAUDE.md with their section and those of a skill with its name', () => {
    assert.equal(
      RuleInventory.prefixOf('CLAUDE.md', 'Way of working: pstack'),
      'claude.way-of-working-pstack',
    );
    assert.equal(
      RuleInventory.prefixOf('backend-testing', 'Location'),
      'backend-testing',
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
