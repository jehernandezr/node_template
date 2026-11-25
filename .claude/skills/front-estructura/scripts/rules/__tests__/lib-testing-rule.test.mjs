import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LibTestingRule } from '../lib-testing-rule.mjs';
import { RuleId } from '../rule-id.mjs';

describe('LibTestingRule', () => {
  it('applies to lib/testing.dart and to testing folders inside lib', () => {
    const rule = new LibTestingRule();
    assert.equal(rule.appliesTo('front/packages/ui/lib/testing.dart'), true);
    assert.equal(
      rule.appliesTo('front/packages/ui/lib/src/testing/a.dart'),
      true,
    );
    assert.equal(rule.appliesTo('front/packages/ui/lib/src/a.dart'), false);
  });

  it('flags the test doubles file in lib/testing', () => {
    const rule = new LibTestingRule();
    const [violation, ...rest] = rule.check(
      'front/packages/ui/lib/testing.dart',
      '',
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.LIB_TESTING);
    assert.equal(violation.file, 'front/packages/ui/lib/testing.dart');
  });
});
