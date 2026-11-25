import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { L10nInterpolationRule } from '../l10n-interpolation-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const LIB = 'front/microfrontends/tasks/lib/src/screens/a.dart';

describe('L10nInterpolationRule', () => {
  it('applies to a microfrontend lib and to the ui lib', () => {
    const rule = new L10nInterpolationRule();
    assert.equal(rule.appliesTo(LIB), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/lib/src/data/a.dart'),
      true,
    );
    assert.equal(rule.appliesTo('front/packages/ui/lib/src/a.dart'), true);
  });

  it('does not apply to tokens or to microfrontend tests', () => {
    const rule = new L10nInterpolationRule();
    assert.equal(rule.appliesTo('front/packages/tokens/lib/src/a.dart'), false);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/test/a_test.dart'),
      false,
    );
  });

  it('lets a text with parameterized ARB keys through', () => {
    const rule = new L10nInterpolationRule();
    const text = [
      'final a = 1;',
      'Text(l10n.errorCodeLabel(code));',
      'return a;',
    ].join('\n');
    assert.deepEqual(rule.check(LIB, text), []);
  });

  it('flags the interpolation with : on its line', () => {
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

  it('flags the interpolation with · between two keys', () => {
    const rule = new L10nInterpolationRule();
    assert.equal(rule.check(LIB, "Text('${l10n.a} · ${l10n.b}');").length, 1);
  });

  it('does not flag an l10n interpolation without a separator', () => {
    const rule = new L10nInterpolationRule();
    assert.deepEqual(rule.check(LIB, "Text('${l10n.a}');"), []);
  });

  it('does not flag an l10n call without interpolation', () => {
    const rule = new L10nInterpolationRule();
    assert.deepEqual(rule.check(LIB, 'l10n.a(code)'), []);
  });

  it('ignores a comment line with the pattern', () => {
    const rule = new L10nInterpolationRule();
    assert.deepEqual(rule.check(LIB, "// '${l10n.a}: x'"), []);
  });
});
