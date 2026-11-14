---
name: backend-dominio
description: Cómo se modela el dominio del backend de node_template. Agregados con invariantes, entidades, objetos de valor, eventos de dominio, fábricas, puertos y rehidratación, sobre AggregateRoot, ValueObject y DomainEvent de @platform/kernel. Úsala al crear o modificar cualquier cosa dentro de domain/.
paths:
  - 'backend/**/domain/**'
  - 'backend/libs/platform/kernel/**'
---

# Dominio

El dominio es TypeScript puro. Importa solo `@platform/kernel`. Nada de decoradores de NestJS, TypeORM, zod, AWS ni `process.env`.

## Agregados e invariantes

- Un agregado es una frontera de consistencia. Se carga, cambia y guarda entero, en una transacción. Se accede a su interior solo por la raíz.
- Agregados pequeños. Si dos cosas no necesitan ser consistentes en la misma transacción, son agregados distintos.
- Un agregado referencia a otro por id (`ownerId: Id`), nunca por objeto.
- Un agregado válido existe siempre. Constructor privado y dos fábricas: `register(...)` valida, crea y emite evento. `rehydrate(...)` reconstruye desde la base sin validar de nuevo ni emitir.
- Sin setters públicos. El estado cambia por métodos con nombre de negocio que verifican la regla antes de mutar.
- `id` y `createdAt` son `readonly`.
- El agregado no conoce casos de uso, controllers ni repositorios.

```ts
export class User extends AggregateRoot<Id, UserEvent> {
  private constructor(
    id: Id,
    private email: Email,
    private status: UserStatus,
    private readonly createdAt: Date,
    private version: number,
  ) {
    super(id);
  }

  static register(params: RegisterUserParams): User {
    const user = new User(
      params.id,
      params.email,
      UserStatus.Active,
      params.now,
      0,
    );
    user.addDomainEvent({
      id: params.eventId,
      type: UserEventType.Registered,
      occurredAt: params.now,
      aggregateId: params.id.value,
      payload: { email: params.email.value },
    });
    return user;
  }

  changeEmail(newEmail: Email, now: Date, eventId: Id): void {
    if (this.status !== UserStatus.Active) {
      throw new UserNotActiveError({ userId: this.id.value });
    }
    if (this.email.equals(newEmail)) return;
    this.email = newEmail;
    this.addDomainEvent({
      id: eventId,
      type: UserEventType.EmailChanged,
      occurredAt: now,
      aggregateId: this.id.value,
      payload: { email: newEmail.value },
    });
  }
}
```

- El agregado recibe `now` y los ids de evento como parámetros. El caso de uso los saca de `Clock` e `IdGenerator`. El dominio no los consulta solo.
- Una regla que necesita datos de otros agregados o de la base no va en el agregado: va en un servicio de dominio (clase en `domain/` con puertos) o en el caso de uso.
- Unicidad (`email` único) se verifica en el caso de uso con el repositorio y se garantiza con un índice único. Si la base rechaza el duplicado, el repositorio lo traduce a `EmailAlreadyRegisteredError`.

## Objetos de valor

- Extienden `ValueObject`. Inmutables, iguales por valor, validados al construirse. Constructor privado y `Email.create(raw)` que lanza el error de dominio si es inválido.
- Se crean para primitivos con reglas: `Email`, `Money`, `PasswordHash`, `TenantId`. No para un `string` sin regla.
- Dinero: monto entero en la unidad menor más moneda, nunca `number` decimal.
- Nunca viajan en DTO, eventos ni entidades ORM. Se serializan a primitivos en la frontera.
- Los ids son el `Id` del kernel (UUIDv7, objeto de valor). Se crean con el `IdGenerator` o se parsean con `Id.from(raw)` al llegar de fuera. El `aggregateId` del evento es el string (`id.value`).

```ts
export class Email extends ValueObject<{ value: string }> {
  private constructor(value: string) {
    super({ value });
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      throw new InvalidEmailError();
    }
    return new Email(normalized);
  }

  get value(): string {
    return this.props.value;
  }
}
```

Validación simple (largo, vacío, formato básico) vive en el dominio. Formatos complejos los valida zod en el borde y el dominio confía en el valor ya parseado.

## Eventos de dominio

- Un hecho en pasado, emitido por el agregado con `addDomainEvent`. El tipo sale de un enum por agregado (`UserEventType.Registered = 'identity.user.registered'`).
- El `payload` son primitivos y lo mínimo que el consumidor necesita. Sin objetos de valor ni datos sensibles.
- El caso de uso, no el agregado, saca los eventos con `pullDomainEvents()` después de guardar y los entrega al outbox en la misma transacción (ver `backend-mensajeria-idempotencia`).
- Un evento de dominio es interno. Lo que sale del servicio es un evento de integración versionado, con esquema zod en `@contracts/<servicio>` (`events/`). Se traduce en un mapper de aplicación, no se reutiliza el de dominio.
- Evento nuevo o cambio de forma: ver reglas de versionado en `backend-mensajeria-idempotencia`.

## Puertos

- Interfaz o clase abstracta en `domain/` con lo que el negocio necesita. Los puertos de repositorio hablan en agregados: `save(user)`, `findById(id)`, no en filas.
- Si el puerto se inyecta, necesita token en runtime (ver `backend-nestjs-composicion`). Una clase abstracta sirve a la vez de contrato y de token.
- Puertos de plataforma que el dominio puede usar: `Clock`, `IdGenerator`.

## Errores de dominio

Cada regla rota es una clase que extiende `DomainError` con código del enum del servicio. Detalle en `backend-errores`.

## Consultas

Las lecturas que no pasan por reglas (listados, reportes) no necesitan agregados. Un manejador de consulta puede leer directo de la réplica con `QueryBuilder` y devolver un DTO de lectura. Nunca devuelve entidades ORM.

## Pruebas

El dominio se prueba sin dobles ni NestJS: crear, ejecutar el método, verificar estado y `pullDomainEvents()`. Ver `backend-pruebas`.
