// Ciclo de construcción y revisión de una fase del plan (docs/plan/README.md, olas 6 a 9).
// Un constructor Opus planea, implementa y prueba en una copia de trabajo; un revisor Opus
// independiente revisa el diff sin editarlo; el constructor corrige. El constructor hace commits y push
// en la rama troop/<key> a medida que avanza; el revisor no. El general integra, abre el PR y lo mezcla.
//
// Args:
//   cycle: { key, title, path, area, plan, package, notes }
//     key      nombre corto del ciclo (rama troop/<key>)
//     path     copia de trabajo absoluta, por ejemplo <repo>/.claude/worktrees/cycle-<key>
//     area     'backend' | 'front' | 'full' | 'docs': elige la verificación
//     plan     diseño que manda, relativo a la copia (docs/design/...)
//     package  qué parte del diseño construye este ciclo
//     notes    contexto propio del ciclo (base, hallazgos abiertos, límites)
//   maxRounds    revisiones como máximo (por defecto 2: revisión, corrección y revisión final)
//   corrections  hallazgos o correcciones del usuario que mandan sobre todo lo demás
//   shim         carpeta opcional que se antepone al PATH (por ejemplo, un pnpm fijado)
//
// Para una ronda extra de correcciones sobre la misma copia: corrections con los hallazgos
// pendientes y maxRounds 1 (corrección y una revisión).

export const meta = {
  name: 'ciclo-fase',
  description:
    'Ciclo de una fase: un Opus construye y prueba, un revisor Opus independiente revisa, y el constructor corrige hasta aprobar',
  phases: [
    {
      title: 'Construir',
      detail: 'el constructor Opus planea, implementa y prueba',
      model: 'opus',
    },
    {
      title: 'Revisar',
      detail: 'el revisor Opus independiente revisa el diff completo',
      model: 'opus',
    },
    {
      title: 'Corregir',
      detail: 'el constructor corrige los hallazgos',
      model: 'opus',
    },
  ],
};

const PATH_PREFIX = args.shim ? ` && export PATH="${args.shim}:$PATH"` : '';

const VERIFY = {
  backend: `- node .claude/skills/backend-estructura/scripts/check-structure.mjs --changed .
- pnpm nx run-many -t lint test typecheck --projects=<proyectos tocados y sus dependientes> --skip-nx-cache (cobertura 80/80/80/75 con --coverage en los proyectos tocados)
- pnpm nx format:check
- Si tocas contratos: pnpm nx run contracts-export:check y (cd front/packages/contracts && dart run contracts_gen --check)
- Docker: TESTCONTAINERS_RYUK_DISABLED=true`,
  front: `- node .claude/skills/front-estructura/scripts/check-structure.mjs --changed .
- pnpm nx run-many -t format-check analyze test --projects=<proyectos front tocados y sus dependientes> --skip-nx-cache
- pnpm nx format:check
- Si tocas pubspec: (cd front && flutter pub get)`,
  docs: `- pnpm nx format:check
- Los scripts de .claude/skills que toques tienen sus pruebas con node --test y pasan
- node .claude/skills/backend-estructura/scripts/check-structure.mjs --all . y node .claude/skills/front-estructura/scripts/check-structure.mjs --all . corren sin errores de ejecución`,
};

VERIFY.full = VERIFY.backend + '\n' + VERIFY.front;

