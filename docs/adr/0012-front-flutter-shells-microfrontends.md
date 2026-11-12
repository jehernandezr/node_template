# 0012. Front en Flutter con shells y microfrontends

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

La plataforma necesita clientes para móvil, web y backoffice. Escribir cada dominio dos veces, una para web y otra para móvil, multiplica el trabajo y deja los contratos desincronizados.

## Decisión

Flutter para móvil, web y backoffice, con SDK, contratos, autenticación y widgets compartidos en Dart. Todo el cliente vive en `front/`.

- Dos shells: `front/apps/web` y `front/apps/mobile`. Ambos componen los mismos microfrontends por dominio.
- Cada microfrontend declara sus plataformas, rutas, menú, regla de acceso y flag. Los microfrontends dependen solo de `front/packages` y se comunican por el bus de eventos del shell y por rutas.
- La web carga los microfrontends de forma diferida según el perfil, así un cliente nunca descarga el backoffice.
- El SDK se genera desde OpenAPI (`dart-dio`). Los contratos generados desde `libs/contracts` cambian en el mismo PR que el backend.
- Nx orquesta el workspace con el plugin `@nxrocks/nx-flutter` y pub workspaces de Dart.

## Consecuencias

Positivas:

- Un dominio se escribe una vez y aparece en web y en móvil.
- Un cambio de contrato llega a los clientes en el mismo PR.

Costos:

- Todo el cliente está en Dart. Un equipo de backend en TypeScript no comparte lenguaje con el front.
- Nx depende de un plugin comunitario para Flutter.
- La interfaz oculta lo que el usuario no puede usar, pero la seguridad real vive en la API.

## Alternativas consideradas

- Dominio desplegado aparte en web: se publica como app Flutter embebida en el shell, con el mismo contrato.
- Web pública con necesidad de posicionamiento en buscadores: las páginas de marketing van en un sitio estático aparte.
- Pantalla con versión propia por plataforma: se declara con `PlatformScreen` en lugar de duplicar el microfrontend.
