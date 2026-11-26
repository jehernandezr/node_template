import { ValidationRules } from '../constants/validation.constants.js';
import { ErrorAudience } from '../enums/error-audience.enum.js';
import type { ProblemDetailKey } from '../enums/problem-detail-key.enum.js';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import { ContractDefinitionError } from './contract-definition-error.js';

/**
 * Format of an error code: `SERVICE.SUBMODULE.ERROR`, with at least three
 * segments. It is the same expression as the kernel's `ErrorCode.PATTERN`, which a
 * contract cannot import; a test in `@platform/primitives` checks
 * that they match.
 */
export const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/;

/**
 * ARB key of a code's message. It is the same transformation the front uses:
 * `PLATFORM.AUTH.FORBIDDEN` → `error_platform_auth_forbidden`.
 */
export function messageKeyFor(code: string): string {
  return `${ValidationRules.messageKeyPrefix}${code.toLowerCase().replace(/[.-]/g, '_')}`;
}

/** Data of a catalog entry; the message key is derived from the code. */
export interface ErrorSpec {
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly audience: ErrorAudience;
  readonly description: string;
  readonly publicDetails?: readonly ProblemDetailKey[];
}

/**
 * Shortcuts to declare the entries of a catalog: `pub` for codes that
 * reach the client and `internal` for those that never leave the backend.
 */
export class ErrorSpecs {
  /**
   * Spec of a public error, whose code and listed details reach the client.
   * @param httpStatus HTTP status of the answer.
   * @param retryable Whether the client may retry.
   * @param description What the error means.
   * @param publicDetails Details that may be shown to the client.
   * @returns The error spec.
   */
  static pub(
    httpStatus: number,
    retryable: boolean,
    description: string,
    publicDetails?: readonly ProblemDetailKey[],
  ): ErrorSpec {
    return {
      httpStatus,
      retryable,
      audience: ErrorAudience.Public,
      description,
      ...(publicDetails !== undefined && { publicDetails }),
    };
  }

  /**
   * Spec of an internal error, answered as a generic one.
   * @param httpStatus HTTP status of the answer.
   * @param retryable Whether the client may retry.
   * @param description What the error means.
   * @returns The error spec.
   */
  static internal(
    httpStatus: number,
    retryable: boolean,
    description: string,
  ): ErrorSpec {
    return {
      httpStatus,
      retryable,
      audience: ErrorAudience.Internal,
      description,
    };
  }
}

/**
 * Builds the catalog of a code enum. The type requires one entry for
 * each enum value, and the order of the result follows the enum.
 */
export function defineErrorCatalog<E extends Record<string, string>>(
  codes: E,
  specs: { readonly [K in E[keyof E]]: ErrorSpec },
): readonly ErrorCatalogEntry[] {
  const values = Object.values(codes);
  const extra = Object.keys(specs).filter((code) => !values.includes(code));
  if (extra.length > 0) {
    throw new ContractDefinitionError(
      `Catalog codes outside the enum: ${extra.join(', ')}`,
    );
  }
  return Object.freeze(
    values.map((code) => {
      if (!ERROR_CODE_PATTERN.test(code)) {
        throw new ContractDefinitionError(`Invalid error code: ${code}`);
      }
      const spec = (specs as Record<string, ErrorSpec | undefined>)[code];
      if (!spec) {
        throw new ContractDefinitionError(`Missing entry for ${code}`);
      }
      if (spec.httpStatus < 400 || spec.httpStatus > 599) {
        throw new ContractDefinitionError(
          `Invalid HTTP status for ${code}: ${spec.httpStatus}`,
        );
      }
      return Object.freeze({ code, ...spec, messageKey: messageKeyFor(code) });
    }),
  );
}

/**
 * In-memory registry of catalog entries, indexed by code.
 */
export class ErrorCatalog {
  private readonly entries = new Map<string, ErrorCatalogEntry>();

  /**
   * Registers entries. Validates all of them before storing any, so an invalid
   * batch does not leave the catalog half-written.
   * Libraries repeat the public codes of the central catalog to be
   * self-contained, and the service registers the central one and that of each library it uses.
   * That is why a repeated entry is valid if it defines the same thing, and it is only
   * rejected when the HTTP status, the retry or the audience changes.
   * @param entries Entries to register.
   */
  register(entries: readonly ErrorCatalogEntry[]): void {
    const batch = new Map<string, ErrorCatalogEntry>();
    for (const entry of entries) {
      if (!ERROR_CODE_PATTERN.test(entry.code)) {
        throw new Error(`Invalid error code: ${entry.code}`);
      }
      const stored = this.entries.get(entry.code) ?? batch.get(entry.code);
      if (stored === undefined) {
        batch.set(entry.code, entry);
        continue;
      }
      if (!ErrorCatalog.sameDefinition(stored, entry)) {
        throw new Error(
          `Error code duplicated with another definition: ${entry.code}`,
        );
      }
    }
    for (const entry of batch.values()) {
      this.entries.set(entry.code, entry);
    }
  }

  private static sameDefinition(
    stored: ErrorCatalogEntry,
    entry: ErrorCatalogEntry,
  ): boolean {
    return (
      stored.httpStatus === entry.httpStatus &&
      stored.retryable === entry.retryable &&
      stored.audience === entry.audience
    );
  }

  /**
   * Reads the entry of a code.
   * @param code Error code.
   * @returns The entry, or `undefined` when unregistered.
   */
  get(code: string): ErrorCatalogEntry | undefined {
    return this.entries.get(code);
  }

  /**
   * Lists every registered entry.
   * @returns The entries.
   */
  all(): ErrorCatalogEntry[] {
    return [...this.entries.values()];
  }
}
