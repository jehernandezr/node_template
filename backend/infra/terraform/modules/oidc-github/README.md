# Módulo oidc-github

Acceso de GitHub Actions a la cuenta AWS por OIDC, sin claves de larga vida. Crea los tres roles que usa el pipeline de despliegue y el bucket de artefactos.

## Qué crea

- Proveedor OIDC de `token.actions.githubusercontent.com`, o reutiliza uno existente con `existing_provider_arn`.
- Bucket `<name_prefix>-artifacts-<cuenta>` para los bundles de Lambda y los compilados móviles: versionado, cifrado SSE y acceso solo por TLS.
- Tres roles, cada uno con confianza solo en `repo:<github_repository>:environment:<github_environment>`, sin comodines:
  - `<name_prefix>-github-deploy`: estado de Terraform en `state_bucket`, lectura del bucket de artefactos y las políticas de `deploy_policy_arns`.
  - `<name_prefix>-github-publish`: empuje a ECR bajo `<name_prefix>/*`, con permiso para crear repositorios, y escritura en el bucket de artefactos.
  - `<name_prefix>-github-web`: bucket `<name_prefix>-web-<cuenta>`, permiso KMS solo a través de S3, listado de distribuciones e invalidaciones de CloudFront.

## Entradas principales

| Variable                  | Descripción                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| `name_prefix`             | Prefijo de roles, bucket y repositorios, por ejemplo `node-template-dev`.   |
| `github_repository`       | Repositorio con forma `dueño/nombre`.                                       |
| `github_environment`      | Environment de GitHub que puede asumir los roles.                           |
| `create_provider`         | `true` crea el proveedor OIDC; `false` exige `existing_provider_arn`.       |
| `existing_provider_arn`   | ARN del proveedor que ya existe en la cuenta.                               |
| `state_bucket`            | Bucket de los estados del ambiente, que el rol de despliegue lee y escribe. |
| `deploy_policy_arns`      | Políticas administradas que se suman al rol de despliegue.                  |
| `artifacts_force_destroy` | Permite borrar el bucket de artefactos con contenido. Solo en desechables.  |

## Salidas

`provider_arn`, `deploy_role_arn`, `publish_role_arn`, `web_role_arn`, `artifacts_bucket` y `ecr_repository_prefix`. El stack `platform` las expone en `github_oidc`.

## Notas

- El proveedor OIDC es uno por cuenta. En el segundo ambiente o región de la misma cuenta, usa `create_provider = false` y pasa el ARN del primero.
- La confianza es por repositorio y environment de GitHub, sin comodines. El environment con el mismo nombre que el ambiente es el que acepta la política; en prod ponle revisores requeridos.
- `deploy_policy_arns` lo elige quien despliega. La plantilla no asume un alcance: sin esas políticas, el rol de despliegue solo llega al estado y a los artefactos.
- El módulo no concede permisos de la aplicación a ningún servicio.
