# Nombres en el backend

## Contenido

- Clases y archivos por rol
- Métodos
- Eventos, errores y colas
- Qué evitar

## Clases y archivos por rol

El nombre dice qué es. El archivo es kebab-case con el rol como sufijo y contiene una clase pública.

- Caso de uso: clase: `SignInUseCase`; archivo: `sign-in.use-case.ts`
- Comando: clase: `SignInCommand`; archivo: `sign-in.command.ts`
- Consulta: clase: `GetUserProfileQuery`; archivo: `get-user-profile.query.ts`
- Agregado: clase: `User`; archivo: `user.aggregate.ts`
- Objeto de valor: clase: `Email`; archivo: `email.value-object.ts`
- Evento de dominio: clase: `UserRegisteredEvent`; archivo: `user-registered.event.ts`
- Error de dominio: clase: `EmailAlreadyRegisteredError`; archivo: `email-already-registered.error.ts`
- Puerto: clase: `UserRepository` (abstracta); archivo: `user.repository.ts`
- Adaptador: clase: `TypeOrmUserRepository`; archivo: `typeorm-user.repository.ts`
- Entidad ORM: clase: `UserEntity`; archivo: `user.entity.ts`
- Mapper: clase: `UserMapper`; archivo: `user.mapper.ts`
- Controller: clase: `UsersController`; archivo: `users.controller.ts`
- Consumidor: clase: `UserRegisteredConsumer`; archivo: `user-registered.consumer.ts`
- Esquema zod: clase: `signInRequestSchema`; archivo: `sign-in.request.schema.ts`
- Token de inyección: clase: `USER_REPOSITORY`; archivo: junto al puerto

## Métodos

- Verbos de negocio en el dominio: `user.changeEmail(...)`, `order.cancel(...)`. No `setEmail`.
- Fábricas estáticas con nombre: `User.register(...)` crea un agregado nuevo y emite evento. `User.rehydrate(...)` lo reconstruye desde la base sin emitir.
- Repositorios: `findById` devuelve `T | null`. `getById` lanza el error de dominio si no existe. Se elige uno y se mantiene.
- Booleanos con prefijo: `isActive`, `hasExpired`, `canRetry`.
- Una consulta no se llama `getX` si cambia estado.

## Eventos, errores y colas

- Evento de dominio en pasado: `UserRegistered`. Valor del enum: `identity.user.registered`.
- Evento de integración versionado: `identity.user.registered.v1`.
- Comando de cola en imperativo: `SendWelcomeEmail`.
- Errores: el nombre dice la regla rota (`PasswordTooShortError`), el código es `SERVICIO.SUBMÓDULO.ERROR`.

## Qué evitar

- `Manager`, `Helper`, `Util`, `Service` sin sustantivo de negocio, `Data`, `Info`.
- Prefijo `I` en interfaces (`IUserRepository`).
- Abreviaturas (`usr`, `cfg`, `ctx`) salvo convenciones del framework.
- Nombres que repiten el contexto: `User.userEmail` es `User.email`.
