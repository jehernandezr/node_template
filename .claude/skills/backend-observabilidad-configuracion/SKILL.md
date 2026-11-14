---
name: backend-observabilidad-configuracion
description: Configuración validada, logging estructurado, trazas, métricas, health checks y apagado ordenado del backend de node_template. Config tipada con zod que falla al arrancar, LoggerPort con trace_id, OpenTelemetry, niveles de log, readiness y liveness, y timeouts. Úsala al agregar una variable de entorno, un log, una métrica, un span, un endpoint de salud o un cliente con timeout.
---

# Configuración y observabilidad

Referencias: ADR 0004 (OpenTelemetry y OpenObserve), ADR 0003 (el `traceId` es un UUIDv7).

## Configuración validada

- Toda variable de entorno se declara en un esquema zod de `@platform/config`, con tipo, valor por defecto razonable y descripción. Se valida una sola vez al arrancar: si falta o es inválida, el proceso no arranca y el mensaje dice qué variable y por qué, sin imprimir el valor de un secreto.
- El resultado es un objeto tipado e inmutable que se inyecta (`AppConfig`). Nadie lee `process.env` fuera de `@platform/config`.
- Configuración agrupada por tema (`database`, `messaging`, `auth`), no una lista plana. Los números llevan unidad en el nombre (`timeoutMs`, `ttlSeconds`).
- Los valores que dependen del ambiente (URLs, tamaños de pool) vienen del entorno. Las reglas de negocio no son configuración: son código.
- Cambiar una opción de comportamiento en caliente (nivel de log) pasa por un feature flag, no por reiniciar.
- Variable nueva: se agrega al esquema, a `.env.example` y a Terraform en el mismo cambio.

```ts
export const databaseConfigSchema = z.strictObject({
  DB_URL: z.string().url(),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  DB_SLOW_QUERY_MS: z.coerce.number().int().min(1).default(500),
});
```

## Logging estructurado

- Siempre por `LoggerPort` inyectado, nunca `console.log`. JSON a stdout (o OTLP), con `trace_id` y `span_id`.
- Un mensaje fijo y los datos como campos, no interpolados: `logger.info('user registered', { userId })`. Así se filtran y se agregan.
- Niveles: `error` para lo que pide acción, `warn` para degradación recuperable, `info` para eventos de negocio relevantes y cambios de estado, `debug` para diagnóstico (apagado por defecto, muestreo con `LOG_SAMPLE_RATE` y `LOG_DEBUG_CONTEXTS`).
- Un error se registra una sola vez, donde se maneja (el filtro, el manejador del consumidor), con su causa. No se registra y se vuelve a lanzar en cada capa.
- Nunca secretos, tokens, contraseñas, documentos ni correos completos. Se registran ids.
- El contexto (`tenantId`, `actorId`, `traceId`) viene del contexto asíncrono, no se pasa a mano por cada método.
- Cada petición, mensaje y job crea o continúa un `traceId` (UUIDv7) y lo devuelve o propaga (`traceparent`).

## Trazas y métricas

- La instrumentación automática cubre HTTP, NestJS, base, Valkey, AWS y `fetch`. Se agregan spans propios en casos de uso, pasos de saga, consumidores y jobs, con nombre estable (`users.sign_in`) y atributos de baja cardinalidad.
- Métricas con etiquetas acotadas: nunca ids de usuario o de tenant como etiqueta.
- Cada caso de uso crítico mide latencia y tasa de error. Cada cola mide profundidad, antigüedad del mensaje más viejo y DLQ.
- Un manejador de errores central por tipo de disparador cuenta y registra los errores, ver `backend-errores`.

## Health y apagado

- `GET /health/live`: el proceso responde. No toca dependencias.
- `GET /health/ready`: la base, la caché y la config esenciales responden, con tiempo límite corto. Si falla, el balanceador deja de enviar tráfico, pero el proceso no se reinicia.
- Apagado ordenado con `enableShutdownHooks()`: deja de aceptar tráfico, termina lo que está en curso, cierra consumidores, luego pools. El plazo es menor que el del orquestador.
- Sin PM2 ni reinicio propio: la plataforma reinicia.

## Timeouts y resiliencia

- Toda llamada de red lleva timeout, y toda llamada que se reintenta es idempotente. Se usa `@platform/resilience` (timeout, backoff con jitter, circuit breaker), no bucles propios.
- El presupuesto total de una operación (intentos más esperas) cabe en su plazo.
- Una dependencia caída degrada con elegancia cuando existe alternativa (caché obsoleta), y si no, responde 503 con `Retry-After`.

## Revisión

```
- [ ] Variable nueva en esquema zod, .env.example y Terraform
- [ ] Nadie lee process.env fuera de @platform/config
- [ ] Logs con mensaje fijo, campos y sin datos sensibles
- [ ] Span propio en el caso de uso o consumidor nuevo
- [ ] Timeout en cada llamada de red nueva
```
