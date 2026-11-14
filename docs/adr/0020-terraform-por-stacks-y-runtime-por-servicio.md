# 0020. Terraform por stacks y runtime de API elegido por servicio

- Estado: Aceptada
- Fecha: 2026-11-13

## Contexto

El plan pide una raíz `platform` y una raíz por servicio con estado propio, API Gateway HTTP detrás de CloudFront con WAF y una base por servicio dentro de la instancia RDS compartida. La primera versión tenía una sola raíz con los servicios en un mapa, las APIs en Fargate detrás de un ALB público, un esquema por servicio en una base `platform` y lectura por un RDS Proxy que no admite réplicas fuera de Aurora. Desplegar un servicio planeaba toda la plataforma y AWS divergía del entorno local.

## Decisión

- Estructura (la misma del proyecto Solventa): `modules/`, `stacks/<capa>` y `environments/<ambiente>/<stack>/{backend.tfvars,terraform.tfvars}`. Cada stack tiene `config.tf` con backend S3 vacío, `remote_state.tf` y un `variables_common.tf` idéntico en todos. Stacks: `network`, `platform`, `data`, `messaging`, `edge` y `service`, que se instancia una vez por servicio con su estado en `<región>/services/<servicio>/terraform.tfstate`.
- Ambientes `local` (LocalStack: `platform` sin cómputo y `messaging`), `dev`, `staging` y `prod`. Scripts en `backend/infra/scripts`: `deploy-aws.sh`, `local.sh` y `tf-validate.mjs`.
- Runtime por servicio: `api.runtime = "lambda"` (API Gateway HTTP) o `"fargate"` (ALB interno por VPC link). Todas las APIs entran por la misma API HTTP detrás de CloudFront y WAF; un autorizador exige `X-Origin-Verify`, cuyo valor vive en Secrets Manager. El tiempo real va siempre en Fargate tras un ALB público. Workers Fargate escalan por cola desde cero y los consumidores pueden ser Lambda.
- Datos: una base por shard de cada servicio (`<servicio>_shard_<n>`) y la base `catalog`, como `init.sql`. El bootstrap crea roles, bases con su dueño, `vector`, roles `catalog_owner` y `catalog_reader`, y nunca borra. Cada servicio recibe `DB_DATABASES`. La lectura va directo a las réplicas (`DB_READER_HOSTS`); RDS Proxy queda para escribir.
- Mínimo privilegio: el IAM de mensajería sale de `producers` y `consumer` de `topology.json`; Valkey limita cada usuario a `~<servicio>:*`; los servicios salen solo por HTTPS y un security group de clientes abre RDS Proxy, réplicas, Valkey y OpenObserve.
- CI: `ci-ok` sigue agregando solo los jobs de `ci.yml`. La protección de `main` (exigir `ci-ok` y los checks de `security.yml` que se decidan) la configura el dueño del repositorio en GitHub; no se gestiona desde el código. Las pruebas del backend exigen 80 % de líneas, sentencias y funciones y 75 % de ramas por proyecto.

## Consecuencias

### Positivas

- Desplegar un servicio solo planea su stack. Cambiar el runtime de su API es un campo y un artefacto.
- AWS y local usan las mismas bases, nombres de colas y filtros.
- `terraform test` con proveedores simulados prueba la lógica de los stacks sin AWS.

### Costos

- Seis stacks y un estado por servicio: hay que respetar el orden de despliegue y las prioridades de listener únicas entre servicios.
- Un ALB interno y un VPC link si alguna API corre en Fargate. Las lecturas a réplica no tienen pooling de RDS Proxy.
- Rotar el secreto de origen exige aplicar `platform` y luego `edge`. Las salidas nulas no quedan en el estado, por eso los stacks completan con `null` lo que leen de `platform`.
- `dependency-cruiser` queda pendiente hasta el primer servicio en `backend/apps`: hoy no hay capas que verificar y los límites entre proyectos ya los cubren los tags de Nx.

## Alternativas consideradas

- Servicios como mapa en una sola raíz: un apply por servicio tocaba toda la plataforma.
- Esquema por servicio en una base compartida: rompe el shard lógico del ADR 0010 y diverge del entorno local.
- Proxy de lectura por réplica: RDS Proxy no lo admite fuera de Aurora. Aurora queda como opción si se necesita pooling de lectura.
- CloudFront con un origen por servicio (ALB o API Gateway): obliga a repetir las rutas en `edge`.
