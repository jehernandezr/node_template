# Backend names

## Contents

- Classes and files by role
- Methods
- Events, errors and queues
- What to avoid

## Classes and files by role

The name says what it is. The file is kebab-case with the role as suffix and contains one public class.

- Use case: class: `SignInUseCase`; file: `sign-in.use-case.ts`
- Command: class: `SignInCommand`; file: `sign-in.command.ts`
- Query: class: `GetUserProfileQuery`; file: `get-user-profile.query.ts`
- Aggregate: class: `User`; file: `user.aggregate.ts`
- Value object: class: `Email`; file: `email.value-object.ts`
- Domain event: class: `UserRegisteredEvent`; file: `user-registered.event.ts`
- Domain error: class: `EmailAlreadyRegisteredError`; file: `email-already-registered.error.ts`
- Port: class: `UserRepository` (abstract); file: `user.repository.ts`
- Adapter: class: `TypeOrmUserRepository`; file: `typeorm-user.repository.ts`
- ORM entity: class: `UserEntity`; file: `user.entity.ts`
- Mapper: class: `UserMapper`; file: `user.mapper.ts`
- Controller: class: `UsersController`; file: `users.controller.ts`
- Consumer: class: `UserRegisteredConsumer`; file: `user-registered.consumer.ts`
- Zod schema: class: `signInRequestSchema`; file: `sign-in.request.schema.ts`
- Injection token: class: `USER_REPOSITORY`; file: next to the port

## Methods

- Business verbs in the domain: `user.changeEmail(...)`, `order.cancel(...)`. Not `setEmail`.
- Named static factories: `User.register(...)` creates a new aggregate and emits an event. `User.rehydrate(...)` rebuilds it from the database without emitting.
- Repositories: `findById` returns `T | null`. `getById` throws the domain error if it does not exist. Pick one and stick with it.
- Booleans with a prefix: `isActive`, `hasExpired`, `canRetry`.
- A query is not called `getX` if it changes state.

## Events, errors and queues

- Domain event in past tense: `UserRegistered`. Enum value: `identity.user.registered`.
- Versioned integration event: `identity.user.registered.v1`.
- Queue command in imperative: `SendWelcomeEmail`.
- Errors: the name says the broken rule (`PasswordTooShortError`), the code is `SERVICE.SUBMODULE.ERROR`.

## What to avoid

- `Manager`, `Helper`, `Util`, `Service` without a business noun, `Data`, `Info`.
- `I` prefix on interfaces (`IUserRepository`).
- Abbreviations (`usr`, `cfg`, `ctx`) except framework conventions.
- Names that repeat the context: `User.userEmail` is `User.email`.
