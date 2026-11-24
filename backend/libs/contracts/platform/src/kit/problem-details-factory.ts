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
 * Construye la respuesta Problem Details a partir de una entrada del catálogo.
 * `type` apunta a la documentación del código: `${typeBaseUrl}/errors/${code}`.
 *
 * Un código con `audience: internal` nunca llega al cliente: la respuesta es
 * `PLATFORM.INTERNAL.UNEXPECTED` con su `traceId` e `instance`, sin `detail`
 * ni `errors`, y con el título de esa entrada.
 */
export class ProblemDetailsFactory {
  constructor(
    private readonly typeBaseUrl: string,
    private readonly unexpected: ErrorCatalogEntry = UNEXPECTED,
  ) {}

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

  /** Solo los datos de texto que la entrada declara públicos; los demás nunca salen. */
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
