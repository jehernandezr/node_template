import { Compensation, defineOperation } from '@contracts/platform';
import { ReportsOperation } from '../enums/identifiers.enum.js';
import {
  EraseReportsUserInputSchema,
  EraseReportsUserResultSchema,
} from '../schemas/report.schema.js';

/**
 * Deletes the requester from the reports runs and projections. Runs after
 * the saga pivot: it is retried until it finishes and is not reverted.
 */
export const EraseReportsUserDataOperation = defineOperation({
  id: ReportsOperation.EraseUserData,
  input: EraseReportsUserInputSchema,
  output: EraseReportsUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Erasing the requester is irreversible and runs after the saga pivot: it is retried until finished and is not reverted.',
  timeoutMs: 6_000,
  description: 'Deletes the user data in the runs and the projections.',
});
