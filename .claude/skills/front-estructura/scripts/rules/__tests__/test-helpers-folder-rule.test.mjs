import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TestHelpersFolderRule } from '../test-helpers-folder-rule.mjs';
import { RuleId } from '../rule-id.mjs';

describe('TestHelpersFolderRule', () => {
  it('applies to test helpers and support, not to test/utils', () => {
    const rule = new TestHelpersFolderRule();
    assert.equal(rule.appliesTo('front/packages/ui/test/helpers/a.dart'), true);
    assert.equal(rule.appliesTo('front/packages/ui/test/support/a.dart'), true);
    assert.equal(rule.appliesTo('front/packages/ui/test/utils/a.dart'), false);
  });

  it('flags any file in a helpers folder without a line', () => {
    const rule = new TestHelpersFolderRule();
    const [violation, ...rest] = rule.check(
      'front/packages/ui/test/helpers/a.dart',
      '',
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.TEST_HELPERS_FOLDER);
    assert.equal(violation.file, 'front/packages/ui/test/helpers/a.dart');
    assert.equal(violation.line, null);
  });
});
