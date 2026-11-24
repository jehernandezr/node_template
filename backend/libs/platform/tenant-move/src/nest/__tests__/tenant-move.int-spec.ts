import type { INestApplicationContext } from '@nestjs/common';
import type { OperationDefinition, TenantMoveRef } from '@contracts/platform';
import { InternalClient } from '@platform/internal-api';
import { ActorType, RequestContextStore } from '@platform/observability';
import { UuidV7IdGenerator } from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import { ShardRouter, TenantStatus } from '@platform/sharding';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoves } from '../../application/tenant-moves.js';
import {
  LedgerGroup,
  LedgerTenantMoveOperations,
  OpenLedgerOperation,
  RegionServers,
  ServiceLedgerWriter,
  TwoRegionLedger,
  type AckedLedger,
} from './utils/index.js';

const ids = new UuidV7IdGenerator();
const newId = (): string => ids.next().toString();
/** Un ritmo de escritura que una ronda de copia alcanza; sin pausa, la copia nunca llegaría al umbral. */
const WRITE_PACE_MS = 20;

const pause = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, WRITE_PACE_MS));

/** Repite el paso mientras su ronda no termina en el plazo de la llamada, como lo hace la saga. */
async function untilDone<T>(step: () => Promise<T>): Promise<T> {
  for (;;) {
    try {
      return await step();
    } catch (error) {
      if (
        (error as { code?: unknown }).code !== TenantMoveErrorCode.RoundPending
      ) {
        throw error;
      }
    }
  }
}

/**
 * Llama una operación de traslado por la API interna del proceso, como la saga, y la repite con otra llave mientras
 * responde que la ronda sigue en curso.
 */
async function callUntilDone(
  app: INestApplicationContext,
  operation: OperationDefinition,
  move: TenantMoveRef,
): Promise<void> {
  const client = app.get(InternalClient);
  for (;;) {
    const outcome = await client.call(operation, move, {
      idempotencyKey: newId(),
    });
    if (outcome.kind === CallOutcomeKind.Success) {
      return;
    }
    if (outcome.kind !== CallOutcomeKind.TransientFailure) {
      throw new Error(`${operation.id} answered ${JSON.stringify(outcome)}`);
    }
  }
}

/** Escritores que escriben sin parar hasta `stop`, cada uno sobre sus propias filas. */
class ContinuousWriters {
  private writing = true;
  private readonly running: Promise<void>[];

  constructor(readonly writers: readonly ServiceLedgerWriter[]) {
    this.running = writers.map(async (writer) => {
      while (this.writing) {
        await writer.writeOnce();
        await pause();
      }
    });
  }

  acked(): AckedLedger[] {
    return this.writers
      .flatMap((writer) => [...writer.ackedRows()])
      .sort((x, y) => x.id.localeCompare(y.id));
  }

