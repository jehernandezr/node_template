# 0012. Front en Flutter con shells y microfrontends

- Estado: Aceptada
- Fecha: 2026-11-11
- Actualizada: 2026-11-14 (SDK generado con `contracts_gen`, plugin de Nx propio y `shell_host`)

## Contexto

La plataforma necesita clientes para móvil, web y backoffice. Escribir cada dominio dos veces, una para web y otra para móvil, multiplica el trabajo y deja los contratos desincronizados.

## Decisión

Flutter para móvil, web y backoffice, con SDK, contratos, autenticación y widgets compartidos en Dart. Todo el cliente vive en `front/`.

- Dos shells: `front/apps/web` y `front/apps/mobile`. Ambos componen los mismos microfrontends por dominio. Lo que comparten (sesión, login, paso adicional, páginas del shell, router y app raíz) vive en `front/packages/shell_host`; cada shell solo aporta sus manifiestos, su marco de navegación y su conexión.
- Cada microfrontend declara en su manifiesto su id, plataformas, rutas, menú (etiqueta, icono e insignia), regla de acceso, flag, modos que sirve y enlaces que acepta. Los microfrontends dependen solo de `front/packages`, los paquetes compartidos no conocen ningún microfrontend, y se comunican por el bus de eventos del shell (cada uno declara sus eventos) y por rutas.
- La web carga los microfrontends de forma diferida según el perfil, así un cliente nunca descarga el backoffice.
- El Dart de los contratos (tipos, validadores, rutas y códigos) lo genera `front/tools/contracts_gen` desde el `contract.json` que exporta `backend/libs/contracts` (ADR 0017), y cambia en el mismo PR que el backend. El cliente HTTP es `ApiClient` de `front/packages/api`, sobre `package:http`.
- Nx orquesta el workspace con un plugin propio (`front/tools/nx-plugin`) que registra cada miembro del pub workspace como proyecto, con sus tareas `analyze`, `format-check` y `test`.

## Consecuencias

Positivas:

- Un dominio se escribe una vez y aparece en web y en móvil.
- Un cambio de contrato llega a los clientes en el mismo PR.

Costos:

- Todo el cliente está en Dart. Un equipo de backend en TypeScript no comparte lenguaje con el front.
- El plugin de Nx para Flutter es propio y hay que mantenerlo.
- La interfaz oculta lo que el usuario no puede usar, pero la seguridad real vive en la API.

## Alternativas consideradas

- Dominio desplegado aparte en web: se publica como app Flutter embebida en el shell, con el mismo contrato.
- Web pública con necesidad de posicionamiento en buscadores: las páginas de marketing van en un sitio estático aparte.
- Pantalla con versión propia por plataforma: se declara con `PlatformScreen` en lugar de duplicar el microfrontend.
