# 0004. Observabilidad con OpenTelemetry y OpenObserve

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

Una petición pasa por HTTP, colas, sagas y jobs, y puede cruzar varios servicios. Hace falta ver logs, métricas y trazas enlazados por el mismo `traceId`, sin depender de un proveedor cerrado y con la misma herramienta en todos los entornos.

## Decisión

OpenTelemetry (OTel) produce logs, trazas y métricas. La instrumentación automática cubre HTTP, NestJS, `pg`, el cliente de Valkey, el SDK de AWS y `fetch`. Hay spans propios en casos de uso, pasos de saga, handlers de mensajes y jobs.

OpenObserve es la única herramienta de logs, métricas, trazas, dashboards y alertas en todos los entornos. Corre como un contenedor en local y como una tarea de Fargate con almacenamiento en S3 en AWS.

Un OpenTelemetry Collector recibe y reenvía todo: como capa ADOT en Lambda, como sidecar en Fargate y dentro de `docker-compose` en local. El `LoggerPort` escribe JSON con `trace_id` y `span_id`. La retención es de 14 días en dev y 30 en prod.

## Consecuencias

Positivas:

- Cada log abre su traza completa.
- Cambiar de backend significa cambiar la configuración del Collector.

Costos:

- OpenObserve es un servicio que el equipo opera en local y en Fargate.
- El muestreo de trazas y el volumen de logs hay que controlarlos con niveles, muestreo y contextos de debug.

## Alternativas consideradas

- SigNoz: vistas de APM más completas, sobre Docker Compose y ClickHouse. El documento la indica como alternativa si se necesita análisis de trazas más profundo.
- Cualquier backend compatible con OTel, cambiando la configuración del Collector.
