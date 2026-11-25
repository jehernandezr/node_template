import { CalendarDateFormat } from './constants/calendar-date.constants.js';
import { IdentifierFormat } from './constants/identifier.constants.js';
import { MoneyLimits } from './constants/money.constants.js';
import { Pagination } from './constants/pagination.constants.js';
import { TenantDirectoryLimits } from './constants/tenant-directory.constants.js';
import { TenantMoveLimits } from './constants/tenant-move.constants.js';
import { ValidationRules } from './constants/validation.constants.js';
import { AccessKind } from './enums/access-kind.enum.js';
import { ErrorAudience } from './enums/error-audience.enum.js';
import { HttpMethod } from './enums/http-method.enum.js';
import { MessageKind } from './enums/message-kind.enum.js';
import { PlatformErrorCode } from './enums/platform-error-code.enum.js';
import { QueryValueKind } from './enums/query-value-kind.enum.js';
import { platformErrorCatalog } from './errors/platform-error-catalog.js';
import { defineServiceContract } from './kit/define-service-contract.js';
import { CalendarDateSchema } from './schemas/calendar-date.schema.js';
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
import {
  TenantMoveAckSchema,
  TenantMoveProgressSchema,
  TenantMoveRefSchema,
  TenantMoveTableCheckSchema,
  TenantMoveTableProgressSchema,
  TenantMoveVerificationSchema,
} from './schemas/tenant-move.schema.js';
import {
  TenantDirectoryAckSchema,
  TenantDirectoryEntrySchema,
  TenantDirectoryRefSchema,
} from './schemas/tenant-directory.schema.js';
import { UserRefSchema } from './schemas/user-ref.schema.js';

/** Piezas transversales que usan todos los contratos y clientes. */
export const platformContract = defineServiceContract({
  service: 'platform',
  description:
    'Kit de contratos y piezas transversales: identificadores, paginación, montos, fechas, referencias de usuario, directorio y traslado de tenants y errores.',
  enums: {
    PlatformErrorCode,
    ErrorAudience,
    HttpMethod,
    AccessKind,
    MessageKind,
    QueryValueKind,
  },
  constants: {
    Pagination,
    MoneyLimits,
    IdentifierFormat,
    ValidationRules,
    CalendarDateFormat,
    TenantMoveLimits,
    TenantDirectoryLimits,
  },
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
    CalendarDate: CalendarDateSchema,
    UserRef: UserRefSchema,
    TenantMoveRef: TenantMoveRefSchema,
    TenantMoveTableProgress: TenantMoveTableProgressSchema,
    TenantMoveProgress: TenantMoveProgressSchema,
    TenantMoveTableCheck: TenantMoveTableCheckSchema,
    TenantMoveVerification: TenantMoveVerificationSchema,
    TenantMoveAck: TenantMoveAckSchema,
    TenantDirectoryEntry: TenantDirectoryEntrySchema,
    TenantDirectoryRef: TenantDirectoryRefSchema,
    TenantDirectoryAck: TenantDirectoryAckSchema,
  },
  errors: { PlatformErrorCode: platformErrorCatalog },
});
