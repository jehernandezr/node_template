import { tenantMoveConfigSchema } from '../config/tenant-move.config.js';
import { RehearsalTransferOptions } from './utils/rehearsal-transfer-options.js';

describe('RehearsalTransferOptions', () => {
  const serviceBatch = tenantMoveConfigSchema.parse({}).TENANT_MOVE_BATCH_SIZE;

  it('copies a move under writes in the service batch even when the suite asks for one row per batch', () => {
    expect(new RehearsalTransferOptions(1).underWrites().batchSize).toBe(
      serviceBatch,
    );
  });

  it('copies a quiet move in the batch the suite asks for', () => {
    expect(new RehearsalTransferOptions(1).quiet().batchSize).toBe(1);
  });

  it('copies a quiet move in the service batch when the suite asks for none', () => {
    expect(new RehearsalTransferOptions(undefined).quiet().batchSize).toBe(
      serviceBatch,
    );
  });

  it('gives both kinds of move the same budget, margin and caught-up threshold', () => {
    const options = new RehearsalTransferOptions(3);

    expect(options.underWrites()).toEqual({
      ...options.quiet(),
      batchSize: serviceBatch,
    });
  });
});