const COMMON = (t) => `
Repositorio node_template. Tu tropa trabaja SOLO en la copia ${t.path} (rama troop/${t.key}). Cada comando de shell empieza con: cd ${t.path}${PATH_PREFIX}. Si \`node -v\` da 20, usa Node 24: source ~/.nvm/nvm.sh && nvm use 24.
Nunca edites archivos fuera de ${t.path}. Los hooks del repositorio no se activan en esa copia: corre tú las verificaciones.

Tu paquete: ${t.package} del plan ${t.path}/${t.plan}. Léelo completo junto con las decisiones de diseño que cita (y las secciones de reglas y oleadas del plan). Respeta sus carpetas exclusivas: no toques nada fuera de ellas salvo lo que el paquete declare.
${t.notes ?? ''}

Reglas que mandan (léelas en ${t.path}/.claude/skills y ${t.path}/CLAUDE.md): las skills ${t.area === 'front' ? 'front-*' : t.area === 'full' ? 'backend-* y front-*' : 'backend-*'}. Innegociable: clases, composición e inyección por constructor (nada de funciones sueltas exportadas, salvo utilidades puras y las excepciones que el plan declara); pruebas en __tests__/ (backend) o en test/ (front) con utilitarios en __tests__/utils, test/utils o el paquete test_utils, nunca carpetas testing/support; código directo en src/ sin src/lib/; enums en vez de literales; el código se explica solo, sin comentarios en línea; cada método público lleva su JSDoc (o /// en Dart) completo y conciso, sin mencionar WP, olas, tropas, auditorías ni el plan. Español sin guiones largos en docs.

Verificación (todo en verde antes de terminar):
${VERIFY[t.area]}
Commits (solo el constructor; el revisor nunca hace commit): haz commits pequeños en la rama troop/${t.key} cada vez que una parte queda compilando y con sus pruebas en verde, y después de cada commit haz git -C ${t.path} push -u origin troop/${t.key}. Mensajes en Conventional Commits en español, asunto en minúsculas, sin Co-Authored-By ni ninguna atribución de IA. Nunca uses --no-verify ni reescribas commits ya publicados.

CPU Y MEMORIA: la máquina es una Raspberry Pi con 4 núcleos y 8 GB. Un solo comando pesado a la vez: no lances tsc, lint o nx mientras corre Jest, ni comandos en segundo plano en paralelo. Nx con --parallel=1; Jest con --maxWorkers=2 en unitarias y --runInBand en integración; las pruebas de integración de a un proyecto, nunca todas a la vez. Al terminar cada corrida borra los contenedores de prueba (docker rm -f $(docker ps -aq --filter label=org.testcontainers=true)), mata los Jest colgados y detén el daemon de Nx de tu copia (pnpm nx daemon --stop). En fixtures, nada de literales con forma de credencial junto a llaves como token, key, secret o credential (gitleaks).`;

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    commitMessage: {
      type: 'string',
      description:
        'Conventional Commits en español, asunto en minúsculas, líneas de máximo 100 caracteres, sin Co-Authored-By ni atribución de IA',
    },
    closedFindings: {
      type: 'string',
      description: 'Hallazgos del plan que cerró el paquete',
    },
    corrections: { type: 'string' },
    deviations: {
      type: 'string',
      description: 'Desviaciones del plan y su porqué',
    },
    verification: {
      type: 'string',
      description: 'Resultado de cada comando de verificación',
    },
    outsideChanges: {
      type: 'string',
      description: 'Cambios necesarios fuera de las carpetas del paquete',
    },
    allGreen: { type: 'boolean' },
  },
  required: [
    'summary',
    'commitMessage',
    'closedFindings',
    'corrections',
    'deviations',
    'verification',
    'outsideChanges',
    'allGreen',
  ],
};

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    approved: {
      type: 'boolean',
      description: 'true solo si no queda ningún hallazgo bloqueante',
    },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['bloqueante', 'importante', 'menor'],
          },
          file: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'file', 'issue', 'fix'],
      },
    },
    verification: {
      type: 'string',
      description: 'Comandos que corriste y su resultado',
    },
  },
  required: ['approved', 'summary', 'findings', 'verification'],
};

const t = args.cycle;
const maxRounds = args.maxRounds ?? 2;
const corrections = args.corrections
  ? `\n\nCORRECCIONES DEL USUARIO (mandan sobre todo lo demás; aplícalas todas):\n${args.corrections}`
  : '';

