// Pruebas de check-structure.mjs: cada regla tiene un caso en verde y uno en rojo.
// Corren con `node --test .claude/skills/backend-estructura/scripts/*.test.mjs`.
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

  describe('pruebas de integración', () => {
    it('rechaza un archivo *.integration.spec.ts', () => {
      repo.write(
        'backend/libs/platform/cache/src/__tests__/store.integration.spec.ts',
      );

      const { status, output } = repo.check();

      assert.equal(status, 1);
      assert.match(output, /store\.integration\.spec\.ts: .*\*\.int-spec\.ts/);
    });

    it('acepta *.int-spec.ts y *.spec.ts en __tests__', () => {
      repo
        .write('backend/libs/platform/cache/src/__tests__/store.int-spec.ts')
        .write('backend/libs/platform/cache/src/__tests__/store.spec.ts');

      assert.equal(repo.check().status, 0);
    });
  });

  describe('NestJS fuera de src/nest', () => {
    it('rechaza @nestjs/* en el núcleo de una librería de plataforma', () => {
      repo.write(
        'backend/libs/platform/cache/src/cache.service.ts',
        "import { Injectable } from '@nestjs/common';\nexport class CacheService {}\n",
      );

      const { status, output } = repo.check();

      assert.equal(status, 1);
      assert.match(output, /cache\.service\.ts: fuera de src\/nest\//);
    });

    it('rechaza una sub-entrada @platform/<lib>/nest en el núcleo', () => {
      repo.write(
        'backend/libs/platform/messaging/src/relay.ts',
        "import { SchedulingModule } from '@platform/scheduling/nest';\nexport class Relay {}\n",
      );

      assert.equal(repo.check().status, 1);
    });

    it('rechaza una importación dinámica de @nestjs/* en el núcleo', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/route-loader.ts',
        "export class RouteLoader {\n  load() {\n    return import('@nestjs/core');\n  }\n}\n",
      );

      assert.equal(repo.check().status, 1);
    });

    it('rechaza @nestjs/* en una prueba fuera de src/nest', () => {
      repo.write(
        'backend/libs/platform/cache/src/__tests__/cache.spec.ts',
        "import { Test } from '@nestjs/testing';\n",
      );

      assert.equal(repo.check().status, 1);
    });

    it('acepta @nestjs/* dentro de src/nest', () => {
      repo.write(
        'backend/libs/platform/cache/src/nest/cache.module.ts',
        "import { Module } from '@nestjs/common';\nexport class CacheModule {}\n",
      );

      assert.equal(repo.check().status, 0);
    });

    it('acepta @nestjs/* en una app', () => {
      repo.write(
        'backend/apps/identity/src/app.module.ts',
        "import { Module } from '@nestjs/common';\nexport class AppModule {}\n",
      );

      assert.equal(repo.check().status, 0);
    });
  });

  describe('funciones sueltas', () => {
    it('rechaza una función exportada en un archivo de plataforma', () => {
      repo.write(
        'backend/libs/platform/cache/src/jittered-ttl.ts',
        LOOSE_FUNCTION,
      );

      const { status, output } = repo.check();

      assert.equal(status, 1);
      assert.match(output, /jittered-ttl\.ts: exporta funciones sueltas/);
    });

    it('acepta las fábricas define* de contracts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/define-route.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('acepta los esquemas de env.ts', () => {
      repo.write('backend/libs/platform/config/src/env.ts', LOOSE_FUNCTION);

      assert.equal(repo.check().status, 0);
    });

    it('acepta secret() de config', () => {
      repo.write('backend/libs/platform/config/src/secret.ts', LOOSE_FUNCTION);

      assert.equal(repo.check().status, 0);
    });

    it('acepta defineErrorCatalog en kit/error-catalog.ts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/error-catalog.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('acepta main() de una herramienta', () => {
      repo.write('backend/tools/contracts-export/src/main.ts', LOOSE_FUNCTION);

      assert.equal(repo.check().status, 0);
    });

    it('rechaza una función suelta en otro archivo de config', () => {
      repo.write(
        'backend/libs/platform/config/src/config-loader.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 1);
    });

    it('acepta las utilidades del DSL de field-errors de contracts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/field-errors.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('acepta las utilidades del DSL de message-definition de contracts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/message-definition.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('acepta el esquema parametrizado de paginación de contracts', () => {
      repo.write(
        'backend/libs/contracts/platform/src/schemas/pagination.schema.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('acepta las guardas de call-outcome.ts', () => {
      repo.write(
        'backend/libs/platform/primitives/src/call-outcome.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('acepta la fábrica de topología de messaging', () => {
      repo.write(
        'backend/libs/platform/messaging/src/topology/contract-topology.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('acepta el decorador Audited de persistence', () => {
      repo.write(
        'backend/libs/platform/persistence/src/metadata/entity-metadata.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 0);
    });

    it('rechaza una función suelta en un archivo kit que no es define*', () => {
      repo.write(
        'backend/libs/contracts/platform/src/kit/query-params.ts',
        LOOSE_FUNCTION,
      );

      assert.equal(repo.check().status, 1);
    });
  });

  describe('reglas de ubicación existentes', () => {
    it('rechaza src/lib', () => {
      repo.write('backend/libs/platform/cache/src/lib/cache.ts');

      assert.equal(repo.check().status, 1);
    });

    it('acepta código directo en src', () => {
      repo.write('backend/libs/platform/cache/src/cache.ts');

      assert.equal(repo.check().status, 0);
    });

    it('rechaza una prueba fuera de __tests__', () => {
      repo.write('backend/libs/platform/cache/src/cache.spec.ts');

      assert.equal(repo.check().status, 1);
    });
  });
});
