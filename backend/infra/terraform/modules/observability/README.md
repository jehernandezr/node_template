# Módulo observability

OpenObserve en un solo nodo sobre Fargate. Recibe logs, métricas y trazas por OTLP HTTP desde los collectors de los servicios y las Lambdas.

## Qué crea

- Servicio ECS de una tarea con OpenObserve (ARM64 por defecto). Los datos de telemetría van a un bucket S3 cifrado con KMS; los metadatos (usuarios, dashboards, alertas) viven en SQLite sobre EFS cifrado con KMS y con backup.
- Secreto en Secrets Manager con el usuario raíz, una contraseña generada y la cabecera `Authorization` lista para los exporters OTLP. Terraform genera la contraseña, así que queda en el estado: protege el bucket del estado.
- Clave KMS con rotación para el secreto, el bucket, EFS y los logs.
- Entrada por un ALB interno propio (por defecto) o por una regla en el listener de un ALB existente.
- Roles de ejecución y de tarea de mínimo privilegio, security groups y log group con KMS.

## Entradas principales

| Variable                           | Descripción                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `cluster_arn`                      | Clúster ECS (módulo `ecs-cluster`).                                                                        |
| `vpc_id`, `vpc_cidr`, `subnet_ids` | Red privada.                                                                                               |
| `create_internal_alb`              | `true` crea un ALB interno. `false` requiere `alb_listener_arn`, `alb_security_group_id` y `host_headers`. |
| `internal_alb_certificate_arn`     | Si es null, el ALB interno atiende HTTP en el puerto 80 solo dentro de la VPC.                             |
| `root_user_email`                  | Usuario raíz.                                                                                              |
| `image`                            | Imagen fijada por versión. Revisa la versión antes de aplicar.                                             |
| `data_retention_days`              | Retención de datos (30 por defecto).                                                                       |

## Salidas

`otlp_http_endpoint`, `console_url`, `secret_arn`, `otlp_authorization_value_from`, `kms_key_arn`, `storage_bucket_name`, `service_name`, `security_group_id`, `alb_dns_name`, `alb_zone_id`.

## Cómo se conectan los servicios

```hcl
module "reports" {
  source = "../../modules/service-fargate"
  # ...
  otlp_endpoint             = module.observability.otlp_http_endpoint
  otlp_authorization_secret = module.observability.otlp_authorization_value_from
  secrets_kms_key_arns      = [module.observability.kms_key_arn]
}
```

Para Lambda, el collector de la capa ADOT usa el mismo endpoint y la cabecera guardada en el secreto.

## Límites

- Es un solo nodo: una tarea a la vez, y el despliegue detiene la anterior antes de iniciar la nueva. Hay unos minutos sin ingesta en cada cambio de versión; los collectors reintentan. Para alta disponibilidad se necesita el modo clúster de OpenObserve con NATS y PostgreSQL, fuera del alcance de este módulo.
- Solo se expone OTLP HTTP. OTLP gRPC requiere un listener HTTPS con target group gRPC.
- El ALB interno no guarda access logs.
