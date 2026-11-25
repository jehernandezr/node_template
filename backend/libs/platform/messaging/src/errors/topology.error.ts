import type { TopologyIssue } from '../topology/topology.js';
import { MessagingError } from './messaging-error.js';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/** Thrown by `Topology.assertValid` with every error-level problem found. */
export class TopologyError extends MessagingError {
  readonly issues: readonly TopologyIssue[];

  constructor(issues: readonly TopologyIssue[]) {
    super(
      MessagingErrorCode.InvalidTopology,
      `invalid topology: ${issues.map((issue) => issue.message).join('; ')}`,
    );
    this.issues = issues;
  }
}
