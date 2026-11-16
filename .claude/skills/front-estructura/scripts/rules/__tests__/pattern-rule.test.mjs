import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PatternRule } from '../pattern-rule.mjs';

const FILE = 'front/packages/ui/lib/src/a.dart';

class FooRule extends PatternRule {
  constructor() {
    super('foo', 'sin foo', /\bfoo\(\s*'/);
  }

  appliesTo(_file) {
    return true;
  }
}

describe('PatternRule', () => {
  it('no marca un archivo sin coincidencias', () => {
    assert.deepEqual(new FooRule().check(FILE, 'bar();\nbaz();'), []);
  });

  it('marca la línea donde empieza cada coincidencia', () => {
    const text = ['bar();', "foo('a');", 'baz();', "foo('b');"].join('\n');
    const violations = new FooRule().check(FILE, text);
    assert.deepEqual(
      violations.map((v) => v.line),
      [2, 4],
    );
    assert.equal(violations[0].ruleId, 'foo');
    assert.equal(violations[0].file, FILE);
  });

  it('atrapa una coincidencia que dart format partió en varias líneas', () => {
    const text = ['bar();', 'foo(', "  'a',", ');'].join('\n');
    assert.deepEqual(
      new FooRule().check(FILE, text).map((v) => v.line),
      [2],
    );
  });

  it('cuenta una sola vez una línea con dos coincidencias', () => {
    assert.equal(new FooRule().check(FILE, "foo('a'); foo('b');").length, 1);
  });

  it('ignora las líneas que son solo comentario', () => {
    const text = ["// foo('a');", "/// foo('b');", "foo('c');"].join('\n');
    assert.deepEqual(
      new FooRule().check(FILE, text).map((v) => v.line),
      [3],
    );
  });

  it('da el mismo resultado al revisar dos archivos seguidos', () => {
    const rule = new FooRule();
    assert.equal(rule.check(FILE, "foo('a');").length, 1);
    assert.equal(rule.check(FILE, "foo('a');").length, 1);
  });
});
