# Migraciones seguras sin downtime

## Contenido

- Principios
- Operación por operación
- Expand y contract
- Backfill por lotes
- Migración sin transacción
- Modo de transacción
- Verificación

## Principios

- La versión N y la N+1 de la app corren a la vez durante un despliegue. El esquema debe servir a las dos.
- Cada migración es pequeña, una intención. Esquema y datos van separados.
- Tras aplicarse en un ambiente, una migración es inmutable. Se corrige con otra.
- En producción solo se avanza. `migration-revert` es para desarrollo y emergencias, y la reversa del `down` debe estar probada.
- Se prueban con volumen parecido al de producción: una migración rápida con 100 filas puede bloquear con 10 millones.
- Ponle a la migración un tope de bloqueo para que falle en vez de encolar a toda la app: `SET LOCAL lock_timeout = '5s'`.

## Operación por operación

- Agregar columna: peligrosa: `NOT NULL` sin default en tabla grande con versiones viejas escribiendo; segura: Agregar nullable (o con default constante), backfill, luego `CHECK ... NOT VALID` y `VALIDATE CONSTRAINT`, luego `SET NOT NULL`
- Agregar índice: peligrosa: `CREATE INDEX` normal: bloquea escrituras; segura: `CREATE INDEX CONCURRENTLY` en migración sin transacción
- Índice único: peligrosa: Crearlo directo sobre datos que pueden duplicarse; segura: Limpiar duplicados, `CREATE UNIQUE INDEX CONCURRENTLY`, luego `ADD CONSTRAINT ... USING INDEX`
- Agregar clave foránea: peligrosa: `ADD FOREIGN KEY` directo: bloquea ambas tablas; segura: `ADD CONSTRAINT ... NOT VALID`, luego `VALIDATE CONSTRAINT`
- Renombrar columna: peligrosa: `RENAME COLUMN` con la app vieja leyéndola; segura: Expand y contract
- Cambiar tipo: peligrosa: `ALTER COLUMN TYPE`: reescribe la tabla; segura: Columna nueva, doble escritura, backfill, cambio de lectura, borrar la vieja
- Borrar columna: peligrosa: Mientras el código aún la usa; segura: Quitar el uso del código, desplegar, luego borrarla en otra migración
- Borrar tabla: peligrosa: Igual; segura: Igual, y tras un periodo sin lecturas

El generador de TypeORM propone `DROP` más `ADD` en renombres y cambios de tipo, y `CREATE INDEX` sin `CONCURRENTLY`. Se reescribe a mano antes del commit. Se conserva el resultado del generador y se edita; no se escribe todo desde cero.

## Expand y contract

Un renombre de `users.name` a `users.full_name`, en tres despliegues:

1. Expand. Migración 1 agrega `full_name` nullable. La app N+1 escribe en las dos columnas y lee de `name`.
2. Migrate. Migración 2 hace el backfill por lotes. La app lee de `full_name` y sigue escribiendo en las dos. Se verifica la igualdad.
3. Contract. La app deja de usar `name`. Migración 3, en un despliegue posterior, borra `name`.

Cada fase es un despliegue y una migración distintos. La entidad refleja el esquema de la fase, no el final.

## Backfill por lotes

```ts
export class BackfillUserFullName1731000000000 implements MigrationInterface {
  name = 'BackfillUserFullName1731000000000';
  transaction = false as const;

  async up(queryRunner: QueryRunner): Promise<void> {
    let updated: number;
    do {
      const result = await queryRunner.query(
        `WITH batch AS (
           SELECT id FROM users WHERE full_name IS NULL
           ORDER BY id LIMIT 5000 FOR UPDATE SKIP LOCKED)
         UPDATE users SET full_name = name FROM batch WHERE users.id = batch.id`,
      );
      updated = result[1];
    } while (updated > 0);
  }

  async down(): Promise<void> {
    // No hay nada que deshacer: la columna vieja sigue intacta.
  }
}
```

- Lotes de miles de filas, cada uno en su commit. Se detiene cuando un lote no actualiza nada.
- Un backfill muy grande se corre como job, no como migración, para no retener el despliegue.

## Migración sin transacción

`CREATE INDEX CONCURRENTLY` no corre dentro de una transacción. TypeORM envuelve las migraciones en una transacción según `migrationsTransactionMode` (`all` por defecto, `each`, `none`). Se declara por migración con `transaction = false` en la clase, o se aplica `none` al comando. Una migración con operaciones concurrentes no mezcla otros cambios, porque sin transacción no se deshace a medias.

```ts
export class AddUserEmailIndex1731000000001 implements MigrationInterface {
  name = 'AddUserEmailIndex1731000000001';
  transaction = false as const;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS idx_users_email`,
    );
  }
}
```

Si `CONCURRENTLY` falla deja un índice inválido: `DROP INDEX` y reintenta. Por eso se escribe con `IF NOT EXISTS`.

## Modo de transacción

- `migrationsTransactionMode: 'each'` para que una migración fallida no deshaga las anteriores ya aplicadas, y cada una quede registrada en la tabla de migraciones.
- Todas bajo `pg_advisory_lock`, una sola tarea a la vez por base.
- Con shards, el migrador recorre cada shard y el catálogo; un shard que falla se reporta y no bloquea el resto, y el despliegue no avanza hasta que todos queden al día.

## Verificación

```
- [ ] La app anterior funciona con el esquema nuevo
- [ ] La app nueva funciona con el esquema anterior (para el rollback)
- [ ] Sin bloqueos largos: lock_timeout definido
- [ ] Índices nuevos CONCURRENTLY en migración sin transacción
- [ ] Backfill por lotes y en migración aparte
- [ ] down probado, o declarado irreversible
- [ ] Probada sobre una copia con volumen real
- [ ] migration-generate después no produce diferencias
```