phase('Construir');
let report = await agent(
  `Eres el CONSTRUCTOR (Opus) del ciclo "${t.title}". Trabajas solo: planeas, implementas, pruebas y verificas todo tú, sin delegar en otros agentes.
${COMMON(t)}${corrections}

Cómo trabajas (método de pstack, reglas del repositorio; lee primero la skill pstack-en-node-template y su sección "Cómo se trabaja"):
1. Lee el paquete y las decisiones que cita, las skills y el código actual. Si la rama ya tiene trabajo de una corrida anterior (git log main..HEAD y git status), parte de ahí.
2. Elige el playbook de poteto-mode que corresponde al paquete (feature, bug-fix, refactoring o perf-issue) y sigue sus pasos. Para el diseño no trivial usa architect antes de codificar.
3. Construye en unidades verificables (principle-sequence-verifiable-units): primero puertos e interfaces, luego implementaciones con pruebas, al final el cableado. Cada unidad termina compilando, con sus pruebas en verde y con su commit y push. Cada bug o hallazgo empieza con la prueba que lo reproduce (tdd).
4. Antes de entregar pasa no-comments sobre tu diff y unslop sobre los ADR y la documentación que tocaste.
5. Cumple principle-prove-it-works: corre la verificación completa hasta verde y cierra con un último commit y push. No dejes nada sin commit.
Devuelve el reporte con el schema.`,
  {
    model: 'opus',
    phase: 'Construir',
    label: `constructor:${t.key}`,
    schema: REPORT_SCHEMA,
  },
);

const reviews = [];
for (let round = 1; round <= maxRounds; round++) {
  phase('Revisar');
  const review = await agent(
    `Eres el REVISOR (Opus) del ciclo "${t.title}". Eres independiente: no escribiste este código y no lo corriges tú. Tu trabajo es encontrar lo que está mal o falta.
${COMMON(t)}${corrections}

Reporte del constructor:
${JSON.stringify(report, null, 2)}

Qué haces (sigues la skill interrogate de pstack; lee primero pstack-en-node-template y su sección "interrogate en este repositorio"):
1. Lee el diff completo de la rama contra main (git -C ${t.path} log --oneline main..HEAD, git -C ${t.path} diff main...HEAD y status por si quedó algo sin commit) contra el paquete del plan, las decisiones que cita y las skills.
2. Busca: lo que el paquete pide y no está; errores de lógica y de concurrencia; pruebas débiles o que no prueban lo que dicen; violaciones de las reglas (funciones sueltas, puertos que no son clases abstractas, literales donde van enums, imports de infraestructura en domain, NestJS fuera de src/nest); alternativas de la tabla 2.1 del diseño de F5 a F11 que faltan; secretos o literales con forma de credencial en fixtures; comentarios en línea, métodos públicos sin JSDoc completo y conciso, o JSDoc que narra el proceso.
3. Abre el panel de adversarios de interrogate con los modelos de la línea interrogate reviewers de ~/.claude/rules/pstack-models.md, cada uno en su propia copia (isolation worktree), con las reglas del punto 2 y las de "Reglas de revisión" de las skills del área. Sus corridas son puntuales (un archivo de prueba o un script, nunca una suite completa). Vuelve a correr tú cada hallazgo y conserva solo los que la corrida demuestra; los demás van a dropped en el summary. Pasa también no-comments en modo de solo lectura y, si el cambio toca plataforma, contratos, autenticación o datos, blast-radius.
4. Corre tú la verificación completa para confirmar que está en verde.
No edites archivos de la copia del ciclo. approved es true solo si no queda ningún hallazgo bloqueante. Devuelve la revisión con el schema.`,
    {
      model: 'opus',
      phase: 'Revisar',
      label: `revisor:${t.key}:${round}`,
      schema: REVIEW_SCHEMA,
    },
  );
  if (!review) {
    return {
      cycle: t.key,
      path: t.path,
      report,
      reviews,
      error: `el revisor ${round} no devolvió resultado`,
    };
  }
  reviews.push(review);
  if (review.approved || round === maxRounds) break;

  phase('Corregir');
  report = await agent(
    `Eres el CONSTRUCTOR (Opus) del ciclo "${t.title}". El revisor independiente encontró esto:
${COMMON(t)}${corrections}

Hallazgos:
${JSON.stringify(review.findings, null, 2)}

Corrige todos los bloqueantes e importantes, y los menores que tengan sentido. Cada uno empieza con la prueba que lo reproduce (tdd) y se arregla en su raíz (principle-fix-root-causes). Si no estás de acuerdo con un hallazgo, explícalo en deviations. Corre la verificación completa hasta verde y cierra con commit y push: no dejes nada sin commit. Devuelve el reporte con el schema.`,
    {
      model: 'opus',
      phase: 'Corregir',
      label: `corrección:${t.key}:${round}`,
      schema: REPORT_SCHEMA,
    },
  );
}

return { cycle: t.key, path: t.path, report, reviews };
