import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CatchWithoutOnRule } from '../catch-without-on-rule.mjs';
import { RuleId } from '../rule-id.mjs';

describe('CatchWithoutOnRule', () => {
  it('applies to Dart libraries except the generated contracts', () => {
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

  it('flags a catch without on', () => {
    const rule = new CatchWithoutOnRule();
    const file = 'front/packages/shell_core/lib/src/a.dart';
    const text = ['try {', '  run();', '} catch (e) {', '}'].join('\n');
    const [violation, ...rest] = rule.check(file, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.CATCH_WITHOUT_ON);
    assert.equal(violation.file, file);
    assert.equal(violation.line, 3);
  });

  it('flags a catch with a stack trace without on', () => {
    const rule = new CatchWithoutOnRule();
    const text = '} catch (error, stack) {';
    const [violation, ...rest] = rule.check(
      'front/packages/shell_core/lib/src/a.dart',
      text,
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.line, 1);
  });

  it('accepts a catch with on of a simple type', () => {
    const rule = new CatchWithoutOnRule();
    const text = '} on Exception catch (e) {';
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('accepts a catch with on of a generic type', () => {
    const rule = new CatchWithoutOnRule();
    const text = '} on Map<String, int> catch (e) {';
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('does not confuse catchError with catch', () => {
    const rule = new CatchWithoutOnRule();
    const text = 'future.catchError((e) {});';
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('ignores a catch inside a documentation comment', () => {
    const rule = new CatchWithoutOnRule();
    const text = '/// } catch (error) {';
    assert.deepEqual(
      rule.check('front/packages/shell_core/lib/src/a.dart', text),
      [],
    );
  });

  it('accepts a catch-all declared with on Object', () => {
    const rule = new CatchWithoutOnRule();
    assert.deepEqual(
      rule.check(
        'front/packages/shell_core/lib/src/a.dart',
        '} on Object catch (e) {',
      ),
      [],
    );
  });

  it('flags a catch-all preceded by a comment', () => {
    const rule = new CatchWithoutOnRule();
    const text = ['// catch-all: reports and continues', '} catch (e) {'].join(
      '\n',
    );
    const [violation, ...rest] = rule.check(
      'front/packages/shell_core/lib/src/a.dart',
      text,
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.line, 2);
  });
});
