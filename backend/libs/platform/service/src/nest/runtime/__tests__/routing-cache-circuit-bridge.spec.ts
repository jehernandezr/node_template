import {
  ValkeyCircuit,
  ValkeyCommand,
  ValkeyCommandExecutor,
  ValkeyErrorTranslator,
} from '@platform/adapters-valkey';
import { ScriptedValkeyRunner } from '@platform/adapters-valkey/test-utils';
import { FixedClock } from '@platform/kernel/test-utils';
import { RoutingCacheCircuitBridge } from '../routing-cache-circuit-bridge.js';
import { RecordingShardRouter } from './utils/index.js';

const OPTIONS = {
  deadlineMs: 50,
  consecutiveFailures: 1,
  halfOpenAfterMs: 1_000,
};

describe('RoutingCacheCircuitBridge', () => {
  const clock = new FixedClock(new Date('2026-11-27T10:00:00.000Z'));

  it('suspends routing caches when the circuit opens and flushes them when it closes', async () => {
    const circuit = new ValkeyCircuit(clock, OPTIONS);
    const router = new RecordingShardRouter();
    const bridge = new RoutingCacheCircuitBridge(circuit, router);
    const executor = new ValkeyCommandExecutor(
      new ScriptedValkeyRunner(new Error('Connection is closed.'), 'PONG'),
      new ValkeyErrorTranslator(),
      circuit,
    );
    bridge.onModuleInit();

    await executor.run(ValkeyCommand.Ping, []).catch(() => undefined);
    clock.advance(OPTIONS.halfOpenAfterMs);
    await executor.run(ValkeyCommand.Ping, []);
    bridge.onModuleDestroy();

    expect(router.events).toEqual(['suspended', 'resumed']);
  });

  it('suspends at once when the circuit is already open at start', async () => {
    const circuit = new ValkeyCircuit(clock, OPTIONS);
    await new ValkeyCommandExecutor(
      new ScriptedValkeyRunner(new Error('Connection is closed.')),
      new ValkeyErrorTranslator(),
      circuit,
    )
      .run(ValkeyCommand.Ping, [])
      .catch(() => undefined);
    const router = new RecordingShardRouter();

    new RoutingCacheCircuitBridge(circuit, router).onModuleInit();

    expect(router.events).toEqual(['suspended']);
  });
});
