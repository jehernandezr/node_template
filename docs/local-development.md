# Desarrollo local

Esta guía levanta la infraestructura local: PostgreSQL, Valkey, LocalStack, Mailpit y OpenObserve.

## Prerrequisitos

- Node 24.
- pnpm mediante Corepack. Activa Corepack una vez con `corepack enable`.
- Docker con Docker Compose v2.

## Levantar la infraestructura

1. Copia las variables de entorno con `cp .env.example .env`.
2. Levanta los servicios con `docker compose up -d`.
3. Revisa el estado con `docker compose ps`. Todos los servicios deben aparecer como `healthy`.

## Servicios y URLs

| Servicio    | Puerto      | Acceso                                                                                                                        |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL  | 5432        | Credenciales de desarrollo en `docker-compose.yml`. Bases: `catalog`, `identity_shard_0`, `identity_shard_1`, `tasks_shard_0` |
| Valkey      | 6379        | `redis://localhost:6379`. No tiene interfaz web                                                                               |
| LocalStack  | 4566        | http://localhost:4566. Estado: http://localhost:4566/_localstack/health                                                       |
| Mailpit     | 1025 y 8025 | SMTP en `localhost:1025`. Interfaz de correos: http://localhost:8025                                                          |
| OpenObserve | 5080        | http://localhost:5080. Usuario y contraseña de desarrollo en `docker-compose.yml`                                             |

Las dos bases `identity_shard_0` e `identity_shard_1` son intencionales. Sirven para probar el enrutamiento por shard en local.

## Reiniciar los volúmenes

Los scripts de inicialización solo corren cuando el volumen de PostgreSQL está vacío. Para recrear todo desde cero:

```bash
docker compose down -v
docker compose up -d
```

`down -v` borra los datos de todos los servicios.

Para reiniciar solo PostgreSQL:

```bash
docker compose stop postgres
docker compose rm -f postgres
docker volume ls
docker volume rm <nombre-del-volumen-de-postgres>
docker compose up -d postgres
```

El nombre del volumen termina en `postgres-data`.
