import type { QueryValueKind } from '../enums/query-value-kind.enum.js';
import { QueryParamsCodec } from './query-params-codec.js';

/** Campo de la petición que viaja en la query, con su tipo en el contrato. */
export interface QueryParam {
  readonly name: string;
  readonly kind: QueryValueKind;
  /** Lista de escalares: el parámetro puede repetirse (`?tag=a&tag=b`). */
  readonly list: boolean;
}

/** Valor crudo de la query tal como lo entrega el servidor HTTP. */
export type RawQueryValue = string | readonly string[] | undefined;

const codec = new QueryParamsCodec();

/** Punto de entrada de `defineRoute` (una fábrica declarativa, no una clase) al codec. */
export const queryParamsOf = codec.describe.bind(codec);
