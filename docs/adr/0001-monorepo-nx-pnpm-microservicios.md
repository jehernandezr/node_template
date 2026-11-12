# 0001. Monorepo Nx con pnpm y un microservicio por app

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

`node_template` es un Express de 2022 con una sola aplicación. La plataforma nueva necesita varios microservicios que compartan librerías de plataforma y contratos, pero que no compartan código de negocio ni bases de datos.

## Decisión

El repositorio es un workspace de Nx con pnpm. Cada microservicio es una app en `apps/` con su dominio, su base de datos, sus migraciones y su despliegue. Lo único que los servicios comparten son las librerías de `libs/platform` y los contratos de `libs/contracts`.

Tres reglas se verifican en CI:

- Una app solo depende de librerías `scope:shared` (`@nx/enforce-module-boundaries`).
- Dentro de un módulo, `domain` depende solo de `kernel` y las capas externas dependen hacia adentro (`dependency-cruiser`).
- CI corre `nx affected`: prueba, construye y despliega solo lo que cambió.

## Consecuencias

Positivas:

- Un servicio nuevo sale de un generador y hereda las reglas de dependencia.
- Un cambio de contrato se revisa en el mismo PR que lo usa.
- El pipeline no reconstruye ni despliega servicios que no cambiaron.

Costos:

- Cada servicio tiene su base, sus migraciones y su despliegue que mantener.
- Las reglas de límites deben seguir activas en CI. Si se relajan, código de un servicio puede terminar importando a otro.

## Alternativas consideradas

El documento de arquitectura no registra alternativas evaluadas para esta decisión.
