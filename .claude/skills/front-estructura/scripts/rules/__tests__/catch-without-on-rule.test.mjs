import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CatchWithoutOnRule } from '../catch-without-on-rule.mjs';
import { RuleId } from '../rule-id.mjs';

describe('CatchWithoutOnRule', () => {
  it('se aplica a las librerías de Dart salvo los contratos generados', () => {
    const rule = new CatchWithoutOnRule();
    assert.equal(
      rule.appliesTo('front/packages/shell_core/lib/src/a.dart'),
      true,
    );
    assert.equal(
      rule.appliesTo('front/packages/contracts/lib/src/a.dart'),
      false,
    );
    assert.equal(
      rule.appliesTo('front/packages/shell_core/test/a_test.dart'),
      false,
    );
  });

  it('marca un catch sin on', () => {
    const rule = new CatchWithoutOnRule();
    const file = 'front/packages/shell_core/lib/src/a.dart';
    const text = ['try {', '  run();', '} catch (e) {', '}'].join('\n');
    const [violation, ...rest] = rule.check(file, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.CATCH_WITHOUT_ON);
    assert.equal(violation.file, file);
    assert.equal(violation.line, 3);
  });

  it('marca un catch con stack trace sin on', () => {
    const rule = new CatchWithoutOnRule();
    const text = '} catch (error, stack) {';
    const [violation, ...rest] = rule.check(
      'front/packages/shell_core/lib/src/a.dart',
      text,
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.line, 1);
  });

  it('acepta un catch con on de tipo simple', () => {
    const rule = new CatchWithoutOnRule();
    const text = '} on Exception catch (e) {';
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('acepta un catch con on de tipo genérico', () => {
    const rule = new CatchWithoutOnRule();
    const text = '} on Map<String, int> catch (e) {';
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('no confunde catchError con catch', () => {
    const rule = new CatchWithoutOnRule();
    const text = 'future.catchError((e) {});';
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('ignora un catch dentro de un comentario de documentación', () => {
    const rule = new CatchWithoutOnRule();
    const text = '/// } catch (error) {';
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('acepta un catch-all marcado en la línea anterior', () => {
    const rule = new CatchWithoutOnRule();
    const text = ['// catch-all: reporta y sigue', '} catch (e) {'].join('\n');
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('marca un catch-all con la marca sin motivo', () => {
    const rule = new CatchWithoutOnRule();
    const text = ['// catch-all:', '} catch (e) {'].join('\n');
    const [violation, ...rest] = rule.check(
      'front/packages/shell_core/lib/src/a.dart',
      text,
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.line, 2);
  });

  it('marca un catch-all cuya marca no está en la línea anterior', () => {
    const rule = new CatchWithoutOnRule();
    const text = ['// catch-all: reporta y sigue', '', '} catch (e) {'].join(
      '\n',
    );
    const [violation, ...rest] = rule.check(
      'front/packages/shell_core/lib/src/a.dart',
      text,
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.line, 3);
  });
});
