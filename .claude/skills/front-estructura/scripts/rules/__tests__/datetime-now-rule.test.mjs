import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DatetimeNowRule } from '../datetime-now-rule.mjs';
import { RuleId } from '../rule-id.mjs';

describe('DatetimeNowRule', () => {
  it('applies to Dart libraries except the clock file', () => {
    const rule = new DatetimeNowRule();
    assert.equal(rule.appliesTo('front/packages/auth/lib/src/a.dart'), true);
    assert.equal(
      rule.appliesTo('front/packages/utils/lib/src/clock.dart'),
      false,
    );
    assert.equal(rule.appliesTo('front/packages/auth/test/a_test.dart'), false);
  });

  it('flags DateTime.now() in the logic', () => {
    const rule = new DatetimeNowRule();
    const file = 'front/packages/auth/lib/src/a.dart';
    const text = ['class A {', '  final now = DateTime.now();', '}'].join('\n');
    const [violation, ...rest] = rule.check(file, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.DATETIME_NOW);
    assert.equal(violation.file, file);
    assert.equal(violation.line, 2);
  });

  it('accepts time read from the injected Clock', () => {
    const rule = new DatetimeNowRule();
    const text = ['class A {', '  final now = clock.now();', '}'].join('\n');
    assert.deepEqual(
      rule.check('front/packages/auth/lib/src/a.dart', text),
      [],
    );
  });

  it('ignores DateTime.now() inside comments', () => {
    const rule = new DatetimeNowRule();
    const text = '// DateTime.now()';
    assert.deepEqual(
      rule.check('front/packages/auth/lib/src/a.dart', text),
      [],
    );
  });
});
