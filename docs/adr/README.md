# Registros de decisiones de arquitectura (ADR)

Un ADR documenta una decisión técnica relevante: el contexto que la motivó, lo que se eligió, sus consecuencias y las alternativas descartadas. Sirve para entender por qué el sistema es como es sin reconstruirlo desde el código.

El [registro de decisiones del plan](../plan/README.md#registro-de-decisiones) lista todas las decisiones con su fecha y enlaza al ADR que desarrolla cada una.

Los diseños de una fase o de una pieza grande viven en [`docs/design/`](../design/) y enlazan a los ADR que fijan sus decisiones.

## Cómo agregar un ADR

1. Copia `0000-plantilla.md` a un archivo nuevo con el siguiente número libre, por ejemplo `0015-nombre-en-kebab-case.md`.
2. Completa las secciones. Un ADR ocupa entre 15 y 30 líneas.
3. Pon el estado en `Propuesta` mientras se discute.
4. Cuando el equipo lo acepte, cambia el estado a `Aceptada`.
5. Si una decisión nueva reemplaza una anterior, cambia el estado del antiguo a `Reemplazada por ADR NNNN` y agrega la fila al índice. No borres el ADR antiguo.
6. Agrega la fila correspondiente al índice de este archivo.

Los números no se reutilizan. Los nombres de archivo van en kebab-case y en español.

## Índice

| Número | Título                                                                                                                       | Estado                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 0001   | [Monorepo Nx con pnpm y un microservicio por app](0001-monorepo-nx-pnpm-microservicios.md)                                   | Aceptada                 |
| 0002   | [Arquitectura hexagonal y plataforma agnóstica](0002-arquitectura-hexagonal-plataforma-agnostica.md)                         | Aceptada                 |
| 0003   | [Identificadores UUIDv7 y traceId](0003-identificadores-uuidv7-traceid.md)                                                   | Aceptada                 |
| 0004   | [Observabilidad con OpenTelemetry y OpenObserve](0004-observabilidad-opentelemetry-openobserve.md)                           | Aceptada                 |
| 0005   | [Autenticación propia con sesiones y JWT](0005-autenticacion-sesiones-jwt.md)                                                | Aceptada                 |
| 0006   | [MFA con dispositivo registrado y passkeys](0006-mfa-dispositivo-registrado-passkeys.md)                                     | Aceptada                 |
| 0007   | [Mensajería con topología tipada, SNS/SQS y CloudEvents](0007-mensajeria-topologia-tipada-sns-sqs-cloudevents.md)            | Aceptada                 |
| 0008   | [Sagas orquestadas con bitácora persistente](0008-sagas-orquestadas-bitacora-persistente.md)                                 | Aceptada                 |
| 0009   | [RDS PostgreSQL con capa de persistencia propia](0009-rds-postgresql-capa-persistencia-propia.md)                            | Reemplazada por ADR 0024 |
| 0010   | [Sharding lógico por grupos y residencia por región](0010-sharding-logico-residencia-region.md)                              | Aceptada                 |
| 0011   | [Tiempo real con Socket.IO y SSE](0011-tiempo-real-socketio-sse.md)                                                          | Modificada por ADR 0028  |
| 0012   | [Front en Flutter con shells y microfrontends](0012-front-flutter-shells-microfrontends.md)                                  | Aceptada                 |
| 0013   | [Módulo de IA con puertos y Claude por defecto](0013-modulo-ia-puertos-claude.md)                                            | Aceptada                 |
| 0014   | [Acuerdos y documentos firmados](0014-acuerdos-documentos-firmados.md)                                                       | Aceptada                 |
| 0015   | [Estructura del repositorio y código compartido por aplicación](0015-estructura-backend-front-y-codigo-compartido.md)        | Aceptada                 |
| 0016   | [Salida a Internet con NAT solo para las subredes de aplicación](0016-egress-de-red.md)                                      | Aceptada                 |
| 0017   | [Export de contratos](0017-export-de-contratos.md)                                                                           | Aceptada                 |
| 0018   | [Contrato de microfrontend](0018-contrato-de-microfrontend.md)                                                               | Aceptada                 |
| 0019   | [CI y toolchain](0019-ci-y-toolchain.md)                                                                                     | Aceptada                 |
| 0020   | [Terraform por stacks y runtime de API elegido por servicio](0020-terraform-por-stacks-y-runtime-por-servicio.md)            | Aceptada                 |
| 0021   | [Valkey como adaptador de caché, ruteo, Bloom e invalidación](0021-adaptador-valkey.md)                                      | Aceptada                 |
| 0022   | [Verificación de tokens y estado de revocación compartido](0022-verificacion-de-tokens-y-estado-de-revocacion-compartido.md) | Aceptada                 |
| 0023   | [Enrutamiento de los datos de identity entre shards](0023-enrutamiento-de-datos-de-identity.md)                              | Aceptada                 |
| 0024   | [Persistencia sobre TypeORM con sharding y sagas persistentes](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md)   | Aceptada                 |
| 0025   | [Capa NestJS por sub-entrada y puertos como clases abstractas](0025-capa-nestjs-por-sub-entrada-y-puertos-abstractos.md)     | Aceptada                 |
| 0026   | [Jobs programados: ScheduledJob, JobLock y @platform/scheduling](0026-jobs-programados-scheduledjob-y-joblock.md)            | Aceptada                 |
| 0027   | [Patrones de pantalla y pruebas compartidas del front](0027-patrones-de-pantalla-y-pruebas-del-front.md)                     | Aceptada                 |
| 0028   | [Tiempo real sobre un stream por usuario](0028-tiempo-real-sobre-un-stream-por-usuario.md)                                   | Aceptada                 |
| 0029   | [Mantenimiento entre tenants con RLS y búsqueda por shard](0029-mantenimiento-entre-tenants-y-busqueda-por-shard.md)         | Aceptada                 |
| 0030   | [Correo de identity por notifications](0030-correo-de-identity-por-notifications.md)                                         | Aceptada                 |
| 0031   | [Reportes, facturación y sagas de identity](0031-reportes-facturacion-y-sagas-de-identity.md)                                | Aceptada                 |
| 0032   | [Traslado de tenants y regiones](0032-traslado-de-tenants-y-regiones.md)                                                     | Aceptada                 |
| 0033   | [Generadores de servicio y de módulo, y OpenAPI desde los contratos](0033-generadores-y-openapi.md)                          | Aceptada                 |
