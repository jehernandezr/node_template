import { BulkheadFullError } from '../bulkhead-full.error.js';
import { ResilienceErrorCode } from '../resilience-error-code.enum.js';

describe('BulkheadFullError', () => {
  it('reports a transient, retryable full bulkhead', () => {
    const error = new BulkheadFullError('external', 'billing');
    expect(error).toMatchObject({
      code: ResilienceErrorCode.BulkheadFull,
      retryable: true,
      details: { policy: 'external', dependencyKey: 'billing' },
    });
  });
});
