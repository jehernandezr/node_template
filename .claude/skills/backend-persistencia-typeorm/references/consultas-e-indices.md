# Consultas, N+1 e índices

## Contenido

- N+1
- Cargar relaciones
- Paginación
- Índices
- Sondeo con EXPLAIN

## N+1

Una consulta dentro de un bucle es un defecto.

```ts
// Mal: una consulta por pedido
for (const order of orders) {
  order.lines = await manager.find(OrderLineEntity, {
    where: { orderId: order.id },
  });
}

// Bien: una consulta para todos
const lines = await manager.find(OrderLineEntity, {
  where: { orderId: In(orders.map((order) => order.id)) },
});
const linesByOrder = Map.groupBy(lines, (line) => line.orderId);
```

- Para listados, una consulta con `QueryBuilder` y `leftJoin` más `select` explícito, o dos consultas con `In(...)`.
- `In(...)` con listas acotadas (por ejemplo, 1000 ids por lote).
- Dentro de un caso de uso, cargar el agregado con todo lo que necesita en una operación, no relación por relación.
- Una prueba de integración puede contar consultas (logger de TypeORM en la prueba) y fallar si superan lo esperado.

## Cargar relaciones

- Sin `eager` ni `lazy`. La carga se pide en la consulta (`relations` o `join`).
- No se hace `find` de la entidad completa para leer dos columnas: `select`.
- Nunca se devuelve una entidad ORM fuera de `infrastructure/`.

## Paginación

- Por cursor con el id UUIDv7 (`?after=<id>`, `ORDER BY id`), no por `OFFSET`. Los UUIDv7 crecen con el tiempo, así que el cursor también ordena por creación.
- Todo listado tiene `LIMIT` máximo, impuesto en el esquema zod de la petición.
- `COUNT(*)` exacto solo si el producto lo pide; es costoso en tablas grandes.

## Índices

- Toda columna de filtro, unión u orden frecuente tiene índice. Un índice compuesto sigue el orden: igualdades primero, luego rango u orden.
- Llaves de shard (`tenant_id`) van primero en índices compuestos de tablas por tenant.
- Unicidad por regla de negocio: índice `UNIQUE` (parcial si hay borrado lógico: `WHERE deleted_at IS NULL`). El código verifica por cortesía; la base garantiza.
- Cada índice cuesta en escritura: se agrega con una consulta real que lo use y se elimina el redundante.
- Un índice nuevo en una tabla grande se crea `CONCURRENTLY` en una migración sin transacción (ver `migraciones-sin-downtime.md`).
- Claves foráneas en columnas de id: PostgreSQL no las indexa solo.

## Sondeo con EXPLAIN

Antes de integrar una consulta nueva sobre una tabla grande: `EXPLAIN (ANALYZE, BUFFERS)` con volumen realista. Un `Seq Scan` en una tabla grande con filtro selectivo pide un índice. Las consultas lentas ya se registran con `DB_SLOW_QUERY_MS` (`maxQueryExecutionTime`).
