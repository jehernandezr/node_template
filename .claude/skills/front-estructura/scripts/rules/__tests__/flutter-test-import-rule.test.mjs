import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FlutterTestImportRule } from '../flutter-test-import-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const LIB = 'front/packages/ui/lib/src/a.dart';

describe('FlutterTestImportRule', () => {
  it('applies to a package lib, not to test_utils', () => {
    const rule = new FlutterTestImportRule();
    assert.equal(rule.appliesTo(LIB), true);
    assert.equal(
      rule.appliesTo('front/packages/test_utils/lib/src/a.dart'),
      false,
    );
  });

  it('flags a flutter_test import in lib', () => {
    const rule = new FlutterTestImportRule();
    const text = [
      "import 'package:flutter/widgets.dart';",
      "import 'package:flutter_test/flutter_test.dart';",
    ].join('\n');
    const [violation, ...rest] = rule.check(LIB, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.FLUTTER_TEST_IMPORT);
    assert.equal(violation.file, LIB);
  });

  it('lets a widgets import through', () => {
    const rule = new FlutterTestImportRule();
    assert.deepEqual(
      rule.check(LIB, "import 'package:flutter/widgets.dart';"),
      [],
    );
  });
});
