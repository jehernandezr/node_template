# backend-structure examples

Long examples the skill cites. Read them only when the topic applies to you.

## Layers inside a service

```
backend/libs/services/users/src/
├── index.ts                      # public API: facade, enums, tokens
├── shared/{enums,constants,types,utils}/
└── modules/
    └── sign-in/
        ├── domain/               # aggregates, value objects, events, errors, ports
        ├── application/          # use cases, commands, queries, facade
        ├── infrastructure/       # TypeORM repositories, entities, mappers, clients
        └── presentation/         # controllers, consumers, zod schemas, *.module.ts
```

## Code folders

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
