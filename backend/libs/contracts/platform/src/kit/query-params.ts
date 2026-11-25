import type { QueryValueKind } from '../enums/query-value-kind.enum.js';
import { QueryParamsCodec } from './query-params-codec.js';

/** Request field that travels in the query, with its type in the contract. */
export interface QueryParam {
  readonly name: string;
  readonly kind: QueryValueKind;
  /** List of scalars: the parameter can repeat (`?tag=a&tag=b`). */
  readonly list: boolean;
}

/** Raw query value as the HTTP server delivers it. */
export type RawQueryValue = string | readonly string[] | undefined;

const codec = new QueryParamsCodec();

/** Entry point from `defineRoute` (a declarative factory, not a class) to the codec. */
export const queryParamsOf = codec.describe.bind(codec);
