---
name: pstack-en-node-template
description: Cómo usar el plugin pstack (cursor/plugins) en node_template desde Claude Code. Dónde está, cómo se carga una skill de pstack, qué skill o playbook de pstack corresponde a cada tarea del repositorio y qué regla manda cuando pstack y el repositorio no coinciden. Úsala antes de seguir cualquier skill de pstack en este repositorio, y cuando una skill backend-* o front-* te mande a pstack.
---

# pstack en node_template

pstack es el plugin de skills de ingeniería de cursor/plugins. Aquí complementa las skills `backend-*` y `front-*`: ellas fijan cómo se escribe el código de este repositorio, y pstack aporta el método (revisión adversaria, pruebas de comportamiento, principios de diseño, prosa sin relleno). Cuando no coinciden, manda el repositorio (ver "Precedencia").

## Instalación y modelos

- Se instala a nivel de usuario: `claude plugin marketplace add cursor/plugins` y `claude plugin install pstack@cursor-plugins --scope user`. `.claude/settings.json` del repositorio declara el marketplace y el plugin, así que Claude Code lo ofrece al abrir el proyecto.
- Los modelos por rol (panel de `interrogate`, `arena`, `swarm`) salen de `~/.claude/rules/pstack-models.md`, que Claude Code carga en cada sesión. Se cambia con `/pstack:setup-pstack`, nunca en `CLAUDE.md`.
- Si el plugin no está instalado, sigue sin él: las skills del repositorio bastan para escribir y revisar código. No lo instales por tu cuenta.

## Cómo se carga una skill de pstack

1. Ubica el plugin: `ls -d ~/.claude/plugins/cache/cursor-plugins/pstack/*/ | sort -V | tail -1`. Esa carpeta es `<pstack>`.
2. Una vez por sesión, lee `<pstack>/docs/harness/claude-code.md`. Traduce los nombres de Cursor de pstack a Claude Code (`Task` es `Agent`, `generalPurpose` es `general-purpose`, `readonly` es `Explore`, los modelos y las rutas).
3. Lee `<pstack>/skills/<nombre>/SKILL.md` con `Read` y síguela. La herramienta `Skill` rechaza casi todas las skills de pstack. Cuando le indiques a una persona que la use, escribe `/pstack:<nombre>`.
4. Los pasos que dependen de algo exclusivo de Cursor (Bugbot, automations, `/deslop` de `cursor-team-kit`) se saltan con una línea `Skipped in Claude Code: <paso>. <motivo>.`, como dice el adaptador.

## Qué skill de pstack usar

| Tarea en el repositorio                                                           | pstack                                                                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Trabajo de ingeniería con rigor (bug, feature, refactor, perf)                    | `poteto-mode` y su playbook: `bug-fix`, `feature`, `refactoring`, `perf-issue`                                            |
| Diseñar tipos, puertos y módulos antes de codificar                               | `architect`                                                                                                               |
| Entender cómo funciona algo o dónde debe vivir                                    | `how`; el porqué de una decisión, `why`                                                                                   |
| Revisar un diff o un PR                                                           | `interrogate` (solo sobreviven hallazgos probados con una corrida); lo que el cambio rompe fuera del diff, `blast-radius` |
| Comentarios en un diff                                                            | `no-comments`: borra todo comentario en línea; queda solo la documentación de los métodos públicos                        |
| Prosa de docs, ADR, runbooks, PR y commits                                        | `unslop`; estructura de un documento, `technical-writing`                                                                 |
| Prueba de regresión antes del arreglo                                             | `tdd`                                                                                                                     |
| Concurrencia, reintentos, sagas o máquinas de estados que las pruebas no alcanzan | `statechart` y `create-formal-verification-skill`                                                                         |
| Medir rendimiento o reportar una mejora                                           | `benchmark-checklist`                                                                                                     |
| Trabajo largo sin supervisión                                                     | `show-me-your-work` (bitácora de decisiones)                                                                              |
| Un error que los agentes repiten                                                  | `correct`: volverlo imposible con un lint, un tipo o una prueba                                                           |

Principios de pstack que aplican en todo el repositorio, cada uno en `<pstack>/skills/principle-<nombre>/SKILL.md`: `prove-it-works`, `test-behavior-not-implementation`, `fix-root-causes`, `laziness-protocol`, `minimize-reader-load`, `make-operations-idempotent`, `type-system-discipline`, `model-the-domain`, `boundary-discipline`, `sequence-verifiable-units`, `encode-lessons-in-structure` y `migrate-callers-then-delete-legacy-apis`. Las skills `backend-*` y `front-*` dicen cuáles tocan su tema.

## Precedencia

Cuando pstack y el repositorio dicen cosas distintas, manda el repositorio:

- **Clases, no funciones sueltas.** `principle-boundary-discipline` pide la lógica de negocio en funciones puras. Aquí vive en clases del dominio (agregados, objetos de valor, servicios de dominio) sin dependencias de framework, que cumplen la misma intención. Las únicas funciones exportadas son las que permite `backend-codigo-enterprise`.
- **Comentarios.** Aquí la regla es aún más estricta que la de `no-comments`: el código se explica solo y no lleva comentarios en línea. Lo único que se conserva, y se exige, es la documentación completa y concisa de cada método público (JSDoc en el backend, `///` en el front), según `backend-codigo-enterprise` y `front-analisis`. Si Comment Sicko propone borrar ese JSDoc, se rechaza; si propone borrar un comentario en línea, se acepta y, si hacía falta para entender, se renombra o se extrae.
- **Idioma y estilo.** Las docs, los ADR, los runbooks, los PR y los commits van en español, sin guiones largos. De `technical-writing` se toma la estructura (Diátaxis, frases cortas, una idea por frase); sus reglas de inglés global no aplican. `unslop` aplica tal cual.
- **Commits y PR.** Conventional Commits en español, sin `Co-Authored-By` ni ninguna atribución de IA, y nunca `--no-verify`. El cuerpo del PR sigue `.github/pull_request_template.md`, no los encabezados del playbook `opening-a-pr`.
- **Pruebas.** Las de `backend-pruebas` y `front-pruebas`: fakes de los puertos como clases y nada de `jest.fn`. Coincide con `principle-test-behavior-not-implementation` y con la regla "Real tests" de `typescript-best-practices`.
- **TypeScript.** `typescript-best-practices` aplica salvo donde `backend-codigo-enterprise` decide otra cosa: enums en lugar de uniones de literales para eventos, errores, permisos, colas y jobs, y puertos como clases abstractas.
- **Ciclos de construcción.** Las olas y las correcciones corren con el flujo `.claude/workflows/ciclo-fase.js`. Dentro de un ciclo, sus reglas mandan sobre los playbooks `autonomous-run`, `autopilot-*` y `shipping`.

## Recursos de la máquina

Varias skills de pstack abren agentes en paralelo (`interrogate`, `arena`, `swarm`). En una máquina pequeña, como la Raspberry Pi de 4 núcleos donde corren los ciclos, los agentes pueden leer y razonar en paralelo, pero solo uno corre a la vez un comando pesado (Jest, `tsc`, Nx, Flutter o contenedores). Con contenedores de producción en la misma máquina, se limpia solo con `--filter label=org.testcontainers=true`.
