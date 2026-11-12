import type { z } from 'zod';

export interface ConfigIssue {
  /** Dot-separated path to the offending key, e.g. `DB_SLOW_QUERY_MS`. `(root)` when the whole input is rejected. */
  readonly path: string;
  readonly code: string;
  /** Validator message. It never contains the raw input value. */
  readonly message: string;
}

/**
 * Thrown by `defineConfig(...).load()` when the environment does not satisfy the schema.
 * The message lists every issue as `PATH: message`; raw values are never included,
 * so secrets cannot leak through logs or crash output.
 */
export class ConfigValidationError extends Error {
  readonly issues: readonly ConfigIssue[];

  constructor(issues: readonly ConfigIssue[]) {
    const lines = issues.map((issue) => `  ${issue.path}: ${issue.message}`);
    const count = issues.length === 1 ? '1 issue' : `${issues.length} issues`;
    super(`Invalid configuration (${count}):\n${lines.join('\n')}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export function toConfigIssues(error: z.ZodError): ConfigIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)',
    code: issue.code,
    message: issue.message,
  }));
}
