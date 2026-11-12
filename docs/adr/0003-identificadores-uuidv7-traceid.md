# 0003. Identificadores UUIDv7 y traceId

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

Los servicios generan eventos, sagas, jobs y registros de auditoría que deben identificarse sin depender de la base de datos. Además, las consultas paginadas y los índices se benefician de identificadores que crezcan en el tiempo, y la trazabilidad necesita un identificador compatible con OpenTelemetry y X-Ray.

## Decisión

Todo identificador es un UUIDv7: usuarios, tenants, sesiones, dispositivos, eventos, sagas, jobs, archivos, facturas y el `traceId`.

- La aplicación genera el ID (librería `uuid`, puerto `IdGenerator`) antes de persistir la entidad. En TypeORM se usa `@PrimaryColumn('uuid')`.
- El `traceId` es un UUIDv7 generado al entrar al sistema. Sus 128 bits sin guiones forman un trace-id W3C válido dentro de `traceparent`.
- La paginación usa el ID como cursor (`?after=<id>`).
- Los secretos (refresh tokens, `mfaToken`, OTP, tokens de reset y API keys) no usan UUIDv7. Usan 256 bits aleatorios de `crypto.randomBytes`.

## Consecuencias

Positivas:

- La entidad tiene identidad antes de guardarse, lo que simplifica eventos y sagas.
- Los índices de PostgreSQL crecen en orden y el ID sirve como cursor.
- El `traceId` se puede usar tal cual en `traceparent` y en X-Ray.

Costos:

- Un UUIDv7 revela su fecha de creación al milisegundo. En IDs públicos donde esa fecha sea sensible hay que tenerlo en cuenta.

## Alternativas consideradas

El documento no registra alternativas evaluadas para el formato de los identificadores.
