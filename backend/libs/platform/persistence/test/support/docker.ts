import { spawnSync } from 'node:child_process';

/**
 * Indica si hay un runtime de contenedores disponible para Testcontainers.
 * `PERSISTENCE_INTEGRATION=0` fuerza a saltar las pruebas de integración y
 * `PERSISTENCE_INTEGRATION=1` exige correrlas aunque la detección falle.
 */
export function dockerAvailable(): boolean {
  const flag = process.env['PERSISTENCE_INTEGRATION'];
  if (flag === '0') {
    return false;
  }
  if (flag === '1') {
    return true;
  }
  const probe = spawnSync(
    'docker',
    ['info', '--format', '{{.ServerVersion}}'],
    {
      timeout: 5_000,
      stdio: 'ignore',
    },
  );
  return probe.status === 0;
}

/** `describe` que solo corre si hay Docker; si no, queda como `describe.skip`. */
export const describeWithDocker: jest.Describe = dockerAvailable()
  ? describe
  : describe.skip;
