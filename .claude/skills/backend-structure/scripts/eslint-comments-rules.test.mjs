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

describe('comments/require-public-jsdoc, cases that escaped earlier reviews', () => {
  it('asks a public getter for a JSDoc', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass('  get total(): number {\n    return 1;\n  }'),
      ),
      ['methodMissing'],
    );
  });

  it('asks a static arrow-function property for a JSDoc', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass('  static readonly of = (a: number): number => a;'),
      ),
      ['methodMissing'],
    );
  });

  it('reads the JSDoc of an overloaded method from its first signature only', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass(
          '  /**\n   * Formats a value for the logs.\n   * @param a Value.\n   * @returns Text.\n   */\n  format(a: string): string;\n  format(a: number): string;\n  format(a: unknown): string {\n    return String(a);\n  }',
        ),
      ),
      [],
    );
  });

  it('asks an undocumented overloaded method for one JSDoc, not one per signature', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass(
          '  format(a: string): string;\n  format(a: number): string;\n  format(a: unknown): string {\n    return String(a);\n  }',
        ),
      ),
      ['methodMissing'],
    );
  });

  it('moves the JSDoc of an overloaded method from its implementation to its first signature', () => {
    assert.deepEqual(
      harness.reported(
        documentedClass(
          '  format(a: string): string;\n  format(a: number): string;\n  /**\n   * Formats a value for the logs.\n   * @param a Value.\n   * @returns Text.\n   */\n  format(a: unknown): string {\n    return String(a);\n  }',
        ),
      ),
      ['overloadDocPlacement'],
    );
  });

  it('rejects an override doc on a repository that only says it calls the real one', () => {
    assert.deepEqual(
      harness.reported(
        '/** Reads invoices. */\nexport abstract class InvoiceRepository {\n  /**\n   * Finds an invoice that is still open.\n   * @param id Invoice.\n   * @returns The invoice.\n   */\n  abstract find(id: string): string;\n}\n/** Holds each transaction until the others arrive, to force a race. */\nexport class RendezvousInvoiceRepository extends InvoiceRepository {\n  /** Finds in the real repository. */\n  override find(id: string): string {\n    return id;\n  }\n}\n',
      ),
      ['summaryDelegates'],
    );
  });

  it('rejects a facade summary that only says each method runs a use case', () => {
    assert.deepEqual(
      harness.reported(
        "/** Plans of the catalog. */\nexport abstract class PlansFacade {}\n/** `PlansFacade` for callers in the same process: each method runs the module's use case or repository. */\nexport class LocalPlansFacade extends PlansFacade {}\n",
      ),
      ['summaryDelegates'],
    );
  });

  it('rejects a summary that only repeats the method and its parameters', () => {
    assert.deepEqual(
      harness.reported(
        '/** Administration of the groups of a tenant. */\nexport class ManageGroups {\n  /**\n   * Lists the groups of a tenant.\n   * @param tenantId Tenant to read.\n   * @returns Its groups.\n   */\n  list(tenantId: string): string[] {\n    return [tenantId];\n  }\n}\n',
      ),
      ['summaryRepeatsName'],
    );
  });

  it('accepts a summary that shows a key format, even with the words of the name', () => {
    assert.deepEqual(
      harness.reported(
        '/** Names the Valkey entries of the revocation state. */\nexport class AuthStateKey {\n  /**\n   * `auth:epoch:user:{userId}`.\n   * @param userId User.\n   * @returns The key.\n   */\n  static userEpoch(userId: string): string {\n    return userId;\n  }\n}\n',
      ),
      [],
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
