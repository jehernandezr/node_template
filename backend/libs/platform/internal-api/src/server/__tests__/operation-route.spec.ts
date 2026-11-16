import { Compensation, defineOperation } from '@contracts/platform';
import { z } from 'zod';
import { OperationResolver } from '../../contract/operation-resolver.js';
import { OperationMetadata } from '../../contract/operation-metadata.js';
import { OperationRoute } from '../operation-route.js';
import { ScriptedHandler } from './utils/scripted-handler.js';
import { ServerHarness } from './utils/server-harness.js';

const Reserve = defineOperation({
  id: 'stock.reserve.v1',
  input: z.object({ sku: z.string() }),
  output: z.object({ reservationId: z.string() }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Reserva sin efectos externos que deshacer',
  errors: [ServerHarness.OUT_OF_STOCK],
  description: 'Reserves stock.',
});

describe('OperationRoute', () => {
  describe('bind', () => {
    it('bind, descriptor and handler, keeps both', () => {
      const descriptor = new OperationResolver().resolve(Reserve);
      const handler = new ScriptedHandler();

      const route = OperationRoute.bind(descriptor, handler);

      expect(route.descriptor).toBe(descriptor);
      expect(route.handler).toBe(handler);
    });

    it('bind, declared errors, allows them and the invalid input code', () => {
      const descriptor = new OperationResolver().resolve(Reserve);

      const route = OperationRoute.bind(descriptor, new ScriptedHandler());

      expect([...route.allowedCodes].sort()).toEqual(
        [
          ServerHarness.OUT_OF_STOCK,
          OperationMetadata.INVALID_INPUT_CODE,
        ].sort(),
      );
    });
  });
});
