import type { z } from 'zod';
import type { ConfigIssue } from './config-issue.js';

/** Converts zod issues into `ConfigIssue`. */
export class ConfigIssues {
  private static readonly ROOT = '(root)';

  static fromZod(error: z.ZodError): ConfigIssue[] {
    return error.issues.map((issue) => ({
      path:
        issue.path.length > 0
          ? issue.path.map(String).join('.')
          : ConfigIssues.ROOT,
      code: issue.code,
      message: issue.message,
    }));
  }
}
