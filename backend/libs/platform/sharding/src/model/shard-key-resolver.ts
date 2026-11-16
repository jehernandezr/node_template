/**
 * Produce la clave de enrutamiento de un módulo que reparte por una clave
 * propia (`ShardKey.Custom`), por ejemplo un id de cuenta o una región de negocio.
 * @typeParam TSource lo que entrega la capa de persistencia: la entidad, el criterio o la petición.
 */
export interface ShardKeyResolver<TSource = unknown> {
  /** @returns la clave de enrutamiento, o `undefined` si la fuente no trae una (la consulta se detiene). */
  resolve(source: TSource): string | undefined;
}
