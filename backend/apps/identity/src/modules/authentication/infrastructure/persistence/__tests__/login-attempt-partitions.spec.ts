import { LoginAttemptPartitions } from '../login-attempt-partitions.js';

describe('LoginAttemptPartitions', () => {
  const partitions = new LoginAttemptPartitions();
  const now = new Date('2026-11-16T10:00:00.000Z');

  it('expires a month only once the whole of it is older than twelve months', () => {
    expect(partitions.isExpired('login_attempts_202510', now)).toBe(true);
    expect(partitions.isExpired('login_attempts_202511', now)).toBe(false);
    expect(partitions.isExpired('login_attempts_202612', now)).toBe(false);
  });

  it('never drops the default partition or a table it does not recognise', () => {
    expect(partitions.isExpired('login_attempts_default', now)).toBe(false);
    expect(partitions.isExpired('sessions_202001', now)).toBe(false);
  });
});
