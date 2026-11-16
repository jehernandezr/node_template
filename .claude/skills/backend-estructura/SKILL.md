---
name: backend-estructura
description: Cómo se organizan carpetas, capas, dependencias y compilado del backend de node_template. Un solo node_modules con pnpm, librerías por alias de TypeScript, límites entre proyectos con tags de Nx, código directo en src/, pruebas en __tests__ y compilado de cada app en backend/dist. Úsala al crear o mover librerías, apps, módulos, carpetas o pruebas del backend.
paths:
  - 'backend/**'
---

# Estructura del backend

## Raíz

- La raíz solo tiene `backend/`, `front/`, Nx como orquestador y herramientas del repositorio (CI/CD, hooks, docs).
- El backend es dueño de sus librerías en `backend/libs`. El front tiene su propia skill, `front-estructura`.

## Dependencias: un solo `node_modules`

- Un pnpm workspace con un único `node_modules` en la raíz. Las dependencias externas se declaran en un solo `package.json` del backend (o de la raíz para herramientas), con versiones exactas.
- Las librerías del backend no son paquetes: no tienen `package.json` ni `node_modules` propios. Son proyectos de Nx (`project.json` con sus tags) y se importan por alias de TypeScript (`@platform/kernel`, `@contracts/identity`) declarados en `tsconfig.base.json`.
- Los límites los aplica `@nx/enforce-module-boundaries` con tags. Una importación que cruza un límite prohibido rompe el lint, no se arregla con un alias nuevo.
- Se importa por el alias público del proyecto (`@platform/kernel`), nunca por ruta profunda a otro proyecto (`@platform/kernel/src/errors/...`).
- Dependencia nueva: antes de agregarla, ver si reimplementarla es razonable. Se acepta solo si hacerlo en casa es imprudente (criptografía, protocolos) o caro. Se aísla detrás de un puerto.
- Sin dependencias circulares entre proyectos ni entre carpetas de un servicio.

## Capas dentro de un servicio

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

- Se agrupa por módulo de negocio, no por tipo técnico. Dentro del módulo, por capa.
- Un módulo expone al resto solo lo que exporta su `index.ts`. Lo demás es privado.
- Dirección de dependencias: `presentation` y `infrastructure` hacia `application`, `application` hacia `domain`, `domain` hacia `@platform/kernel`. Una prueba de arquitectura (regla de lint o `dependency-cruiser`) lo verifica en CI.

## Carpetas de código

- El código va directo en `src/`. No existe `src/lib/`.
- Lo compartido dentro de un servicio vive en `shared/{enums,constants,types,utils}`.

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

## NestJS solo en `src/nest/`

- El núcleo de una librería de `libs/platform`, `libs/contracts` y `libs/shared` no importa `@nestjs/*` ni la sub-entrada de otra librería (`@platform/<lib>/nest`). El cableado vive en `src/nest/`, que expone el alias `@platform/<lib>/nest`.
- Lo comprueban la regla de ESLint `layout/no-nest-outside-nest-folder` y `check-structure.mjs`. Las apps y los módulos de servicio (`presentation/`) usan NestJS con libertad.

## Funciones exportadas

- El comportamiento va en clases. `check-structure.mjs` solo admite funciones exportadas en `utils/`, en migraciones, en `index.ts`, en archivos de configuración y en su lista declarada de excepciones (`FUNCTION_EXCEPTIONS`): las fábricas `define*` de `contracts/*/src/kit`, los esquemas de `env.ts` y `secret()` de config y el `main()` de las herramientas.
- Una excepción nueva se agrega a esa lista con su motivo y una prueba en `check-structure.test.mjs`.

## Pruebas

- Cada carpeta de código tiene su carpeta `__tests__/` con las pruebas de esa carpeta. Ejemplo: `users/src/modules/sign-in/application/__tests__/`.
- Nunca un `.spec.ts` junto al archivo fuente, ni una única carpeta de pruebas en la raíz del módulo. Esto reemplaza la convención por defecto de NestJS.
- Lo que comparten las pruebas (fakes, builders, contenedores, contratos reutilizables) va dentro de la estructura de pruebas, nunca en una carpeta `testing/` aparte:
  - `__tests__/utils/` de una carpeta, si solo lo usan las pruebas de esa carpeta;
  - `src/__tests__/utils/` del proyecto, si lo usan varias carpetas. Si otra librería lo necesita, se expone por el alias `@platform/<lib>/test-utils`.
- Las pruebas de un utilitario van en el `__tests__/` que lo contiene (por ejemplo `src/__tests__/fake-rate-limiter.spec.ts`), no en un `__tests__` anidado dentro de `utils/`.
- Las pruebas de integración terminan en `.int-spec.ts`. `check-structure.mjs` rechaza `*.integration.spec.ts`, que correría como unitaria.
- El código de producción nunca importa nada de `__tests__/`.
- Las pruebas end to end de una app viven en `backend/apps/<app>/e2e/`.
- Detalle en `backend-pruebas`.

## Compilado

- Las librerías no se compilan por separado: su target es `typecheck`.
- Cada app se empaqueta con esbuild en `backend/dist/<app>/`. No hay `dist/` dentro de librerías ni de apps.
- `backend/dist/` está en `.gitignore`.
- Los migradores (`migrate`) se empaquetan como binario de la misma app. Las migraciones TypeORM se compilan junto con la app, porque la CLI de `run` y `revert` solo carga JavaScript.

## Nombres de archivo

- kebab-case con sufijo de rol: `sign-in.use-case.ts`, `user.repository.ts`, `typeorm-user.repository.ts`, `user.entity.ts`, `users.module.ts`, `users.facade.ts`.
- Un archivo, una clase pública. Tabla completa de roles en `backend-codigo-enterprise/references/nombres.md`.
- Sin archivos `utils.ts` ni `helpers.ts` genéricos. Si hay lógica, tiene nombre de negocio y es una clase.
- Los `index.ts` solo reexportan la API pública. Sin lógica y sin barriles internos que mezclen capas.

## Cómo crear una librería nueva

```
- [ ] project.json con tags de tipo y de alcance
- [ ] Alias en tsconfig.base.json
- [ ] tsconfig.json y jest.config.cjs
- [ ] src/index.ts con la API pública
- [ ] Target typecheck y test
- [ ] pnpm nx lint <proyecto> pasa sin romper límites
```
