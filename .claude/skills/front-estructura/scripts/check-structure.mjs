#!/usr/bin/env node
// Verifica las reglas de front-estructura, front-codigo y front-pruebas.
// Uso: node check-structure.mjs [--all | --changed | --update-baseline] [raíz del repositorio]
//   --changed (por defecto) revisa solo los archivos cambiados frente a HEAD, incluidos los nuevos,
//     sin tener en cuenta la línea base: un archivo tocado debe quedar limpio.
//   --all revisa todo front/ y falla solo por violaciones fuera de front/tools/structure-baseline.json.
//   --update-baseline regenera esa línea base con las violaciones actuales.
// Sale con código 1 y la lista de violaciones si encuentra alguna.
import { CheckMode } from './check-mode.mjs';
import { FrontStructureCheck } from './front-structure-check.mjs';
import { RuleSet } from './rules/rule-set.mjs';

const args = process.argv.slice(2);
const mode = args.find((a) => a.startsWith('--')) ?? CheckMode.CHANGED;
const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();
// Una bandera mal escrita no debe caer en silencio en otro modo.
if (!CheckMode.isValid(mode)) {
  console.error(
    `Modo desconocido: ${mode}. Usa ${CheckMode.values().join(', ')}.`,
  );
  process.exit(2);
}
const { violations, warnings, baselineWritten } = new FrontStructureCheck(
  root,
  mode,
  RuleSet.createDefault(),
).run();
for (const warning of warnings) console.warn(`Aviso: ${warning}`);
if (baselineWritten !== null) {
  console.log(`Línea base regenerada con ${baselineWritten} violaciones.`);
}
if (violations.length > 0) {
  console.error(
    `Reglas del front incumplidas (${violations.length}):\n- ${violations.join('\n- ')}`,
  );
  process.exit(1);
}
