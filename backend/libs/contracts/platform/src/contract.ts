import { IdentifierFormat } from './constants/identifier.constants.js';
import { MoneyLimits } from './constants/money.constants.js';
import { Pagination } from './constants/pagination.constants.js';
import { ValidationRules } from './constants/validation.constants.js';
import { AccessKind } from './enums/access-kind.enum.js';
import { ErrorAudience } from './enums/error-audience.enum.js';
import { HttpMethod } from './enums/http-method.enum.js';
import { PlatformErrorCode } from './enums/platform-error-code.enum.js';
import { platformErrorCatalog } from './errors/platform-error-catalog.js';
import { defineServiceContract } from './kit/define-service-contract.js';
import { EmptySchema } from './schemas/empty.schema.js';
import { IdSchema } from './schemas/id.schema.js';
import { TimestampSchema } from './schemas/timestamp.schema.js';
import {
  CurrencyCodeSchema,
  MoneyAmountSchema,
} from './schemas/money.schema.js';
import {
  CursorSchema,
  PageLimitSchema,
  PageQuerySchema,
} from './schemas/pagination.schema.js';
import {
  FieldErrorSchema,
  ProblemDetailsSchema,
} from './schemas/problem-details.schema.js';

/** Piezas transversales que usan todos los contratos y clientes. */
export const platformContract = defineServiceContract({
  service: 'platform',
  description:
    'Kit de contratos y piezas transversales: identificadores, paginación, montos y errores.',
  enums: { PlatformErrorCode, ErrorAudience, HttpMethod, AccessKind },
  constants: { Pagination, MoneyLimits, IdentifierFormat, ValidationRules },
  schemas: {
    Id: IdSchema,
    Timestamp: TimestampSchema,
    Cursor: CursorSchema,
    PageLimit: PageLimitSchema,
    PageQuery: PageQuerySchema,
    CurrencyCode: CurrencyCodeSchema,
    MoneyAmount: MoneyAmountSchema,
    FieldError: FieldErrorSchema,
    ProblemDetails: ProblemDetailsSchema,
    Empty: EmptySchema,
  },
  errors: { PlatformErrorCode: platformErrorCatalog },
});
