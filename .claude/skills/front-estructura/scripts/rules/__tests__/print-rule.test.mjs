import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrintRule } from '../print-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const LIB = 'front/packages/ui/lib/src/a.dart';

describe('PrintRule', () => {
  it('flags print at column 0', () => {
    const rule = new PrintRule();
    const [violation, ...rest] = rule.check(LIB, "print('x');");
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.PRINT_CALL);
    assert.equal(violation.file, LIB);
  });

  it('flags indented print', () => {
    const rule = new PrintRule();
    const [violation, ...rest] = rule.check(LIB, "    print('x');");
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.PRINT_CALL);
  });

  it('lets debugPrint through', () => {
    const rule = new PrintRule();
    assert.deepEqual(rule.check(LIB, "debugPrint('x');"), []);
  });
});
