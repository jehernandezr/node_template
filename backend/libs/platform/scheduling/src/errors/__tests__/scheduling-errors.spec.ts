import { SchedulingErrorCode } from '../scheduling-error-code.enum.js';
import { schedulingErrorCatalog } from '../scheduling-error-catalog.js';
import { DuplicateJobError } from '../duplicate-job.error.js';
import { InvalidCronExpressionError } from '../invalid-cron-expression.error.js';
import { InvalidJobScheduleError } from '../invalid-job-schedule.error.js';
import { UnknownJobError } from '../unknown-job.error.js';

describe('Scheduling errors', () => {
  describe('when an error is created', () => {
    it.each([
      [
        new InvalidJobScheduleError('job', 'motivo'),
        SchedulingErrorCode.InvalidSchedule,
        { jobName: 'job', reason: 'motivo' },
      ],
      [
        new InvalidCronExpressionError('* *', 'motivo'),
        SchedulingErrorCode.InvalidCronExpression,
        { expression: '* *', reason: 'motivo' },
      ],
      [
        new DuplicateJobError('job'),
        SchedulingErrorCode.DuplicateJob,
        { jobName: 'job' },
      ],
      [
        new UnknownJobError('job'),
        SchedulingErrorCode.UnknownJob,
        { jobName: 'job' },
      ],
    ])('exposes its code and details for %s', (error, code, details) => {
      expect(error).toMatchObject({ code, details });
    });
  });

  describe('when the catalog is read', () => {
    const codes = schedulingErrorCatalog.map((entry) => entry.code);

    it.each(Object.values(SchedulingErrorCode))(
      'has an entry for %s',
      (code) => {
        expect(codes).toContain(code);
      },
    );

    it('has exactly one entry per code', () => {
      expect(codes).toHaveLength(Object.values(SchedulingErrorCode).length);
    });
  });
});
