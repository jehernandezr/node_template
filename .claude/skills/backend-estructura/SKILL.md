---
name: backend-estructura
description: Cómo se organizan carpetas, dependencias y compilado del backend de node_template. Un solo node_modules con pnpm, librerías por alias de TypeScript, código directo en src/, pruebas en __tests__ y compilado de cada app en backend/dist. Úsala al crear o mover librerías, apps, módulos o pruebas del backend.
---

# Estructura del backend

## Raíz

- La raíz solo tiene `backend/`, `front/`, Nx como orquestador y herramientas del repositorio (CI/CD, hooks, docs).
- El backend es dueño de sus librerías en `backend/libs`. El front tiene su propia skill, `front-estructura`.

## Dependencias: un solo `node_modules`

- Un pnpm workspace con un único `node_modules` en la raíz. Las dependencias externas se declaran en un solo `package.json` del backend (o de la raíz para herramientas), con versiones exactas.
- Las librerías del backend no son paquetes: no tienen `package.json` ni `node_modules` propios. Son proyectos de Nx (`project.json` con sus tags) y se importan por alias de TypeScript (`@platform/kernel`, `@contracts/identity`) declarados en `tsconfig.base.json`.
- Los límites entre proyectos los aplica `@nx/enforce-module-boundaries` con los tags.

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

## Pruebas

- Cada carpeta de código tiene su carpeta `__tests__/` con las pruebas de esa carpeta. Ejemplo: `users/src/login/__tests__/`.
- Nunca un `.spec.ts` junto al archivo fuente, ni una única carpeta de pruebas en la raíz del módulo.
- Los dobles de prueba compartidos (fakes) van en `src/testing/` del proyecto y se exportan por un alias `.../testing`.
- Las pruebas end to end de una app viven en `backend/apps/<app>/e2e/`.

## Compilado

- Las librerías no se compilan por separado: su target es `typecheck`.
- Cada app se empaqueta con esbuild en `backend/dist/<app>/`. No hay `dist/` dentro de librerías ni de apps.
- `backend/dist/` está en `.gitignore`.

## Nombres de archivo

- kebab-case con sufijo de rol: `sign-in.use-case.ts`, `user.repository.ts`, `typeorm-user.repository.ts`, `user.entity.ts`, `users.module.ts`, `users.facade.ts`.
- Un archivo, una clase pública.
