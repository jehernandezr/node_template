# Registros de decisiones de arquitectura (ADR)

Un ADR documenta una decisión técnica relevante: el contexto que la motivó, lo que se eligió, sus consecuencias y las alternativas descartadas. Sirve para entender por qué el sistema es como es sin reconstruirlo desde el código.

Las decisiones del plan inicial están en [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), sección "Decisiones". Cada ADR de esta carpeta desarrolla una de esas decisiones.

## Cómo agregar un ADR

1. Copia `0000-plantilla.md` a un archivo nuevo con el siguiente número libre, por ejemplo `0015-nombre-en-kebab-case.md`.
2. Completa las secciones. Un ADR ocupa entre 15 y 30 líneas.
3. Pon el estado en `Propuesta` mientras se discute.
4. Cuando el equipo lo acepte, cambia el estado a `Aceptada`.
5. Si una decisión nueva reemplaza una anterior, cambia el estado del antiguo a `Reemplazada por ADR NNNN` y agrega la fila al índice. No borres el ADR antiguo.
6. Agrega la fila correspondiente al índice de este archivo.

Los números no se reutilizan. Los nombres de archivo van en kebab-case y en español.

## Índice

| Número | Título                                                                                                            | Estado   |
| ------ | ----------------------------------------------------------------------------------------------------------------- | -------- |
| 0001   | [Monorepo Nx con pnpm y un microservicio por app](0001-monorepo-nx-pnpm-microservicios.md)                        | Aceptada |
| 0002   | [Arquitectura hexagonal y plataforma agnóstica](0002-arquitectura-hexagonal-plataforma-agnostica.md)              | Aceptada |
| 0003   | [Identificadores UUIDv7 y traceId](0003-identificadores-uuidv7-traceid.md)                                        | Aceptada |
| 0004   | [Observabilidad con OpenTelemetry y OpenObserve](0004-observabilidad-opentelemetry-openobserve.md)                | Aceptada |
| 0005   | [Autenticación propia con sesiones y JWT](0005-autenticacion-sesiones-jwt.md)                                     | Aceptada |
| 0006   | [MFA con dispositivo registrado y passkeys](0006-mfa-dispositivo-registrado-passkeys.md)                          | Aceptada |
| 0007   | [Mensajería con topología tipada, SNS/SQS y CloudEvents](0007-mensajeria-topologia-tipada-sns-sqs-cloudevents.md) | Aceptada |
| 0008   | [Sagas orquestadas con bitácora persistente](0008-sagas-orquestadas-bitacora-persistente.md)                      | Aceptada |
| 0009   | [RDS PostgreSQL con capa de persistencia propia](0009-rds-postgresql-capa-persistencia-propia.md)                 | Aceptada |
| 0010   | [Sharding lógico por grupos y residencia por región](0010-sharding-logico-residencia-region.md)                   | Aceptada |
| 0011   | [Tiempo real con Socket.IO y SSE](0011-tiempo-real-socketio-sse.md)                                               | Aceptada |
| 0012   | [Front en Flutter con shells y microfrontends](0012-front-flutter-shells-microfrontends.md)                       | Aceptada |
| 0013   | [Módulo de IA con puertos y Claude por defecto](0013-modulo-ia-puertos-claude.md)                                 | Aceptada |
| 0014   | [Acuerdos y documentos firmados](0014-acuerdos-documentos-firmados.md)                                            | Aceptada |
| 0016   | [Salida a Internet con NAT solo para las subredes de aplicación](0016-egress-de-red.md)                           | Aceptada |
