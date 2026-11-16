import { ErrorAudience } from '../../enums/error-audience.enum.js';
import { PlatformErrorCode } from '../../enums/platform-error-code.enum.js';
import { platformErrorCatalog } from '../../errors/platform-error-catalog.js';
import { ProblemDetailsSchema } from '../../schemas/problem-details.schema.js';
import type { ErrorCatalogEntry } from '../../types/error-catalog-entry.type.js';
import { defineErrorCatalog, ErrorSpecs } from '../error-catalog.js';
import { ProblemDetailsFactory } from '../problem-details-factory.js';

const typeBaseUrl = 'https://docs.example.com';

const validationEntry = platformErrorCatalog.find(
  (e) => e.code === PlatformErrorCode.ValidationRequired,
) as ErrorCatalogEntry;

enum SpecErrorCode {
  Hidden = 'PLATFORM.SPEC.HIDDEN',
}

const hiddenCatalog = defineErrorCatalog(SpecErrorCode, {
  [SpecErrorCode.Hidden]: ErrorSpecs.internal(
    500,
    false,
    'Error interno de prueba.',
  ),
});

const internalEntry = hiddenCatalog[0] as ErrorCatalogEntry;

describe('ProblemDetailsFactory', () => {
  describe('create', () => {
    it('builds the minimal shape from the catalog entry', () => {
      const factory = new ProblemDetailsFactory(typeBaseUrl);

      const problem = factory.create({
        entry: validationEntry,
        title: 'Falta un dato',
      });

      expect(problem).toEqual({
        type: 'https://docs.example.com/errors/PLATFORM.VALIDATION.REQUIRED',
        title: 'Falta un dato',
        status: 400,
        code: 'PLATFORM.VALIDATION.REQUIRED',
      });
      expect(problem).not.toHaveProperty('detail');
      expect(problem).not.toHaveProperty('traceId');
      expect(ProblemDetailsSchema.safeParse(problem).success).toBe(true);
    });

    it('includes the optional fields when they are provided', () => {
      const factory = new ProblemDetailsFactory(typeBaseUrl);

      const problem = factory.create({
        entry: validationEntry,
        title: 'Falta un dato',
        detail: 'Indica el código.',
        instance: '/v1/mfa/verify',
        traceId: '0193f1c2-abcd',
        errors: [{ field: 'code', code: PlatformErrorCode.ValidationRequired }],
      });

      expect(problem).toEqual({
        type: 'https://docs.example.com/errors/PLATFORM.VALIDATION.REQUIRED',
        title: 'Falta un dato',
        status: 400,
        code: 'PLATFORM.VALIDATION.REQUIRED',
        detail: 'Indica el código.',
        instance: '/v1/mfa/verify',
        traceId: '0193f1c2-abcd',
        errors: [{ field: 'code', code: 'PLATFORM.VALIDATION.REQUIRED' }],
      });
      expect(ProblemDetailsSchema.safeParse(problem).success).toBe(true);
    });

    it('hides an internal code behind PLATFORM.INTERNAL.UNEXPECTED, without detail or errors', () => {
      const factory = new ProblemDetailsFactory(typeBaseUrl);

      const problem = factory.create({
        entry: internalEntry,
        title: 'Lease lost',
        detail: 'Saga 0193 lost its lease',
        instance: '/v1/tenants',
        traceId: '0193f1c2-abcd',
        errors: [{ field: 'x', code: PlatformErrorCode.ValidationRequired }],
      });

      expect(problem).toEqual({
        type: 'https://docs.example.com/errors/PLATFORM.INTERNAL.UNEXPECTED',
        title: 'Ocurrió un error inesperado en el servidor.',
        status: 500,
        code: PlatformErrorCode.InternalUnexpected,
        instance: '/v1/tenants',
        traceId: '0193f1c2-abcd',
      });
      expect(ProblemDetailsSchema.safeParse(problem).success).toBe(true);
    });

    it('answers an internal code with the status and title of the custom unexpected entry', () => {
      const unexpected: ErrorCatalogEntry = {
        ...internalEntry,
        code: 'DEMO.INTERNAL.CRASH',
        httpStatus: 503,
        description: 'Servicio caído',
      };
      const factory = new ProblemDetailsFactory(typeBaseUrl, unexpected);

      const problem = factory.create({
        entry: internalEntry,
        title: 'Lease lost',
        traceId: '0193f1c2-abcd',
      });

      expect(problem).toEqual({
        type: 'https://docs.example.com/errors/DEMO.INTERNAL.CRASH',
        title: 'Servicio caído',
        status: 503,
        code: 'DEMO.INTERNAL.CRASH',
        traceId: '0193f1c2-abcd',
      });
    });

    it('keeps the public entry when it is not internal', () => {
      const factory = new ProblemDetailsFactory(typeBaseUrl);
      const publicEntry: ErrorCatalogEntry = {
        ...validationEntry,
        audience: ErrorAudience.Public,
      };

      const problem = factory.create({
        entry: publicEntry,
        title: 'Falta un dato',
        detail: 'Indica el código.',
      });

      expect(problem).toMatchObject({
        code: 'PLATFORM.VALIDATION.REQUIRED',
        status: 400,
        detail: 'Indica el código.',
      });
    });
  });
});
