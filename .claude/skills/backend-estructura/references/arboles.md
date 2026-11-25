# Árboles de ejemplo

## Servicio por módulos y capas

```
backend/libs/services/users/src/
├── index.ts                      # API pública: fachada, enums, tokens
├── shared/{enums,constants,types,utils}/
└── modules/
    └── sign-in/
        ├── domain/               # agregados, objetos de valor, eventos, errores, puertos
        ├── application/          # casos de uso, comandos, consultas, fachada
        ├── infrastructure/       # repositorios TypeORM, entidades, mappers, clientes
        └── presentation/         # controllers, consumidores, esquemas zod, *.module.ts
```

## Librería de plataforma con `__tests__`

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
