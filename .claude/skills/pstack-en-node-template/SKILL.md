---
name: pstack-en-node-template
description: 'Cómo se trabaja aquí con el plugin pstack: cargar sus skills en Claude Code, orden de trabajo, verificación, interrogate y precedencia. Úsala antes de seguir una skill de pstack.'
---

# pstack en node_template

El método es de pstack y las reglas son de las skills `backend-*` y `front-*`. Si el plugin no está instalado, sigue solo con las skills del repositorio y no lo instales por tu cuenta.

## Cargar una skill de pstack

1. Ubica el plugin: `ls -d ~/.claude/plugins/cache/cursor-plugins/pstack/*/ | sort -V | tail -1` (es `<pstack>`).
2. Una vez por sesión lee `<pstack>/docs/harness/claude-code.md`, que traduce los nombres de Cursor (`Task` es `Agent`, `readonly` es `Explore`, modelos y rutas).
3. Lee `<pstack>/skills/<nombre>/SKILL.md` con `Read` y síguela. La herramienta `Skill` las rechaza. A una persona dile `/pstack:<nombre>`.
4. Lo exclusivo de Cursor (Bugbot, automations, `/deslop`) se salta con `Skipped in Claude Code: <paso>. <motivo>.`
5. Los modelos por rol salen de `~/.claude/rules/pstack-models.md`; se cambian con `/pstack:setup-pstack`.

## Cómo se trabaja

1. Elige el playbook de `poteto-mode`: `feature`, `bug-fix`, `refactoring` o `perf-issue`.
2. Código no trivial: `architect` fija puertos, tipos, enums y módulos, y los deja compilando.
3. Unidades verificables (`principle-sequence-verifiable-units`): cada una compila, tiene sus pruebas en verde y su commit. Un bug empieza con `tdd`.
4. `principle-prove-it-works` con los comandos de "Verificación".
5. Revisión: `interrogate` sobre `main...HEAD`, luego `no-comments`, y `blast-radius` si toca plataforma, contratos, autenticación o datos. Las reglas son las "Reglas de revisión" de `backend-codigo-enterprise` o `front-codigo` y las de la skill del tema.
6. Docs, ADR, commits y PR pasan por `unslop`.

## Verificación

- Backend: `node .claude/skills/backend-estructura/scripts/check-structure.mjs --changed .`, `pnpm nx run-many -t lint test typecheck --projects=<tocados y dependientes>` y `pnpm nx format:check`. Integración con `INTEGRATION_TESTS=require` y `--runInBand`, de a un proyecto.
- Contratos: `pnpm nx run contracts-export:check` y `(cd front/packages/contracts && dart run contracts_gen --check)`.
- Front: `node .claude/skills/front-estructura/scripts/check-structure.mjs --changed .` y, por paquete, `format-check`, `analyze` y `test`; en un microfrontend, `dart run tools/check_microfrontend_boundaries.dart`.
- Entre servicios: `pnpm nx run platform-flow:e2e`.

## `interrogate` aquí

- Adversarios de la línea `interrogate reviewers`, cada uno en su worktree, con las reglas de revisión del área.
- Un hallazgo cuenta solo si una corrida lo demuestra. Sin corrida, es hipótesis y no bloquea.
- Corridas puntuales (un archivo de prueba o un script). La suite completa la corre quien coordina, que vuelve a correr cada hallazgo antes de aceptarlo.
- En la Raspberry Pi de 4 núcleos solo un comando pesado a la vez. Limpia contenedores solo con `--filter label=org.testcontainers=true`.

## Precedencia

Cuando no coinciden, manda el repositorio:

- Lógica de negocio en clases del dominio sin framework, no en funciones sueltas.
- Sin comentarios en línea; JSDoc completo y conciso en cada método público (`///` en Dart). Se rechaza que Comment Sicko borre ese JSDoc.
- Español sin guiones largos en docs, ADR, PR y commits; de `technical-writing` solo la estructura.
- Conventional Commits en español, sin atribución de IA, nunca `--no-verify`; el PR sigue `.github/pull_request_template.md`.
- Fakes de los puertos como clases, sin `jest.fn`.
- Enums en lugar de literales y puertos como clases abstractas, aunque `typescript-best-practices` diga otra cosa.
- Dentro de un ciclo de `.claude/workflows/ciclo-fase.js` mandan sus reglas sobre `autonomous-run`, `autopilot-*` y `shipping`.
