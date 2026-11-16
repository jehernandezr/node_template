import { PlatformError } from '@platform/kernel';
import type { ConfigIssue } from '../config-issue.js';
import { ConfigErrorCode } from './config-error-code.enum.js';

/**
 * El entorno no cumple el esquema. El mensaje lista cada problema como
 * `RUTA: mensaje` y nunca incluye valores crudos, así un secreto no se filtra
 * por logs ni por la salida de un arranque fallido.
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
