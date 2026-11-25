import { PlatformError } from '@platform/kernel';
import type { ConfigIssue } from '../config-issue.js';
import { ConfigErrorCode } from './config-error-code.enum.js';

/**
 * The environment does not satisfy the schema. The message lists each issue as
 * `PATH: message` and never includes raw values, so a secret does not leak
 * through logs or the output of a failed startup.
 */
export class ConfigValidationError extends PlatformError {
  override readonly code = ConfigErrorCode.Invalid;
  readonly issues: readonly ConfigIssue[];

  constructor(issues: readonly ConfigIssue[]) {
    const lines = issues.map((issue) => `  ${issue.path}: ${issue.message}`);
    const count = issues.length === 1 ? '1 issue' : `${issues.length} issues`;
    super(`Invalid configuration (${count}):\n${lines.join('\n')}`, {
      details: { issues },
    });
    this.issues = issues;
  }
}
