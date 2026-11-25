import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PatternRule } from '../pattern-rule.mjs';

const FILE = 'front/packages/ui/lib/src/a.dart';

class FooRule extends PatternRule {
  constructor() {
    super('foo', 'no foo', /\bfoo\(\s*'/);
  }

  appliesTo(_file) {
    return true;
  }
}

describe('PatternRule', () => {
  it('does not flag a file without matches', () => {
    assert.deepEqual(new FooRule().check(FILE, 'bar();\nbaz();'), []);
  });

  it('flags the line where each match starts', () => {
    const text = ['bar();', "foo('a');", 'baz();', "foo('b');"].join('\n');
    const violations = new FooRule().check(FILE, text);
    assert.deepEqual(
      violations.map((v) => v.line),
      [2, 4],
    );
    assert.equal(violations[0].ruleId, 'foo');
    assert.equal(violations[0].file, FILE);
  });

  it('catches a match that dart format split across lines', () => {
    const text = ['bar();', 'foo(', "  'a',", ');'].join('\n');
    assert.deepEqual(
      new FooRule().check(FILE, text).map((v) => v.line),
      [2],
    );
  });

  it('counts a line with two matches only once', () => {
    assert.equal(new FooRule().check(FILE, "foo('a'); foo('b');").length, 1);
  });

  it('ignores lines that are only a comment', () => {
    const text = ["// foo('a');", "/// foo('b');", "foo('c');"].join('\n');
    assert.deepEqual(
      new FooRule().check(FILE, text).map((v) => v.line),
      [3],
    );
  });

  it('gives the same result when checking two files in a row', () => {
    const rule = new FooRule();
    assert.equal(rule.check(FILE, "foo('a');").length, 1);
    assert.equal(rule.check(FILE, "foo('a');").length, 1);
  });
});
