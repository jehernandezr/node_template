# 0002. Arquitectura hexagonal y plataforma agnóstica

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

La plataforma despliega en AWS, pero migrar a otra nube no debería obligar a reescribir la lógica de negocio. Cada servicio necesita una estructura interna que separe el dominio de NestJS, TypeORM y AWS.

## Decisión

Arquitectura hexagonal estricta. El dominio y los casos de uso no importan NestJS, TypeORM ni AWS. Cada capacidad externa es un puerto en `libs/platform/capabilities` con un adaptador por proveedor, y cada módulo elige su adaptador por configuración.

- `@aws-sdk/*` solo aparece en `libs/platform/adapters/aws`.
- Las entradas (endpoints, eventos, jobs, operaciones internas y tiempo real) se declaran con decoradores de la plataforma y llaman casos de uso.
- Un adaptador de entrada por runtime traduce Lambda, Fargate, contenedor, Kubernetes o local a esas declaraciones.
- La topología de mensajería, los jobs y los buckets se declaran de forma abstracta. Terraform de AWS lee esas declaraciones.

## Consecuencias

Positivas:

- Cambiar de nube significa escribir adaptadores nuevos y otro Terraform, sin tocar el negocio.
- Cambiar de runtime significa cambiar el adaptador de entrada.

Costos:

- Cada puerto tiene al menos dos adaptadores (AWS y local) que mantener y probar.
- Hay que verificar la regla de dependencias en CI, o la separación se pierde con el tiempo.

## Alternativas consideradas

El documento no compara este estilo con otras arquitecturas. Registra proveedores alternativos para cada puerto:

- Tópicos: Google Pub/Sub o Kafka.
- Colas: RabbitMQ, o BullMQ sobre Valkey en local.
- Archivos: Google Cloud Storage o Azure Blob.
- Jobs programados: Cloud Scheduler o CronJob de Kubernetes.
- Feature flags: flagd o AppConfig.
- Secretos: Vault.
- Cómputo: cualquier contenedor.