  async stop(): Promise<void> {
    this.writing = false;
    await Promise.all(this.running);
  }
}

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable(
  'MoveTenant across shard groups and regions',
  () => {
    jest.setTimeout(600_000);
    const regionA = new RegionServers('region-a', 'pg-a');
    const regionB = new RegionServers('region-b', 'pg-b');
    let deployment: TwoRegionLedger | undefined;

    beforeAll(async () => {
      await regionA.start();
      await regionB.start();
    });

    afterEach(async () => {
      await deployment?.close();
    });

    afterAll(async () => {
      try {
        await regionA.stop();
      } finally {
        await regionB.stop();
      }
    });

    const refOf = (
      tenantId: string,
      group: LedgerGroup,
      region: RegionServers,
    ): TenantMoveRef => ({
      moveId: newId(),
      tenantId,
      targetGroup: group,
      targetRegion: region.region,
    });

    describe.each(['directory', 'valkey'])(
      'with the write gate in the %s',
      (gate) => {
        it('moves a tenant to another group and then to another region while it writes, without losing or repeating a row', async () => {
          const ledger = new TwoRegionLedger(regionA, regionB, gate);
          deployment = ledger;
          const tenant = newId();
          const neighbour = newId();
          const { inA, inB } = await ledger.deploy([tenant, neighbour]);
          const regions = new Map([
            [regionA.apiBaseUrl, inA],
            [regionB.apiBaseUrl, inB],
          ]);
          const writers = Array.from(
            { length: 3 },
            () => new ServiceLedgerWriter(tenant, newId, regions, inA),
          );
          const neighbourWriter = new ServiceLedgerWriter(
            neighbour,
            newId,
            regions,
            inA,
          );
          for (let i = 0; i < 30; i++) {
            await neighbourWriter.writeOnce();
            for (const writer of writers) {
              await writer.writeOnce();
            }
          }
          const toGroup = refOf(tenant, LedgerGroup.A1, regionA);
          const toRegion = refOf(tenant, LedgerGroup.B0, regionB);

          const continuous = new ContinuousWriters(writers);
          const beforeMoves = continuous.acked().length;
          let duringMoves = 0;
          try {
            for (const move of [toGroup, toRegion]) {
              await callUntilDone(
                inA,
                LedgerTenantMoveOperations.tenantMoveSync,
                move,
              );
              await callUntilDone(
                inA,
                LedgerTenantMoveOperations.tenantMoveFinalize,
                move,
              );
              await callUntilDone(
                inA,
                LedgerTenantMoveOperations.tenantMoveSwitch,
                move,
              );
            }
            duringMoves = continuous.acked().length - beforeMoves;
            while (
              writers.some((writer) => writer.redirectedTo().length === 0)
            ) {
              await pause();
            }
          } finally {
            await continuous.stop();
          }
          const acked = continuous.acked();
          const { a0, a1, b0 } = ledger.shards;

          expect(acked.length).toBeGreaterThan(60);
          expect(duringMoves).toBeGreaterThan(0);
          for (const writer of writers) {
            expect(writer.redirectedTo()).toEqual([regionB.apiBaseUrl]);
          }
          await expect(ledger.rowsOf(regionB, b0, tenant)).resolves.toEqual(
            acked,
          );
          await expect(
            inA.get(ShardRouter).placement(tenant),
          ).resolves.toMatchObject({
            region: regionB.region,
            shardGroup: [b0],
            status: TenantStatus.Active,
          });
          await expect(ledger.rowsOf(regionA, a0, neighbour)).resolves.toEqual(
            neighbourWriter.ackedRows(),
          );

          await callUntilDone(
            inA,
            LedgerTenantMoveOperations.tenantMoveCleanup,
            toGroup,
          );
          await callUntilDone(
            inA,
            LedgerTenantMoveOperations.tenantMoveCleanup,
            toRegion,
          );

          await expect(ledger.rowsOf(regionA, a0, tenant)).resolves.toEqual([]);
          await expect(ledger.rowsOf(regionA, a1, tenant)).resolves.toEqual([]);
          await expect(ledger.rowsOf(regionB, b0, tenant)).resolves.toEqual(
            acked,
          );
          await expect(ledger.rowsOf(regionA, a0, neighbour)).resolves.toEqual(
            neighbourWriter.ackedRows(),
          );
        });
      },
    );

    it('answers a call repeated with the same idempotency key after the move with the stored result, without writing the row again', async () => {
      const ledger = new TwoRegionLedger(regionA, regionB, 'directory', {
        requireScope: false,
      });
      deployment = ledger;
      const tenant = newId();
      const { inA } = await ledger.deploy([tenant]);
      const client = inA.get(InternalClient);
      const requests = inA.get(RequestContextStore);
      // Sin `requireScope` el shard de la llamada sale del tenant del contexto, como en una petición del tenant.
      const open = () =>
        requests.run(
          {
            tenantId: tenant,
            actorId: 'ledger-client',
            actorType: ActorType.System,
          },
          () =>
            client.call(
              OpenLedgerOperation,
              { name: 'reintento' },
              { idempotencyKey: 'open-ledger-1', tenantId: tenant },
            ),
        );
      const first = await open();
      const moves = inA.get(TenantMoves);
      const move = refOf(tenant, LedgerGroup.A1, regionA);

      await untilDone(() => moves.sync(move));
      await untilDone(() => moves.finalize(move));
      await moves.switch(move);
      const again = await open();

      expect(first).toMatchObject({ kind: CallOutcomeKind.Success });
      expect(again).toEqual(first);
      await expect(
        ledger.rowsOf(regionA, ledger.shards.a1, tenant),
      ).resolves.toHaveLength(1);
    });

    it('cancels a frozen move, discards the copy and lets the tenant write again where it was', async () => {
      const ledger = new TwoRegionLedger(regionA, regionB, 'directory');
      deployment = ledger;
      const tenant = newId();
      const { inA, inB } = await ledger.deploy([tenant]);
      const writer = new ServiceLedgerWriter(
        tenant,
        newId,
        new Map([
          [regionA.apiBaseUrl, inA],
          [regionB.apiBaseUrl, inB],
        ]),
        inA,
      );
      for (let i = 0; i < 20; i++) {
        await writer.writeOnce();
      }
      const moves = inA.get(TenantMoves);
      const move = refOf(tenant, LedgerGroup.B0, regionB);
      await untilDone(() => moves.sync(move));
      await untilDone(() => moves.finalize(move));

      await moves.abort(move);
      const beforeAbort = writer.ackedRows().length;
      for (let i = 0; i < 6; i++) {
        await writer.writeOnce();
      }

      expect(writer.ackedRows().length).toBeGreaterThan(beforeAbort);
      expect(writer.redirectedTo()).toEqual([]);
      await expect(
        ledger.rowsOf(regionB, ledger.shards.b0, tenant),
      ).resolves.toEqual([]);
      await expect(
        ledger.rowsOf(regionA, ledger.shards.a0, tenant),
      ).resolves.toEqual(writer.ackedRows());
      await expect(
        inA.get(ShardRouter).placement(tenant),
      ).resolves.toMatchObject({
        region: regionA.region,
        shardGroup: [ledger.shards.a0],
        status: TenantStatus.Active,
      });
    });
  },
);
