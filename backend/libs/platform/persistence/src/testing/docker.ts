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
  if (probe.status === 0) {
    return true;
  }
  // En CI, saltar en silencio dejaría el job verde sin probar nada.
  if (process.env['CI'] === 'true') {
    throw new Error(
      'Docker is not available: set the integration flag to 0 to skip these tests explicitly',
    );
  }
  return false;
}

/** `describe` que solo corre si hay Docker; si no, queda como `describe.skip`. */
export const describeWithDocker: jest.Describe = dockerAvailable()
  ? describe
  : describe.skip;
