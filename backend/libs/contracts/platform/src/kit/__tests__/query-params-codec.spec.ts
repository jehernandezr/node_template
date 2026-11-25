import { z } from 'zod';
import { HttpMethod } from '../../enums/http-method.enum.js';
import { QueryValueKind } from '../../enums/query-value-kind.enum.js';
import { Access } from '../access.js';
import { defineRoute } from '../define-route.js';
import { QueryParamsCodec } from '../query-params-codec.js';

describe('QueryParamsCodec', () => {
  describe('decode', () => {
    const codec = new QueryParamsCodec();
    const route = defineRoute({
      id: 'sample.items.search',
      method: HttpMethod.Get,
      path: '/v1/items',
      request: z.strictObject({
        limit: z.int().min(1).max(100).optional(),
        archived: z.boolean().optional(),
        ratio: z.number().optional(),
        tags: z.array(z.string()).optional(),
        sizes: z.array(z.int()).optional(),
        name: z.string().optional(),
      }),
      access: Access.public(),
      description: 'Busca.',
    });

    it('converts the query text to the contract types', () => {
      const decoded = codec.decode(route, {
        limit: '20',
        archived: 'false',
        ratio: '-1.5e2',
        tags: 'a',
        sizes: ['1', '2'],
        name: '42',
        ignored: undefined,
      });

      expect(decoded).toEqual({
        limit: 20,
        archived: false,
        ratio: -150,
        tags: ['a'],
        sizes: [1, 2],
        name: '42',
      });
      expect(route.request.safeParse(decoded).success).toBe(true);
    });

    it('keeps what it cannot convert so validation reports the field', () => {
      const decoded = codec.decode(route, {
        limit: '2x',
        archived: 'yes',
        name: ['a', 'b'],
        extra: '1',
      });

      expect(decoded).toEqual({
        limit: '2x',
        archived: 'yes',
        name: ['a', 'b'],
        extra: '1',
      });
      expect(route.request.safeParse(decoded).success).toBe(false);
    });
  });

  describe('describe', () => {
    const codec = new QueryParamsCodec();
    const fail = (reason: string): never => {
      throw new Error(reason);
    };

    it.each([
      [z.string(), QueryValueKind.String, false],
      [z.number(), QueryValueKind.Number, false],
      [z.int(), QueryValueKind.Number, false],
      [z.boolean(), QueryValueKind.Boolean, false],
      [z.enum(['a', 'b']), QueryValueKind.String, false],
      [z.literal(1), QueryValueKind.Number, false],
      [z.string().optional(), QueryValueKind.String, false],
      [z.array(z.int()), QueryValueKind.Number, true],
    ])(
      'describes the scalar or list field %# with its kind and list flag',
      (schema, kind, list) => {
        const params = codec.describe({ field: schema }, () => true, fail);

        expect(params).toEqual([{ name: 'field', kind, list }]);
      },
    );

    it.each([
      [z.string().nullable(), 'the query cannot carry null; use optional'],
      [z.object({}), 'must be a scalar or a list of scalars'],
      [z.array(z.string().nullable()), 'the query cannot carry null'],
    ])(
      'rejects the query field %# with the reason for its shape',
      (schema, reason) => {
        expect(() =>
          codec.describe({ field: schema }, () => true, fail),
        ).toThrow(reason);
      },
    );

    it('describes only the fields that the include filter accepts', () => {
      const params = codec.describe(
        { a: z.string(), b: z.string() },
        (name) => name === 'b',
        fail,
      );

      expect(params).toEqual([
        { name: 'b', kind: QueryValueKind.String, list: false },
      ]);
    });
  });
});
