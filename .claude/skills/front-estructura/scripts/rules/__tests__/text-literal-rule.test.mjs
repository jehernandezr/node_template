import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TextLiteralRule } from '../text-literal-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const SCREEN = 'front/microfrontends/tasks/lib/src/screens/a.dart';

describe('TextLiteralRule', () => {
  it("applies to a microfrontend's screens, not to its data", () => {
    const rule = new TextLiteralRule();
    assert.equal(rule.appliesTo(SCREEN), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/lib/src/data/a.dart'),
      false,
    );
  });

  it('lets a text that comes from l10n through', () => {
    const rule = new TextLiteralRule();
    const text = ['final a = 1;', 'Text(l10n.x);', 'return a;'].join('\n');
    assert.deepEqual(rule.check(SCREEN, text), []);
  });

  it('flags a Text with a literal only on its line', () => {
    const rule = new TextLiteralRule();
    const text = ['final a = 1;', 'final b = 2;', "Text('x'),"].join('\n');
    const [violation, ...rest] = rule.check(SCREEN, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.TEXT_LITERAL);
    assert.equal(violation.file, SCREEN);
    assert.equal(violation.line, 3);
  });

  it('flags a literal that dart format left on the next line', () => {
    const rule = new TextLiteralRule();
    const text = [
      'Column(',
      '  children: [',
      '    Text(',
      "      'Hola',",
    ].join('\n');
    const [violation, ...rest] = rule.check(SCREEN, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.line, 3);
  });

  it('does not flag a multi-line Text whose argument comes from l10n', () => {
    const rule = new TextLiteralRule();
    const text = ['Text(', '  l10n.title,', '  style: style,', ')'].join('\n');
    assert.deepEqual(rule.check(SCREEN, text), []);
  });

  it('flags const Text with double quotes', () => {
    const rule = new TextLiteralRule();
    const [violation, ...rest] = rule.check(SCREEN, 'const Text("x")');
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.TEXT_LITERAL);
    assert.equal(violation.line, 1);
  });

  it('flags a literal with user text interpolation', () => {
    const rule = new TextLiteralRule();
    assert.equal(rule.check(SCREEN, "Text('Hola $name')").length, 1);
    assert.equal(rule.check(SCREEN, "Text('${l10n.a}: x')").length, 1);
  });

  it('does not flag a literal that only interpolates data', () => {
    const rule = new TextLiteralRule();
    assert.deepEqual(rule.check(SCREEN, "Text('$count')"), []);
    assert.deepEqual(rule.check(SCREEN, "Text('${saga.type}')"), []);
  });

  it('does not flag SelectableText or Text without a literal', () => {
    const rule = new TextLiteralRule();
    assert.deepEqual(rule.check(SCREEN, "SelectableText('x')"), []);
    assert.deepEqual(rule.check(SCREEN, 'Text(l10n.x)'), []);
  });

  it('ignores a comment line with the pattern', () => {
    const rule = new TextLiteralRule();
    assert.deepEqual(rule.check(SCREEN, "// Text('x')"), []);
  });
});
