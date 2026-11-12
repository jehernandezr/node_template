# Módulo ecs-cluster

Clúster ECS para Fargate con los capacity providers `FARGATE` y `FARGATE_SPOT`, Container Insights y ECS Exec auditado.

## Qué crea

- Clúster ECS con Container Insights (`enhanced` por defecto).
- Capacity providers `FARGATE` y `FARGATE_SPOT`, con una estrategia por defecto configurable.
- Log group `/ecs/<name_prefix>/exec` cifrado con KMS para las sesiones de ECS Exec. El comando y su salida quedan registrados.
- Clave KMS con rotación anual, o la que pases en `kms_key_arn`.

## Entradas principales

| Variable                             | Descripción                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `name_prefix`                        | Prefijo y nombre del clúster.                                                     |
| `container_insights`                 | `enhanced`, `enabled` o `disabled`.                                               |
| `default_capacity_provider_strategy` | Lista de `capacity_provider`, `weight` y `base`.                                  |
| `kms_key_arn`                        | Clave existente. Debe permitir a `logs.<región>.amazonaws.com` sobre `/ecs/<name_prefix>/*`. |

## Salidas

`cluster_arn`, `cluster_name`, `cluster_id`, `kms_key_arn`, `exec_log_group_name`.

## Uso

```hcl
module "ecs_cluster" {
  source      = "../../modules/ecs-cluster"
  name_prefix = "nt-dev"
}
```

Los módulos `service-fargate` y `observability` reciben `cluster_arn` y `cluster_name`.
