import { FixedClock } from '@platform/kernel/test-utils';
import type { DataSource } from 'typeorm';
import { AssignedShardConnections } from '../../__tests__/utils/assigned-shard-connections.js';
import { TransferBudget } from '../transfer-budget.js';

const SOURCE = { options: { database: 'source' } } as DataSource;
const TARGET = { options: { database: 'target' } } as DataSource;

describe('ShardConnections', () => {
  it('opens the source and target connections of a move', async () => {
    const connections = new AssignedShardConnections();

    const connected = await connections.connect({
      moveId: 'move-1',
      tenantId: 'tenant-1',
      source: connections.locationOf(SOURCE),
      target: connections.locationOf(TARGET),
    });

    expect(connected).toEqual({
      moveId: 'move-1',
      tenantId: 'tenant-1',
      source: SOURCE,
      target: TARGET,
    });
  });

  it('keeps the shared budget of the call', async () => {
    const connections = new AssignedShardConnections();
    const budget = new TransferBudget(new FixedClock(), 1_000);

    const connected = await connections.connect({
      moveId: 'move-1',
      tenantId: 'tenant-1',
      source: connections.locationOf(SOURCE),
      target: connections.locationOf(TARGET),
      budget,
    });

    expect(connected.budget).toBe(budget);
  });

  it('fails for a shard it has no connection for', async () => {
    await expect(
      new AssignedShardConnections().get({
        logicalShard: 'unknown',
        instance: 'test',
      }),
    ).rejects.toThrow('No connection for unknown');
  });
});
