import { JobScheduleKind } from '@platform/kernel';
import { FixedClock, FixedRandomSource } from '@platform/kernel/test-utils';
import { SchedulingErrorCode } from '../errors/scheduling-error-code.enum.js';
import { JobSchedulePlanner } from '../job-schedule-planner.js';
import { RecordingJob } from './utils/index.js';

const EVERY_MS = 1_000;
const START = new Date('2026-11-14T02:00:00.000Z');

const intervalJob = (
  everyMs: number,
  jitterRatio?: number,
  timeoutMs?: number,
): RecordingJob =>
  new RecordingJob({
    name: 'job',
    timeoutMs,
    schedule: {
      kind: JobScheduleKind.Interval,
      everyMs,
      ...(jitterRatio === undefined ? {} : { jitterRatio }),
    },
  });

const cronJob = (expression: string): RecordingJob =>
  new RecordingJob({
    name: 'job',
    schedule: { kind: JobScheduleKind.Cron, expression },
  });

describe('JobSchedulePlanner', () => {
  describe('when computing the delay of an interval', () => {
    it('returns everyMs without jitter', () => {
      const planner = new JobSchedulePlanner(
        new FixedClock(START),
        new FixedRandomSource([0.5]),
      );
      expect(planner.delayMs(intervalJob(EVERY_MS))).toBe(EVERY_MS);
    });

    it.each([
      [0, 800],
      [0.5, 1000],
      [1, 1200],
    ])('applies jitter with random %p to give %p ms', (random, expected) => {
      const planner = new JobSchedulePlanner(
        new FixedClock(START),
        new FixedRandomSource([random]),
      );
      expect(planner.delayMs(intervalJob(EVERY_MS, 0.2))).toBe(expected);
    });
  });

  describe('when computing the delay of a cron', () => {
    it('returns the milliseconds until the next 03:00 UTC', () => {
      const planner = new JobSchedulePlanner(
        new FixedClock(START),
        new FixedRandomSource([0.5]),
      );
      expect(planner.delayMs(cronJob('0 3 * * *'))).toBe(3_600_000);
    });
  });

  describe('when validating a schedule that is not valid', () => {
    it.each([
      ['an everyMs of 0', intervalJob(0)],
      ['an everyMs of -1', intervalJob(-1)],
      ['an everyMs of 1.5', intervalJob(1.5)],
      ['a jitterRatio of 2', intervalJob(EVERY_MS, 2)],
      ['a jitterRatio of -0.1', intervalJob(EVERY_MS, -0.1)],
      ['a timeoutMs of 0', intervalJob(EVERY_MS, undefined, 0)],
      ['a timeoutMs of -5', intervalJob(EVERY_MS, undefined, -5)],
      [
        'a timeoutMs of infinity',
        intervalJob(EVERY_MS, undefined, Number.POSITIVE_INFINITY),
      ],
    ])('rejects %s', (_description, job) => {
      const planner = new JobSchedulePlanner(
        new FixedClock(START),
        new FixedRandomSource([0.5]),
      );
      expect(() => planner.validate(job)).toThrow(
        expect.objectContaining({
          code: SchedulingErrorCode.InvalidSchedule,
        }),
      );
    });

    it('rejects a cron that does not parse', () => {
      const planner = new JobSchedulePlanner(
        new FixedClock(START),
        new FixedRandomSource([0.5]),
      );
      expect(() => planner.validate(cronJob('bad'))).toThrow(
        expect.objectContaining({
          code: SchedulingErrorCode.InvalidCronExpression,
        }),
      );
    });
  });

  describe('when validating a schedule that is valid', () => {
    it.each([
      ['a valid cron', cronJob('0 3 * * *')],
      ['a valid interval', intervalJob(EVERY_MS, 0.5, 5_000)],
    ])('accepts %s', (_description, job) => {
      const planner = new JobSchedulePlanner(
        new FixedClock(START),
        new FixedRandomSource([0.5]),
      );
      expect(() => planner.validate(job)).not.toThrow();
    });
  });
});
