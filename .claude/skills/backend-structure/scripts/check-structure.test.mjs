/**
 * Tests for check-structure.mjs: each rule has a passing case and a failing case.
 * Run with `node --test .claude/skills/backend-structure/scripts/*.test.mjs`.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(
  dirname(fileURLToPath(import.meta.url)),
  'check-structure.mjs',
);

class TempRepository {
  constructor() {
    this.root = mkdtempSync(join(tmpdir(), 'check-structure-'));
    execFileSync('git', ['init', '--quiet'], { cwd: this.root });
  }

  write(file, content = 'export class Sample {}\n') {
    const full = join(this.root, file);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    return this;
  }

  check() {
    const result = spawnSync('node', [SCRIPT, '--all', this.root], {
      encoding: 'utf8',
    });
    return { status: result.status, output: result.stderr };
  }

  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

const LOOSE_FUNCTION = 'export function helper(): number {\n  return 1;\n}\n';

describe('check-structure.mjs', () => {
  let repo;
  beforeEach(() => {
    repo = new TempRepository();
  });
  afterEach(() => repo.dispose());

  describe('integration tests', () => {
    it('rejects a *.integration.spec.ts file', () => {
      repo.write(
        'backend/libs/platform/cache/src/__tests__/store.integration.spec.ts',
      );

      const { status, output } = repo.check();

      assert.equal(status, 1);
      assert.match(output, /store\.integration\.spec\.ts: .*\*\.int-spec\.ts/);
    });

    it('accepts *.int-spec.ts and *.spec.ts in __tests__', () => {
      repo
        .write('backend/libs/platform/cache/src/__tests__/store.int-spec.ts')
        .write('backend/libs/platform/cache/src/__tests__/store.spec.ts');

      assert.equal(repo.check().status, 0);
    });
  });

  describe('NestJS outside src/nest', () => {
    it('rejects @nestjs/* in the core of a platform library', () => {
      repo.write(
        'backend/libs/platform/cache/src/cache.service.ts',
        "import { Injectable } from '@nestjs/common';\nexport class CacheService {}\n",
      );

      const { status, output } = repo.check();

      assert.equal(status, 1);
      assert.match(output, /cache\.service\.ts: outside src\/nest\//);
    });

    it('rejects a @platform/<lib>/nest sub-entry in the core', () => {
      repo.write(
        'backend/libs/platform/messaging/src/relay.ts',
        "import { SchedulingModule } from '@platform/scheduling/nest';\nexport class Relay {}\n",
      );

      assert.equal(repo.check().status, 1);
    });

    it('rejects a dynamic import of @nestjs/* in the core', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/route-loader.ts',
        "export class RouteLoader {\n  load() {\n    return import('@nestjs/core');\n  }\n}\n",
      );

      assert.equal(repo.check().status, 1);
    });

    it('rejects @nestjs/* in a test outside src/nest', () => {
      repo.write(
        'backend/libs/platform/cache/src/__tests__/cache.spec.ts',
        "import { Test } from '@nestjs/testing';\n",
      );

      assert.equal(repo.check().status, 1);
    });

    it('accepts @nestjs/* inside src/nest', () => {
      repo.write(
        'backend/libs/platform/cache/src/nest/cache.module.ts',
        "import { Module } from '@nestjs/common';\nexport class CacheModule {}\n",
      );

      assert.equal(repo.check().status, 0);
    });

    it('accepts @nestjs/* in an app', () => {
      repo.write(
        'backend/apps/identity/src/app.module.ts',
        "import { Module } from '@nestjs/common';\nexport class AppModule {}\n",
      );

      assert.equal(repo.check().status, 0);
    });
  });

  describe('loose functions', () => {
    it('rejects an exported function in a platform file', () => {
      repo.write(
        'backend/libs/platform/cache/src/jittered-ttl.ts',
        LOOSE_FUNCTION,
      );

      const { status, output } = repo.check();

      assert.equal(status, 1);
      assert.match(output, /jittered-ttl\.ts: exports loose functions/);
    });

    it('accepts the define* factories of contracts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/define-route.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('accepts the env.ts schemas', () => {
      repo.write('backend/libs/platform/config/src/env.ts', LOOSE_FUNCTION);

      assert.equal(repo.check().status, 0);
    });

    it('accepts secret() of config', () => {
      repo.write('backend/libs/platform/config/src/secret.ts', LOOSE_FUNCTION);

      assert.equal(repo.check().status, 0);
    });

    it('accepts defineErrorCatalog in kit/error-catalog.ts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/error-catalog.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('accepts main() of a tool', () => {
      repo.write('backend/tools/contracts-export/src/main.ts', LOOSE_FUNCTION);

      assert.equal(repo.check().status, 0);
    });

    it('rejects a loose function in another config file', () => {
      repo.write(
        'backend/libs/platform/config/src/config-loader.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 1);
    });

    it('accepts the field-errors DSL utilities of contracts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/field-errors.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('accepts the message-definition DSL utilities of contracts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/message-definition.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('accepts the parameterized pagination schema of contracts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/schemas/pagination.schema.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('accepts the call-outcome.ts guards', () => {
      repo.write(
        'backend/libs/platform/primitives/src/call-outcome.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('accepts the messaging topology factory', () => {
      repo.write(
        'backend/libs/platform/messaging/src/topology/contract-topology.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('accepts the Audited decorator of persistence', () => {
      repo.write(
        'backend/libs/platform/persistence/src/metadata/entity-metadata.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('rejects a loose function in a kit file that is not define*', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/query-params.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 1);
    });
  });

  describe('existing placement rules', () => {
    it('rejects src/lib', () => {
      repo.write('backend/libs/platform/cache/src/lib/cache.ts');

      assert.equal(repo.check().status, 1);
    });

    it('accepts code directly in src', () => {
      repo.write('backend/libs/platform/cache/src/cache.ts');

      assert.equal(repo.check().status, 0);
    });

    it('rejects a test outside __tests__', () => {
      repo.write('backend/libs/platform/cache/src/cache.spec.ts');

      assert.equal(repo.check().status, 1);
    });
  });
});
