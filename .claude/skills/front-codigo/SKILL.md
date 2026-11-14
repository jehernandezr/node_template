---
name: front-codigo
description: Reglas de diseño del código del front de node_template (Flutter, Dart). Clases, composición e inyección de dependencias, widgets que solo pintan, controladores y flujos probados sin widgets, y el contrato de microfrontend. Úsala antes de escribir, revisar o integrar código en front/.
---

# Código del front

El front es software enterprise, no scripting. Todo código nuevo, y todo código que se toque, sigue estas reglas.

## Clases, composición e inyección

- Cada pieza con comportamiento es una clase con una sola responsabilidad. Sus colaboradores llegan por el constructor como campos `final`, tipados con el puerto (clase abstracta o `interface class`), nunca con la implementación concreta.
- Composición antes que herencia.
- Nada de instancias globales ni estado en variables de nivel superior. Las dependencias se arman en el shell (`ShellHost`) y llegan a cada microfrontend por `ShellServices` y su scope.
- Funciones de nivel superior solo para utilidades puras sin dependencias.
- El tiempo se inyecta con un reloj; nada de `DateTime.now()` dentro de la lógica.

## Capas

- **Widgets:** solo pintan estado y reenvían eventos. Sin llamadas HTTP, sin reglas de negocio, sin `try/catch` de lógica.
- **Controladores y flujos** (`ChangeNotifier`, `ValueNotifier` o clases propias): tienen el estado de la pantalla y la lógica, y se prueban sin widgets. Ejemplos: `SignInFlow`, `StepUpFlow`, `TasksListController`.
- **Repositorios:** puertos en el microfrontend o el paquete; adaptadores de API (sobre `ApiClient`) y de demostración (en memoria) elegidos una vez por `ShellMode`.
- **Contratos:** solo los tipos generados en `front/packages/contracts`. Ningún código del front importa el backend.

## Microfrontends

- Cumplen el contrato del ADR 0018: manifiesto con `id`, `platforms`, `modes`, `access`, `menu`, `deepLinks` y `screens` con `ScreenRoute` diferido.
- Dependen solo de `front/packages`, nunca de otro microfrontend. Se comunican por eventos del shell y por rutas.
- Pantallas, datos y textos van detrás de `deferred as`. El manifiesto solo importa constantes, enums y el ciclo de vida.
- Los repositorios implementan `ScopedResource` y el scope los cierra al cambiar la identidad.

## Clean Code

- Nombres que dicen qué es. Métodos cortos. Sin parámetros booleanos que cambian el comportamiento.
- Enums generados para permisos, errores, planes y flags. Nunca literales de texto sueltos.
- Errores tipados. No se atrapa `Error`, y un `catch` nunca calla un fallo sin reportarlo.
- Los textos de la interfaz salen de los ARB (`i18n` o los `l10n` del microfrontend); nunca se muestra el texto que manda el servidor.
- Comentarios solo para el porqué, sin referencias al proceso.

## Antes de integrar el trabajo de un agente

Revisa que el diff cumpla esta skill, `front-estructura` y `front-pruebas`. Si no cumple, se corrige antes del commit.
