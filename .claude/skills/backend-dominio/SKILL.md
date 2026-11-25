---
name: backend-dominio
description: 'Modelado del dominio del backend: agregados, objetos de valor, eventos, puertos y errores de dominio sobre @platform/kernel. Úsala en domain/.'
paths:
  - 'backend/**/domain/**'
  - 'backend/libs/platform/kernel/**'
---

# Dominio

TypeScript puro: solo importa `@platform/kernel`. Sin NestJS, TypeORM, zod, AWS ni `process.env`. Ejemplos de `User` y `Email` en `references/ejemplos.md`.

## Agregados

- Se carga, cambia y guarda entero en una transacción. Acceso solo por la raíz.
- Agregados pequeños. Referencias a otros por id (`ownerId: Id`), nunca por objeto.
- Constructor privado y dos fábricas: `register(...)` valida, crea y emite evento; `rehydrate(...)` reconstruye sin validar ni emitir.
- Sin setters públicos: métodos con nombre de negocio que verifican la regla antes de mutar.
- `id` y `createdAt` son `readonly`.
- Recibe `now` y los ids de evento como parámetros; el caso de uso los saca de `Clock` e `IdGenerator`.
- Una regla que necesita otros agregados o la base va en un servicio de dominio (clase con puertos en `domain/`) o en el caso de uso.
- Unicidad: se verifica en el caso de uso con el repositorio y se garantiza con índice único. El repositorio traduce el duplicado a `EmailAlreadyRegisteredError`.

## Objetos de valor

- Extienden `ValueObject`. Inmutables, iguales por valor, constructor privado y `Email.create(raw)` que lanza el error de dominio.
- Solo para primitivos con reglas: `Email`, `Money`, `PasswordHash`, `TenantId`.
- Dinero: entero en la unidad menor más moneda.
- Nunca viajan en DTO, eventos ni entidades ORM: se serializan a primitivos en la frontera.
- Ids: `Id` del kernel (UUIDv7). Se crean con `IdGenerator` o se parsean con `Id.from(raw)`. El `aggregateId` del evento es `id.value`.
- Validación simple en el dominio; formatos complejos los valida zod en el borde.

## Eventos de dominio

- Hecho en pasado, emitido con `addDomainEvent`. Tipo de un enum por agregado (`UserEventType.Registered = 'identity.user.registered'`).
- `payload` de primitivos, mínimo y sin datos sensibles.
- El caso de uso los saca con `pullDomainEvents()` tras guardar y los entrega al outbox en la misma transacción (ver `backend-mensajeria-idempotencia`).
- Lo que sale del servicio es un evento de integración versionado con esquema zod en `@contracts/<servicio>` (`events/`), traducido en un mapper de aplicación.

## Puertos

- Clase abstracta en `domain/`, que sirve de contrato y de token (ver `backend-nestjs-composicion`).
- Los de repositorio hablan en agregados: `save(user)`, `findById(id)`.
- Puertos de plataforma disponibles: `Clock`, `IdGenerator`.

## Errores y consultas

- Cada regla rota es una clase que extiende `DomainError` con código del enum del servicio (ver `backend-errores`).
- Las lecturas sin reglas pueden leer de la réplica con `QueryBuilder` y devolver un DTO de lectura, nunca entidades ORM.
- El dominio se prueba sin dobles ni NestJS (ver `backend-pruebas`).

## Con pstack

Método en `pstack-en-node-template`. De pstack aplican aquí: `principle-model-the-domain`, `principle-foundational-thinking`, `principle-type-system-discipline`, `principle-boundary-discipline`, `architect`. Donde `principle-boundary-discipline` pide funciones puras, aquí van clases del dominio sin dependencias de framework.
