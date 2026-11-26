import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { commentsPlugin } from '../../../../backend/eslint.comments.mjs';

/** Lints a snippet with the backend comment rules and no type information. */
class CommentRulesHarness {
  constructor() {
    this.linter = new Linter({ configType: 'flat' });
  }

  /**
   * Lists the message ids the comment rules report for a TypeScript snippet.
   * @param {string} code Source to lint.
   * @returns {string[]} The message id of each report, in order.
   */
  reported(code) {
    return this.linter
      .verify(
        code,
        [
          {
            files: ['**/*.ts'],
            languageOptions: { parser: tsParser },
            plugins: { comments: commentsPlugin },
            rules: {
              'comments/no-inline-comments': 'error',
              'comments/require-public-jsdoc': 'error',
            },
          },
        ],
        { filename: 'backend/libs/platform/x/src/adder.ts' },
      )
      .filter((message) => message.ruleId?.startsWith('comments/'))
      .map((message) => message.messageId);
  }
}

const harness = new CommentRulesHarness();
const documentedClass = (body) =>
  `/** Adds numbers for the tests. */\nexport class Adder {\n${body}\n}\n`;

describe('comments/require-public-jsdoc', () => {
  it('asks a public function-valued property for a JSDoc like a method', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass(
          '  readonly add = (a: number, b: number): number => a + b;',
        ),
      ),
      ['methodMissing'],
    );
  });

  it('asks for @returns when a method returns a value without a declared type', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass(
          '  /**\n   * Adds two numbers.\n   * @param a First.\n   * @param b Second.\n   */\n  add(a: number, b: number) {\n    return a + b;\n  }',
        ),
      ),
      ['returnsMissing'],
    );
  });

  it('does not ask for @returns when the method only returns early', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass(
          '  /**\n   * Logs a positive number.\n   * @param a Number.\n   */\n  log(a: number) {\n    if (a < 0) {\n      return;\n    }\n    console.log(a);\n  }',
        ),
      ),
      [],
    );
  });

  it('rejects a summary that says nothing specific', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass('  /** Does the work. */\n  sum(): void {}'),
      ),
      ['summaryVague'],
    );
  });

  it('rejects a getter doc that only repeats the getter and its class', () => {
    assert.deepEqual(
      harness.reported(
        '/** A signed-in browser or app. */\nexport class Session {\n  /** Id of the session. */\n  get id(): string {\n    return "s";\n  }\n}\n',
      ),
      ['summaryRepeatsName'],
    );
  });

  it('rejects a field doc that only repeats the name of the field', () => {
    assert.deepEqual(
      harness.reported(
        '/** What a tenant asked for. */\nexport interface Order {\n  /** Id of the tenant. */\n  readonly tenantId: string;\n  /** Last day the order can still be cancelled. */\n  readonly cancelBy: string;\n}\n',
      ),
      ['fieldRepeatsName'],
    );
  });
});

describe('comments/no-inline-comments', () => {
  it('treats a JSDoc block inside a method body as an inline comment', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass(
          '  /** Prints one. */\n  print(): void {\n    /** helper */\n    const fn = () => 1;\n    console.log(fn());\n  }',
        ),
      ),
      ['strayJsDoc'],
    );
  });

  it('accepts a JSDoc on a top-level function-valued constant', () => {
    assert.deepEqual(
      harness.reported(
        '/** Doubles a number for the examples. */\nexport const double = (a: number): number => a * 2;\n',
      ),
      [],
    );
  });

  it('rejects a line comment and accepts a directive with its reason', () => {
    assert.deepEqual(
      harness.reported(
        '// explains\nconst a = 1;\n// eslint-disable-next-line no-console -- the example prints\nconsole.log(a);\n',
      ),
      ['inline'],
    );
  });
});
