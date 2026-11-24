/** Un tramo de llaves de una tabla: después de `after` y hasta `upTo`, inclusive. Sin un extremo, no tiene límite. */
export interface KeyRange {
  readonly after?: readonly string[];
  readonly upTo?: readonly string[];
}
