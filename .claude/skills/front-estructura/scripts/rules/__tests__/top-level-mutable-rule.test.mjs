import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TopLevelMutableRule } from '../top-level-mutable-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const LIB = 'front/packages/ui/lib/src/a.dart';

describe('TopLevelMutableRule', () => {
  it('marca una variable mutable de nivel superior', () => {
    const rule = new TopLevelMutableRule();
    const [violation, ...rest] = rule.check(LIB, 'var counter = 0;');
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.TOP_LEVEL_MUTABLE);
    assert.equal(violation.file, LIB);
  });

  it('deja pasar final y const de nivel superior', () => {
    const rule = new TopLevelMutableRule();
    assert.deepEqual(rule.check(LIB, 'final x = 1;'), []);
    assert.deepEqual(rule.check(LIB, 'const y = 2;'), []);
  });

  it('deja pasar un miembro de clase indentado', () => {
    const rule = new TopLevelMutableRule();
    assert.deepEqual(rule.check(LIB, 'class A {\n  int count = 0;\n}'), []);
  });
});
