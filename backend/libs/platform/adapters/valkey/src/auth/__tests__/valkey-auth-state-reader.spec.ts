import { FixedClock } from '@platform/kernel/test-utils';
import { AsyncBatches } from './utils/async-batches.js';
import { ValkeyCommand } from '../../valkey-command.enum.js';
import { ValkeyErrorCode } from '../../valkey-error-code.enum.js';
import {
  ScriptedValkeyRunner,
  ValkeyExecutors,
} from '../../__tests__/utils/index.js';
import { ValkeyAuthStateReader } from '../valkey-auth-state-reader.js';

const NOW = new Date('2026-01-15T12:00:00.000Z');
const NOW_MS = NOW.getTime();
const HASH = 'f'.repeat(64);
const EPOCH_JSON = JSON.stringify({ revokedBefore: 10, suspended: false });

function readerOver(...answers: unknown[]): {
  runner: ScriptedValkeyRunner;
  reader: ValkeyAuthStateReader;
} {
  const runner = new ScriptedValkeyRunner(...answers);
  const reader = new ValkeyAuthStateReader(
    ValkeyExecutors.over(runner),
    new FixedClock(NOW),
  );
  return { runner, reader };
}

describe('ValkeyAuthStateReader', () => {
  describe('single reads', () => {
    it.each([
      [
        'isSessionRevoked',
        ValkeyCommand.Get,
        ['auth:revoked:s1'],
        (r: ValkeyAuthStateReader) => r.isSessionRevoked('s1'),
        false,
      ],
      [
        'userEpoch',
        ValkeyCommand.Get,
        ['auth:epoch:user:u1'],
        (r: ValkeyAuthStateReader) => r.userEpoch('u1'),
        undefined,
      ],
      [
        'tenantEpoch',
        ValkeyCommand.Get,
        ['auth:epoch:tenant:t1'],
        (r: ValkeyAuthStateReader) => r.tenantEpoch('t1'),
        undefined,
      ],
      [
        'accessGrant',
        ValkeyCommand.Get,
        ['auth:access:t1:u1'],
        (r: ValkeyAuthStateReader) => r.accessGrant('t1', 'u1'),
        undefined,
      ],
      [
        'apiKey',
        ValkeyCommand.Hget,
        ['auth:apikey:abcd1234', HASH],
        (r: ValkeyAuthStateReader) => r.apiKey('abcd1234', HASH),
        undefined,
      ],
    ])(
      '%s sends %s with %j and maps a nil reply to %p',
      async (_name, command, args, read, nilValue) => {
        const { runner, reader } = readerOver(null);

        expect(await read(reader)).toBe(nilValue);
        expect(runner.calls).toEqual([[command, args]]);
      },
    );

    it('reads the session as revoked when the revoked key exists', async () => {
      const { reader } = readerOver('logout');

      expect(await reader.isSessionRevoked('s1')).toBe(true);
    });

    it('reads a stored epoch from its JSON value', async () => {
      const { reader } = readerOver(EPOCH_JSON);

      expect(await reader.userEpoch('u1')).toEqual({
        revokedBefore: 10,
        suspended: false,
      });
    });

    it('reads the permission version from the tenant and user keys', async () => {
      const { runner, reader } = readerOver('3', '7');

      expect(await reader.permissionVersion('t1', 'u1')).toEqual({
        tenant: 3,
        user: 7,
      });
      expect(runner.calls).toEqual([
        [ValkeyCommand.Get, ['auth:pv:tenant:t1']],
        [ValkeyCommand.Get, ['auth:pv:user:t1:u1']],
      ]);
    });

    it.each([
      ['the tenant version is missing', [null, '7']],
      ['the user version is missing', ['3', null]],
    ])('reads no permission version when %s', async (_name, answers) => {
      const { reader } = readerOver(...answers);

      expect(await reader.permissionVersion('t1', 'u1')).toBeUndefined();
    });
  });

  describe('unexpected replies', () => {
    it.each([
      [
        'an epoch that is not JSON',
        ['not json'],
        (r: ValkeyAuthStateReader) => r.userEpoch('u1'),
      ],
      [
        'an epoch that breaks the schema',
        [JSON.stringify({ revokedBefore: -1, suspended: false })],
        (r: ValkeyAuthStateReader) => r.userEpoch('u1'),
      ],
      [
        'a permission version that is not a number',
        ['x', '7'],
        (r: ValkeyAuthStateReader) => r.permissionVersion('t1', 'u1'),
      ],
    ])('rejects %s with an unexpected reply', async (_name, answers, read) => {
      const { reader } = readerOver(...answers);

      await expect(read(reader)).rejects.toMatchObject({
        code: ValkeyErrorCode.UnexpectedReply,
      });
    });

    it('rejects a runner failure with a command failed error', async () => {
      const { reader } = readerOver(new Error('connection refused'));

      await expect(reader.isSessionRevoked('s1')).rejects.toMatchObject({
        code: ValkeyErrorCode.CommandFailed,
      });
    });
  });

  describe('revoked session index', () => {
    it('scans the index with ZSCAN from cursor 0 and a count hint', async () => {
      const { runner, reader } = readerOver(['0', []]);

      await AsyncBatches.collect(reader.revokedSessionIds());

      expect(runner.calls).toEqual([
        [
          ValkeyCommand.Zscan,
          [
            'auth:revoked-index',
            '0',
            'COUNT',
            ValkeyAuthStateReader.BATCH_SIZE,
          ],
        ],
      ]);
    });

    it('yields only the sessions whose revocation has not expired and follows the cursor', async () => {
      const { runner, reader } = readerOver(
        ['17', ['s1', String(NOW_MS + 1000), 's2', String(NOW_MS - 1)]],
        ['0', []],
      );

      const batches = await AsyncBatches.collect(reader.revokedSessionIds());

      expect(batches).toEqual([['s1']]);
      expect(runner.calls[1]).toEqual([
        ValkeyCommand.Zscan,
        ['auth:revoked-index', '17', 'COUNT', ValkeyAuthStateReader.BATCH_SIZE],
      ]);
    });

    it('yields nothing from a page with only expired sessions', async () => {
      const { reader } = readerOver(['0', ['s2', String(NOW_MS - 1)]]);

      expect(await AsyncBatches.collect(reader.revokedSessionIds())).toEqual(
        [],
      );
    });

    it('sends no command when the signal is already aborted', async () => {
      const { runner, reader } = readerOver();
      const controller = new AbortController();
      controller.abort();

      expect(
        await AsyncBatches.collect(reader.revokedSessionIds(controller.signal)),
      ).toEqual([]);
      expect(runner.calls).toEqual([]);
    });

    it.each([
      ['a reply with no member list', ['0']],
      ['a member list with an odd length', ['0', ['s1']]],
      ['a cursor that is not text', [0, []]],
    ])('rejects %s with an unexpected reply', async (_name, answer) => {
      const { reader } = readerOver(answer);

      await expect(
        AsyncBatches.collect(reader.revokedSessionIds()),
      ).rejects.toMatchObject({ code: ValkeyErrorCode.UnexpectedReply });
    });
  });
});
