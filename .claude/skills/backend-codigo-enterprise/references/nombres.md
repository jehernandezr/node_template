# Nombres en el backend

## Contenido

- Clases y archivos por rol
- Métodos
- Eventos, errores y colas
- Qué evitar

## Clases y archivos por rol

El nombre dice qué es. El archivo es kebab-case con el rol como sufijo y contiene una clase pública.

| Rol                | Clase                         | Archivo                             |
| ------------------ | ----------------------------- | ----------------------------------- |
| Caso de uso        | `SignInUseCase`               | `sign-in.use-case.ts`               |
| Comando            | `SignInCommand`               | `sign-in.command.ts`                |
| Consulta           | `GetUserProfileQuery`         | `get-user-profile.query.ts`         |
| Agregado           | `User`                        | `user.aggregate.ts`                 |
| Objeto de valor    | `Email`                       | `email.value-object.ts`             |
| Evento de dominio  | `UserRegisteredEvent`         | `user-registered.event.ts`          |
| Error de dominio   | `EmailAlreadyRegisteredError` | `email-already-registered.error.ts` |
| Puerto             | `UserRepository` (abstracta)  | `user.repository.ts`                |
| Adaptador          | `TypeOrmUserRepository`       | `typeorm-user.repository.ts`        |
| Entidad ORM        | `UserEntity`                  | `user.entity.ts`                    |
| Mapper             | `UserMapper`                  | `user.mapper.ts`                    |
| Controller         | `UsersController`             | `users.controller.ts`               |
| Consumidor         | `UserRegisteredConsumer`      | `user-registered.consumer.ts`       |
| Esquema zod        | `signInRequestSchema`         | `sign-in.request.schema.ts`         |
| Token de inyección | `USER_REPOSITORY`             | junto al puerto                     |

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
