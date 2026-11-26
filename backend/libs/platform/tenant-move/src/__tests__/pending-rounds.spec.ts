import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SagaSettings } from '@platform/saga';
import { TenantMoveErrorCode } from '../errors/tenant-move-error-code.enum.js';
import { PendingRounds } from './utils/pending-rounds.js';

class AlwaysPendingStep {
  calls = 0;

  async run(): Promise<never> {
    this.calls += 1;
    throw Object.assign(new Error('round pending'), {
      code: TenantMoveErrorCode.RoundPending,
    });
  }
}

class SourceTree {
  constructor(private readonly root: string) {}

  files(folder = this.root): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) return this.files(path);
      return entry.name.endsWith('.ts') ? [path] : [];
    });
  }
}

describe('PendingRounds', () => {
  it('gives up after the saga limit of suspended attempts, the one bound every relocation test shares', async () => {
    const step = new AlwaysPendingStep();

    await expect(
      PendingRounds.untilDone(() => step.run()),
    ).rejects.toMatchObject({ code: TenantMoveErrorCode.RoundPending });
    expect(step.calls).toBe(SagaSettings.DEFAULT_MAX_SUSPEND_ATTEMPTS);
  });

  it('is the only round limit of the tenant-move tests', () => {
    const declaring = new SourceTree(join(__dirname, '..'))
      .files()
      .filter((file) => /ROUND_LIMIT\s*=/.test(readFileSync(file, 'utf8')));

    expect(declaring).toEqual([]);
  });
});
