import { z } from 'zod';
import { defineServiceContract } from '@contracts/platform';
import { ExportError } from '../export-error.js';
import { SchemaOwnership } from '../schema-ownership.js';

describe('SchemaOwnership', () => {
  describe('of', () => {
    it('maps each schema of every contract to its service and name', () => {
      const session = z.object({ id: z.string() });
      const invoice = z.object({ total: z.number() });
      const identity = defineServiceContract({
        service: 'identity',
        description: 'Identidad.',
        schemas: { Session: session },
      });
      const billing = defineServiceContract({
        service: 'billing',
        description: 'Facturación.',
        schemas: { Invoice: invoice },
      });

      const owners = new SchemaOwnership().of([identity, billing]);

      expect(owners.get(session)).toEqual({
        service: 'identity',
        name: 'Session',
      });
      expect(owners.get(invoice)).toEqual({
        service: 'billing',
        name: 'Invoice',
      });
    });

    it('fails when the same schema object is registered by two contracts', () => {
      const shared = z.object({ id: z.string() });
      const identity = defineServiceContract({
        service: 'identity',
        description: 'Identidad.',
        schemas: { Shared: shared },
      });
      const platform = defineServiceContract({
        service: 'platform',
        description: 'Plataforma.',
        schemas: { Other: shared },
      });

      const attempt = () => new SchemaOwnership().of([identity, platform]);

      expect(attempt).toThrow(ExportError);
      expect(attempt).toThrow('ya está registrado como');
    });
  });
});
