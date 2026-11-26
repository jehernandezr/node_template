/**
 * @isolated-server Two regions, each with its own PostgreSQL and Valkey that must not see each other, rehearse a move
 * between two instances behind the write gate.
 */
import type { INestApplicationContext } from '@nestjs/common';
import type { OperationDefinition, TenantMoveRef } from '@contracts/platform';
import { InternalClient } from '@platform/internal-api';
import { DispatchOutcome, MessageDispatcher } from '@platform/messaging';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import { ActorType, RequestContextStore } from '@platform/observability';
import {
  UuidV7IdGenerator,
  SystemClock,
  SystemRandomSource,
} from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import { ShardRouter, TenantStatus } from '@platform/sharding';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoves } from '../../application/tenant-moves.js';
import {
  LedgerCredited,
  LedgerGroup,
  LedgerTenantDirectoryOperations,
  LedgerTenantMoveOperations,
  OpenLedgerOperation,
  RegionServers,
  ServiceLedgerWriter,
  TwoRegionLedger,
  type AckedLedger,
} from './utils/index.js';

const ids = new UuidV7IdGenerator(new SystemClock(), new SystemRandomSource());
const newId = (): string => ids.next().toString();
/** A write rate a copy round can catch up with; without a pause, the copy would never reach the threshold. */
const WRITE_PACE_MS = 20;

const pause = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, WRITE_PACE_MS));

/** Repeats the step while its round does not finish within the call's deadline, as the saga does. */
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
 * Calls a move operation through the process internal API, like the saga, and repeats it with another key while
 * it answers that the round is still in progress.
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

/** Writers that write nonstop until `stop`, each on its own rows. */
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
              { name: 'retry' },
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

    it('recognises a message the source processed before the move when it arrives again in the target', async () => {
      const ledger = new TwoRegionLedger(regionA, regionB, 'directory');
      deployment = ledger;
      const tenant = newId();
      const ledgerId = newId();
      const { inA } = await ledger.deploy([tenant]);
      await (
        await regionA.connect(ledger.shards.a0)
      ).query(
        "INSERT INTO ledgers (id, tenant_id, name, total) VALUES ($1, $2, 'credits', 0)",
        [ledgerId, tenant],
      );
      const credit = EnvelopeBuilder.anEnvelope({
        id: newId(),
        type: LedgerCredited.type,
        source: 'ledger',
        tenantid: tenant,
        data: { ledgerId, amount: 7 },
      });
      const dispatcher = inA.get(MessageDispatcher);
      const before = await dispatcher.dispatch(credit, { receiveCount: 1 });
      const moves = inA.get(TenantMoves);
      const move = refOf(tenant, LedgerGroup.A1, regionA);

      await untilDone(() => moves.sync(move));
      await untilDone(() => moves.finalize(move));
      await moves.switch(move);
      const after = await dispatcher.dispatch(credit, { receiveCount: 2 });

      expect(before).toMatchObject({ outcome: DispatchOutcome.Processed });
      expect(after).toMatchObject({ outcome: DispatchOutcome.Duplicate });
      await expect(
        ledger.rowsOf(regionA, ledger.shards.a1, tenant),
      ).resolves.toEqual([{ id: ledgerId, total: '7' }]);
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

    it('places a new tenant in the shard of its group once, lets it write and move there, and removes the row of an onboarding that is undone but never the one of a tenant with data', async () => {
      const ledger = new TwoRegionLedger(regionA, regionB, 'directory');
      deployment = ledger;
      const tenant = newId();
      const undone = newId();
      const { inA } = await ledger.deploy([]);
      const client = inA.get(InternalClient);
      const call = (operation: OperationDefinition, input: unknown) =>
        client.call(operation, input, { idempotencyKey: newId() });
      const entryOf = (tenantId: string, group: string) => ({
        tenantId,
        region: regionA.region,
        groups: [group],
        dedicated: false,
      });
      const place = LedgerTenantDirectoryOperations.tenantDirectoryPlace;
      const remove = LedgerTenantDirectoryOperations.tenantDirectoryRemove;

      const placed = await call(place, entryOf(tenant, LedgerGroup.A1));
      const again = await call(place, entryOf(tenant, LedgerGroup.A1));
      const unknown = await call(place, entryOf(newId(), 'group-z'));
      await call(place, entryOf(undone, LedgerGroup.A1));
      const removed = await call(remove, { tenantId: undone });
      const removedAgain = await call(remove, { tenantId: undone });
      const writer = new ServiceLedgerWriter(
        tenant,
        newId,
        new Map([[regionA.apiBaseUrl, inA]]),
        inA,
      );
      for (let i = 0; i < 3; i++) {
        await writer.writeOnce();
      }
      const refusedWithData = await call(remove, { tenantId: tenant });
      const moves = inA.get(TenantMoves);
      const move = refOf(tenant, LedgerGroup.B0, regionB);
      await untilDone(() => moves.sync(move));
      await untilDone(() => moves.finalize(move));
      await moves.switch(move);

      expect([placed, again, removed, removedAgain]).toEqual([
        { kind: CallOutcomeKind.Success, value: { tenantId: tenant } },
        { kind: CallOutcomeKind.Success, value: { tenantId: tenant } },
        { kind: CallOutcomeKind.Success, value: { tenantId: undone } },
        { kind: CallOutcomeKind.Success, value: { tenantId: undone } },
      ]);
      expect(unknown).toMatchObject({
        kind: CallOutcomeKind.ProtocolViolation,
        code: TenantMoveErrorCode.UnknownTarget,
      });
      expect(refusedWithData).toMatchObject({
        code: TenantMoveErrorCode.TenantHasData,
      });
      await expect(
        ledger.rowsOf(regionB, ledger.shards.b0, tenant),
      ).resolves.toEqual(writer.ackedRows());
      await expect(
        inA.get(ShardRouter).placement(tenant),
      ).resolves.toMatchObject({
        region: regionB.region,
        shardGroup: [ledger.shards.b0],
      });
      await expect(ledger.placementRows(undone)).resolves.toEqual([]);
    });
  },
);
