import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TextLiteralRule } from '../text-literal-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const SCREEN = 'front/microfrontends/tasks/lib/src/screens/a.dart';

describe('TextLiteralRule', () => {
  it('se aplica a las pantallas de un microfrontend, no a sus datos', () => {
    const rule = new TextLiteralRule();
    assert.equal(rule.appliesTo(SCREEN), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/lib/src/data/a.dart'),
      false,
    );
  });

  it('deja pasar un texto que sale de l10n', () => {
    const rule = new TextLiteralRule();
    const text = ['final a = 1;', 'Text(l10n.x);', 'return a;'].join('\n');
    assert.deepEqual(rule.check(SCREEN, text), []);
  });

  it('marca un Text con literal solo en su línea', () => {
    const rule = new TextLiteralRule();
    const text = ['final a = 1;', 'final b = 2;', "Text('x'),"].join('\n');
    const [violation, ...rest] = rule.check(SCREEN, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.TEXT_LITERAL);
    assert.equal(violation.file, SCREEN);
    assert.equal(violation.line, 3);
  });

  it('marca un literal que dart format dejó en la línea siguiente', () => {
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

  it('no marca un Text partido en líneas cuyo argumento sale de l10n', () => {
    const rule = new TextLiteralRule();
    const text = ['Text(', '  l10n.title,', '  style: style,', ')'].join('\n');
    assert.deepEqual(rule.check(SCREEN, text), []);
  });

  it('marca const Text con comillas dobles', () => {
    const rule = new TextLiteralRule();
    const [violation, ...rest] = rule.check(SCREEN, 'const Text("x")');
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.TEXT_LITERAL);
    assert.equal(violation.line, 1);
  });

  it('marca un literal con interpolación de texto de usuario', () => {
    const rule = new TextLiteralRule();
    assert.equal(rule.check(SCREEN, "Text('Hola $name')").length, 1);
    assert.equal(rule.check(SCREEN, "Text('${l10n.a}: x')").length, 1);
  });

  it('no marca un literal que solo interpola datos', () => {
    const rule = new TextLiteralRule();
    assert.deepEqual(rule.check(SCREEN, "Text('$count')"), []);
    assert.deepEqual(rule.check(SCREEN, "Text('${saga.type}')"), []);
  });

  it('no marca SelectableText ni Text sin literal', () => {
    const rule = new TextLiteralRule();
    assert.deepEqual(rule.check(SCREEN, "SelectableText('x')"), []);
    assert.deepEqual(rule.check(SCREEN, 'Text(l10n.x)'), []);
  });

  it('ignora una línea de comentario con el patrón', () => {
    const rule = new TextLiteralRule();
    assert.deepEqual(rule.check(SCREEN, "// Text('x')"), []);
  });
});
