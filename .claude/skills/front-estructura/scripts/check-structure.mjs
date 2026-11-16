#!/usr/bin/env node
// Verifica las reglas de front-estructura, front-codigo y front-pruebas.
// Uso: node check-structure.mjs [--changed | --all] [raíz del repositorio]
//   --changed (por defecto) revisa los archivos cambiados frente a HEAD, incluidos los nuevos.
//   --all revisa todo front/.
// Sale con código 1 y la lista de violaciones si encuentra alguna, y con 2 ante un modo desconocido.
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
const { violations } = new FrontStructureCheck(
  root,
  mode,
  RuleSet.createDefault(),
).run();
if (violations.length > 0) {
  console.error(
    `Reglas del front incumplidas (${violations.length}):\n- ${violations.join('\n- ')}`,
  );
  process.exit(1);
}
