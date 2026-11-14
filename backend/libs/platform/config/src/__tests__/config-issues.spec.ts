import { z } from 'zod';
import { ConfigIssues } from '../config-issues.js';

function issuesOf(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) {
    throw new Error('expected the input to be rejected');
  }
  return ConfigIssues.fromZod(result.error);
}

describe('ConfigIssues', () => {
  it('joins a nested path with dots', () => {
    const schema = z.object({ DB: z.object({ URL: z.string() }) });

    expect(issuesOf(schema, { DB: { URL: 1 } })).toEqual([
      expect.objectContaining({ path: 'DB.URL', code: 'invalid_type' }),
    ]);
  });

  it('uses (root) when the whole value is rejected', () => {
    expect(issuesOf(z.string(), { SERVICE_NAME: 'orders' })).toEqual([
      expect.objectContaining({ path: '(root)' }),
    ]);
  });
});
