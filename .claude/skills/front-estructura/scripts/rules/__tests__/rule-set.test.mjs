import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RuleId } from '../rule-id.mjs';
import { RuleSet } from '../rule-set.mjs';

describe('RuleSet', () => {
  it('registra una regla por cada RuleId, sin repetir', () => {
    const ids = RuleSet.createDefault().map((rule) => rule.id);
    const expected = Object.values(RuleId);
    assert.equal(ids.length, new Set(ids).size);
    assert.deepEqual([...ids].sort(), [...expected].sort());
  });
});
