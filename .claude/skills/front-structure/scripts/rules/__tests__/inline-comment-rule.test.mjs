import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InlineCommentRule } from '../inline-comment-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const FILE = 'front/packages/ui/lib/src/a.dart';

describe('InlineCommentRule', () => {
  it('flags a line comment with its line', () => {
    const [violation, ...rest] = new InlineCommentRule().check(
      FILE,
      'class A {}\n  // explains\nclass B {}\n',
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.INLINE_COMMENT);
    assert.equal(violation.line, 2);
  });

  it('flags a trailing comment and a block comment', () => {
    const violations = new InlineCommentRule().check(
      FILE,
      'final a = 1; // why\n/* old */\nfinal b = /** doc */ 2;\n',
    );
    assert.deepEqual(
      violations.map((v) => v.line),
      [1, 2, 3],
    );
  });

  it('flags four slashes, which are not documentation', () => {
    assert.equal(new InlineCommentRule().check(FILE, '//// x\n').length, 1);
  });

  it('allows documentation and analyzer directives', () => {
    const text =
      '// ignore_for_file: deprecated_member_use\n/// A class.\nclass A {\n  // ignore: unused_field\n  final _a = 1;\n}\n';
    assert.deepEqual(new InlineCommentRule().check(FILE, text), []);
  });

  it('ignores comment markers inside strings and interpolations', () => {
    const text = [
      "final a = 'http://example.com';",
      'final b = "/* not a comment */";',
      "final c = r'// raw';",
      "final d = '''",
      '// inside a triple string',
      "''';",
      "final e = '${{'k': '//'}['k']}';",
    ].join('\n');
    assert.deepEqual(new InlineCommentRule().check(FILE, text), []);
  });

  it('finds a comment inside the code of an interpolation', () => {
    const violations = new InlineCommentRule().check(
      FILE,
      "final a = '${1 /* x */ + 1}';\n",
    );
    assert.equal(violations.length, 1);
  });

  it('skips generated files', () => {
    assert.deepEqual(
      new InlineCommentRule().check(
        FILE,
        '// GENERATED, do not edit.\n// Source: x\n',
      ),
      [],
    );
  });

  it('applies to every Dart file, tests included', () => {
    const rule = new InlineCommentRule();
    assert.equal(rule.appliesTo('front/apps/web/test/a_test.dart'), true);
    assert.equal(rule.appliesTo('front/packages/ui/pubspec.yaml'), false);
  });
});
