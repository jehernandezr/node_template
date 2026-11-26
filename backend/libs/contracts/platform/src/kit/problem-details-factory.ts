import { ErrorAudience } from '../enums/error-audience.enum.js';
import { PlatformErrorCode } from '../enums/platform-error-code.enum.js';
import { platformErrorCatalog } from '../errors/platform-error-catalog.js';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import type { ProblemDetailsInput } from '../types/problem-details-input.type.js';
import type {
  ProblemDetails,
  ProblemDetailsDetails,
} from '../types/problem-details.type.js';

const UNEXPECTED = platformErrorCatalog.find(
  (entry) => entry.code === PlatformErrorCode.InternalUnexpected,
) as ErrorCatalogEntry;

/**
 * Builds the Problem Details response from a catalog entry.
 * `type` points to the code's documentation: `${typeBaseUrl}/errors/${code}`.
 *
 * A code with `audience: internal` never reaches the client: the response is
 * `PLATFORM.INTERNAL.UNEXPECTED` with its `traceId` and `instance`, without `detail`
 * or `errors`, and with the title of that entry.
 */
export class ProblemDetailsFactory {
  constructor(
    private readonly typeBaseUrl: string,
    private readonly unexpected: ErrorCatalogEntry = UNEXPECTED,
  ) {}

  /**
   * Builds the Problem Details body of an error, keeping only the public details its catalog entry allows.
   * @param input Code, status, message and details.
   * @returns The body to answer with.
   */
  create(input: ProblemDetailsInput): ProblemDetails {
    const { instance, traceId } = input;
    const internal = input.entry.audience === ErrorAudience.Internal;
    const entry = internal ? this.unexpected : input.entry;
    const problem: ProblemDetails = {
      type: `${this.typeBaseUrl}/errors/${entry.code}`,
      title: internal ? this.unexpected.description : input.title,
      status: entry.httpStatus,
      code: entry.code,
    };
    if (!internal && input.detail !== undefined) problem.detail = input.detail;
    if (instance !== undefined) problem.instance = instance;
    if (traceId !== undefined) problem.traceId = traceId;
    if (!internal && input.errors !== undefined) problem.errors = input.errors;
    const details = internal ? undefined : this.publicDetails(input);
    if (details !== undefined) problem.details = details;
    return problem;
  }

  /** Only the text data the entry declares public; the rest never goes out. */
  private publicDetails(
    input: ProblemDetailsInput,
  ): ProblemDetailsDetails | undefined {
    const allowed = input.entry.publicDetails ?? [];
    const source = input.details ?? {};
    const picked = allowed.flatMap((key) => {
      const value = source[key];
      return typeof value === 'string' ? [[key, value] as const] : [];
    });
    return picked.length === 0 ? undefined : Object.fromEntries(picked);
  }
}
