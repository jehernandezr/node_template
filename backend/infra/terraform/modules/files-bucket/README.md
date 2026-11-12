# Módulo files-bucket

Bucket S3 privado para los archivos de los usuarios. Los clientes suben y descargan con URLs prefirmadas.

## Qué crea

- Bucket `<name_prefix>-files-<cuenta>` con bloqueo total de acceso público y propiedad `BucketOwnerEnforced`.
- Cifrado SSE-KMS con bucket key. La clave KMS es del módulo (rotación anual) o la que pases en `kms_key_arn`.
- Versionado, con expiración de versiones no vigentes (90 días por defecto).
- Ciclo de vida: aborta subidas multipart a los 7 días, expira el prefijo `tmp/` a 1 día (subidas sin confirmar) y pasa a Intelligent-Tiering a los 30 días.
- CORS para presigned PUT, GET y HEAD solo desde los orígenes indicados.
- Política del bucket que deniega todo tráfico sin TLS y con TLS menor a 1.2.

## Entradas principales

| Variable                     | Descripción                                                              |
| ---------------------------- | ------------------------------------------------------------------------ |
| `name_prefix`                | Prefijo del bucket y la clave.                                           |
| `cors_allowed_origins`       | Orígenes explícitos; no se admite `*`.                                   |
| `versioning_enabled`         | Versionado activo por defecto.                                           |
| `temporary_prefix`           | Prefijo de subidas pendientes que expira (`tmp/`).                       |
| `intelligent_tiering_days`   | Días para pasar a Intelligent-Tiering; null lo desactiva.                |
| `kms_key_arn`                | Clave existente opcional.                                                |
| `force_destroy`              | Solo para entornos desechables.                                          |

## Salidas

`bucket_id`, `bucket_arn`, `bucket_regional_domain_name`, `kms_key_arn`, `read_write_policy_json`.

## Permisos

El módulo no concede acceso a ningún rol. El servicio `files` adjunta `read_write_policy_json` a su rol de tarea o función, y firma las URLs con ese rol.
