import {
  decodeShardDirectoryChanged,
  encodeShardDirectoryChanged,
  InMemoryShardDirectoryChannel,
  ShardDirectoryChangeKind,
  ShardingEvent,
  type ShardDirectoryChanged,
} from './directory-changes.js';

const placementChange: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.TenantPlacement,
  tenantId: '01941f29-7c00-7000-8000-000000000001',
  version: 4,
};

const instanceChange: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.ShardInstance,
  logicalShard: 'shard-1',
};

describe('ShardDirectoryChanged codec', () => {
  it('round-trips both kinds of change', () => {
    for (const event of [placementChange, instanceChange]) {
      expect(
        decodeShardDirectoryChanged(encodeShardDirectoryChanged(event)),
      ).toEqual(event);
    }
    const unversioned = {
      type: ShardingEvent.ShardDirectoryChanged,
      kind: ShardDirectoryChangeKind.TenantPlacement,
      tenantId: '01941f29-7c00-7000-8000-000000000001',
    };
    expect(decodeShardDirectoryChanged(JSON.stringify(unversioned))).toEqual(
      unversioned,
    );
  });

  it.each([
    ['not json'],
    ['[]'],
    [JSON.stringify({ ...placementChange, type: 'other.v1' })],
    [JSON.stringify({ ...placementChange, kind: 'other' })],
    [JSON.stringify({ ...placementChange, tenantId: '' })],
    [JSON.stringify({ ...placementChange, tenantId: 'x'.repeat(300) })],
    [JSON.stringify({ ...placementChange, version: -1 })],
    [JSON.stringify({ ...placementChange, version: 1.5 })],
    [JSON.stringify({ ...instanceChange, logicalShard: 7 })],
  ])('ignores the malformed message %s', (raw) => {
    expect(decodeShardDirectoryChanged(raw)).toBeUndefined();
  });
});

describe('InMemoryShardDirectoryChannel', () => {
  it('delivers to every subscriber until it unsubscribes', async () => {
    const channel = new InMemoryShardDirectoryChannel();
    const first = jest.fn();
    const second = jest.fn();
    const stopFirst = await channel.subscribe(first);
    await channel.subscribe(second);

    await channel.publish(placementChange);
    await stopFirst();
    await channel.publish(instanceChange);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenLastCalledWith(instanceChange);
  });
});
