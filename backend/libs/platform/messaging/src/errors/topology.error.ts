import type { TopologyIssue } from '../topology/topology.js';
import { MessagingError } from './messaging-error.js';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/** Lanzado por `Topology.assertValid` con todos los problemas de error encontrados. */
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
