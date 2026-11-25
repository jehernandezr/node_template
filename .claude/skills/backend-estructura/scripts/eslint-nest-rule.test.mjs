// Test for the layout/no-nest-outside-nest-folder rule in backend/eslint.config.mjs.
// Run with `node --test .claude/skills/backend-estructura/scripts/*.test.mjs`.
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { layoutPlugin } from '../../../../backend/eslint.config.mjs';

const RULE = 'layout/no-nest-outside-nest-folder';

class NestRuleHarness {
  constructor() {
    this.linter = new Linter({ configType: 'flat' });
  }

  messagesFor(filename, code) {
    return this.linter
      .verify(
        code,
        [
          {
            files: ['**/*.ts'],
            languageOptions: { parser: tsParser },
            plugins: { layout: layoutPlugin },
            rules: { [RULE]: 'error' },
          },
        ],
        { filename },
      )
      .filter((message) => message.ruleId === RULE);
  }
}

describe(RULE, () => {
  const harness = new NestRuleHarness();
  const core = join(
    process.cwd(),
    'backend/libs/platform/cache/src/cache.service.ts',
  );

  it('reports @nestjs/* in the core of a library', () => {
    const messages = harness.messagesFor(
      core,
      "import { Injectable } from '@nestjs/common';\n",
    );

    assert.equal(messages.length, 1);
  });

  it('reports a /nest sub-entry of another library', () => {
    const messages = harness.messagesFor(
      core,
      "import { SchedulingModule } from '@platform/scheduling/nest';\n",
    );

    assert.equal(messages.length, 1);
  });

  it('reports re-exports and dynamic imports', () => {
    const messages = harness.messagesFor(
      core,
      "export * from '@nestjs/common';\nconst lazy = import('@nestjs/core');\n",
    );

    assert.equal(messages.length, 2);
  });

  it('accepts @nestjs/* inside src/nest', () => {
    const messages = harness.messagesFor(
      join(
        process.cwd(),
        'backend/libs/platform/cache/src/nest/cache.module.ts',
      ),
      "import { Module } from '@nestjs/common';\n",
    );

    assert.equal(messages.length, 0);
  });

  it('accepts imports that are not from NestJS', () => {
    const messages = harness.messagesFor(
      core,
      "import { Clock } from '@platform/kernel';\nimport { Test } from '@platform/kernel/test-utils';\n",
    );

    assert.equal(messages.length, 0);
  });

  it('does not apply to an app', () => {
    const messages = harness.messagesFor(
      join(process.cwd(), 'backend/apps/identity/src/app.module.ts'),
      "import { Module } from '@nestjs/common';\n",
    );

    assert.equal(messages.length, 0);
  });
});
