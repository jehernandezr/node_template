# Example trees

## Service by modules and layers

```
backend/libs/services/users/src/
├── index.ts                      # public API: facade, enums, tokens
├── shared/{enums,constants,types,utils}/
└── modules/
    └── sign-in/
        ├── index.ts              # facade and types other modules use
        ├── module.ts             # the Nest module classes other modules import
        ├── domain/               # aggregates, value objects, events, errors, ports
        ├── application/          # use cases, commands, queries, facade
        ├── infrastructure/       # TypeORM repositories, entities, mappers, clients
        └── presentation/         # controllers, consumers, zod schemas, *.module.ts
```

## Platform library with `__tests__`

```
backend/libs/platform/kernel/
├── project.json
├── tsconfig.json
├── jest.config.cjs
└── src/
    ├── index.ts
    ├── ids/
    │   ├── uuid-v7-id-generator.ts
    │   └── __tests__/
    │       └── uuid-v7-id-generator.spec.ts
    └── errors/
        ├── domain-error.ts
        └── __tests__/
            └── domain-error.spec.ts
```
