import { InputViolation } from '../input-violation.js';
import { OperationMetadata } from '../operation-metadata.js';

describe('InputViolation', () => {
  it('builds a business error with the field errors', () => {
    const fieldErrors = [{ field: 'amount', code: 'REQUIRED' }];

    expect(
      InputViolation.outcome('billing.reserve.v1', fieldErrors as never),
    ).toEqual({
      kind: 'business-error',
      code: OperationMetadata.INVALID_INPUT_CODE,
      message: 'Invalid input for "billing.reserve.v1"',
      details: { fieldErrors },
    });
  });
});
