import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HardcodedColorRule } from '../hardcoded-color-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const SCREEN = 'front/microfrontends/tasks/lib/src/screens/a.dart';

describe('HardcodedColorRule', () => {
  it('se aplica al lib de un microfrontend', () => {
    const rule = new HardcodedColorRule();
    assert.equal(rule.appliesTo(SCREEN), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/lib/src/data/a.dart'),
      true,
    );
  });

  it('no se aplica a tokens ni a pruebas de microfrontend', () => {
    const rule = new HardcodedColorRule();
    assert.equal(rule.appliesTo('front/packages/tokens/lib/src/a.dart'), false);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/test/a_test.dart'),
      false,
    );
  });

  it('deja pasar un texto sin colores hardcodeados', () => {
    const rule = new HardcodedColorRule();
    const text = ['import "tokens.dart";', 'final a = 1;', 'return a;'].join(
      '\n',
    );
    assert.deepEqual(rule.check(SCREEN, text), []);
  });

  it('marca Color(0x) solo en la línea donde aparece', () => {
    const rule = new HardcodedColorRule();
    const text = [
      'final a = 1;',
      'final b = 2;',
      'final c = Color(0xFF112233);',
    ].join('\n');
    const [violation, ...rest] = rule.check(SCREEN, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.HARDCODED_COLOR);
    assert.equal(violation.file, SCREEN);
    assert.equal(violation.line, 3);
  });

  it('marca Colors. con su línea', () => {
    const rule = new HardcodedColorRule();
    const text = ['final a = 1;', 'final b = 2;', 'color: Colors.red,'].join(
      '\n',
    );
    const [violation, ...rest] = rule.check(SCREEN, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.HARDCODED_COLOR);
    assert.equal(violation.file, SCREEN);
    assert.equal(violation.line, 3);
  });

  it('ignora una línea de comentario con el patrón', () => {
    const rule = new HardcodedColorRule();
    assert.deepEqual(rule.check(SCREEN, '// Colors.red'), []);
    assert.deepEqual(rule.check(SCREEN, '/// Color(0xFF000000)'), []);
  });

  it('no marca los tokens propios ni Color.fromARGB', () => {
    const rule = new HardcodedColorRule();
    assert.deepEqual(rule.check(SCREEN, 'color: AppColors.primary,'), []);
    assert.deepEqual(
      rule.check(SCREEN, 'color: theme.colorScheme.primary,'),
      [],
    );
    assert.deepEqual(
      rule.check(SCREEN, 'final c = Color.fromARGB(1, 2, 3, 4);'),
      [],
    );
  });
});
