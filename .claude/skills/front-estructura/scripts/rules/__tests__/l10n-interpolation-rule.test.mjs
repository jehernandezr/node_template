import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { L10nInterpolationRule } from '../l10n-interpolation-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const LIB = 'front/microfrontends/tasks/lib/src/screens/a.dart';

describe('L10nInterpolationRule', () => {
  it('se aplica al lib de un microfrontend y al lib de ui', () => {
    const rule = new L10nInterpolationRule();
    assert.equal(rule.appliesTo(LIB), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/lib/src/data/a.dart'),
      true,
    );
    assert.equal(rule.appliesTo('front/packages/ui/lib/src/a.dart'), true);
  });

  it('no se aplica a tokens ni a pruebas de microfrontend', () => {
    const rule = new L10nInterpolationRule();
    assert.equal(rule.appliesTo('front/packages/tokens/lib/src/a.dart'), false);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/test/a_test.dart'),
      false,
    );
  });

  it('deja pasar un texto con claves ARB con parámetros', () => {
    const rule = new L10nInterpolationRule();
    const text = [
      'final a = 1;',
      'Text(l10n.errorCodeLabel(code));',
      'return a;',
    ].join('\n');
    assert.deepEqual(rule.check(LIB, text), []);
  });

  it('marca la interpolación con : en su línea', () => {
    const rule = new L10nInterpolationRule();
    const text = [
      'final a = 1;',
      'final b = 2;',
      "Text('${l10n.errorCodeLabel}: $code');",
    ].join('\n');
    const [violation, ...rest] = rule.check(LIB, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.L10N_INTERPOLATION);
    assert.equal(violation.file, LIB);
    assert.equal(violation.line, 3);
  });

  it('marca la interpolación con · entre dos claves', () => {
    const rule = new L10nInterpolationRule();
    assert.equal(rule.check(LIB, "Text('${l10n.a} · ${l10n.b}');").length, 1);
  });

  it('no marca una interpolación de l10n sin separador', () => {
    const rule = new L10nInterpolationRule();
    assert.deepEqual(rule.check(LIB, "Text('${l10n.a}');"), []);
  });

  it('no marca una llamada a l10n sin interpolación', () => {
    const rule = new L10nInterpolationRule();
    assert.deepEqual(rule.check(LIB, 'l10n.a(code)'), []);
  });

  it('ignora una línea de comentario con el patrón', () => {
    const rule = new L10nInterpolationRule();
    assert.deepEqual(rule.check(LIB, "// '${l10n.a}: x'"), []);
  });
});
