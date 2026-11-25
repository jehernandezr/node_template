import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TestInLibRule } from '../test-in-lib-rule.mjs';
import { RuleId } from '../rule-id.mjs';

describe('TestInLibRule', () => {
  it('applies to tests inside lib, not to test/ or to lib code', () => {
    const rule = new TestInLibRule();
    assert.equal(rule.appliesTo('front/packages/ui/lib/src/a_test.dart'), true);
    assert.equal(rule.appliesTo('front/packages/ui/test/a_test.dart'), false);
    assert.equal(rule.appliesTo('front/packages/ui/lib/src/a.dart'), false);
  });

  it('flags a test inside lib', () => {
    const rule = new TestInLibRule();
    const [violation, ...rest] = rule.check(
      'front/packages/ui/lib/src/a_test.dart',
      '',
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.TEST_IN_LIB);
    assert.equal(violation.file, 'front/packages/ui/lib/src/a_test.dart');
  });
});
